
import { useState, useEffect, useRef } from 'react';
import { Conversation, Message, Attachment, Persona, Memory, UserProfile, UserApiKeys, Project, Workspace } from '../types';
import { 
    createConversation, 
    sendMessageToDb, 
    subscribeToConversations, 
    subscribeToMessages, 
    subscribeToMemories, 
    updateMessageInDb, 
    deleteMessagesAfter, 
    updateUserGamification,
    createNotification,
    db
} from '../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { streamResponse, generateVideo, generateImage } from '../services/apiService';
import { generateConversationTitle } from '../services/geminiService';
import { 
    searchYouTube, searchSpotify, searchGithub, searchUnsplash, 
    searchHackerNews, getWeather, searchWikipedia, getCryptoPrice,
    DEFAULT_YOUTUBE_API_KEY 
} from '../services/connectorService';
import { LEVELS } from '../utils/gamification';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AVAILABLE_MODELS } from '../constants/models';
import { trackEvent } from '../services/analyticsService';
import { useAppStore } from '../contexts/AppContext';

export const useChat = (user: UserProfile | null, selectedModelIds: string[], currentPersona: Persona | null) => {
    const { globalConfig, openModal, isTemporaryChat, setLocalUser, sharedConversation } = useAppStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [memories, setMemories] = useState<Memory[]>([]);
    
    // Local state for Temporary Chat messages
    const [tempMessages, setTempMessages] = useState<Message[]>([]);

    // React Query Client for cache invalidation if needed
    const queryClient = useQueryClient();

    // 1. Subscribe to Conversations
    useEffect(() => {
        if (!user) {
            setConversations([]);
            return;
        }
        const unsub = subscribeToConversations(user.uid, setConversations);
        return () => unsub();
    }, [user]);

    // 2. Subscribe to Messages
    useEffect(() => {
        if (isTemporaryChat) {
            setMessages(tempMessages);
            return;
        }

        if (!currentConversationId) {
            setMessages([]);
            return;
        }
        const unsub = subscribeToMessages(currentConversationId, setMessages);
        return () => unsub();
    }, [currentConversationId, isTemporaryChat, tempMessages]);

    // 3. Subscribe to Memories
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToMemories(user.uid, setMemories);
        return () => unsub();
    }, [user]);

    // Helper to resolve effective keys
    const getEffectiveKeys = (): UserApiKeys => {
        return {
            google: user?.preferences.apiKeys?.google || globalConfig?.globalApiKeys?.google,
            openai: user?.preferences.apiKeys?.openai || globalConfig?.globalApiKeys?.openai,
            anthropic: user?.preferences.apiKeys?.anthropic || globalConfig?.globalApiKeys?.anthropic,
            deepseek: user?.preferences.apiKeys?.deepseek || globalConfig?.globalApiKeys?.deepseek,
            groq: user?.preferences.apiKeys?.groq || globalConfig?.globalApiKeys?.groq,
        };
    };

    // Helper to fetch context files from Project or Workspace
    const fetchContextFiles = async (conversationId: string): Promise<string> => {
        if (!conversationId || conversationId === 'temp') return "";
        try {
            // Get conversation metadata
            const convRef = doc(db, "conversations", conversationId);
            const convSnap = await getDoc(convRef);
            if (!convSnap.exists()) return "";
            const convData = convSnap.data() as Conversation;

            let contextText = "";

            // Check Project Files
            if (convData.projectId) {
                const projSnap = await getDoc(doc(db, "projects", convData.projectId));
                if (projSnap.exists()) {
                    const project = projSnap.data() as Project;
                    if (project.files?.length) {
                        contextText += `\n\n[Project Knowledge Base: ${project.name}]\n`;
                        project.files.forEach(f => {
                            if (f.extractedText) contextText += `--- File: ${f.name} ---\n${f.extractedText.substring(0, 5000)}\n`; // Truncate big files
                        });
                    }
                }
            }

            // Check Workspace Files
            if (convData.workspaceId) {
                const wsSnap = await getDoc(doc(db, "workspaces", convData.workspaceId));
                if (wsSnap.exists()) {
                    const workspace = wsSnap.data() as Workspace;
                    if (workspace.files?.length) {
                        contextText += `\n\n[Workspace Knowledge Base: ${workspace.name}]\n`;
                        workspace.files.forEach(f => {
                            if (f.extractedText) contextText += `--- File: ${f.name} ---\n${f.extractedText.substring(0, 5000)}\n`;
                        });
                    }
                }
            }
            return contextText;
        } catch (e) {
            console.error("Error fetching context files", e);
            return "";
        }
    };

    // 4. Send Message Logic (Mutation)
    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { text: string, attachments: Attachment[] }) => {
            const isSharedEdit = sharedConversation && sharedConversation.shareConfig?.accessLevel === 'edit';

            if (!user && !isTemporaryChat && !isSharedEdit) {
                openModal('auth');
                throw new Error("Login required");
            }

            // GUEST LIMITS ENFORCEMENT
            if (user?.providerId === 'anonymous' && globalConfig?.guestConfig) {
                const gc = globalConfig.guestConfig;
                if (!gc.enabled) throw new Error("Guest access is currently disabled by admin.");
                if (selectedModelIds.some(id => id.includes('image')) && !gc.features.imageGeneration) throw new Error("Guest image generation disabled.");
                if (selectedModelIds.some(id => id.includes('veo')) && !gc.features.videoGeneration) throw new Error("Guest video generation disabled.");
                if (payload.attachments.length > 0 && !gc.features.fileUploads) throw new Error("Guest file uploads disabled.");
            }

            let processedText = payload.text;
            let activeModels = [...selectedModelIds];
            let forceGrounding = false;

            // Command Processing
            if (payload.text.startsWith('/')) {
                const cmd = payload.text.split(' ')[0];
                const content = payload.text.substring(cmd.length).trim();
                
                if (cmd === '/image') { activeModels = ['gemini-3-pro-image-preview']; processedText = content; }
                else if (cmd === '/video') { activeModels = ['veo-3.1-fast-generate-preview']; processedText = content; }
                else if (cmd === '/web' || cmd === '/search') { activeModels = ['gemini-3-flash-preview']; forceGrounding = true; processedText = content; }
                else if (cmd === '/deep') { activeModels = ['gemini-3-pro-preview']; processedText = content; }
                else if (cmd === '/page' || cmd === '/quiz' || cmd === '/visualize') { processedText = `[Task: ${cmd.replace('/', '')}] ${content}`; }
                else if (cmd === '/summarize') { processedText = "Please summarize the conversation so far."; }
                else if (cmd === '/rewrite') { processedText = `Rewrite the following text professionally: ${content}`; }
                else if (cmd === '/eli5') { processedText = `Explain the following topic like I'm 5 years old: ${content}`; }
                else if (cmd === '/fix') { processedText = `Please fix grammar and spelling in the following text, and briefly list the changes: ${content}`; }
                else if (cmd === '/review') { processedText = `Please review this code for bugs, performance issues, and best practices: ${content}`; }
                else if (cmd === '/short') { processedText = `TL;DR. Please provide a very concise summary of: ${content}`; }
            } else {
                // --- Connectors Integration ---
                const lowerText = payload.text.toLowerCase();
                const stopWords = ['search', 'the', 'youtube', 'for', 'find', 'me', 'watch', 'video', 'videos', 'on', 'about', 'play', 'spotify', 'song', 'track', 'music', 'listen', 'to', 'channel', 'playlist', 'album', 'artist', 'github', 'repo', 'repository', 'code', 'issue', 'pr', 'unsplash', 'stock', 'photo', 'picture', 'image', 'news', 'weather', 'wiki', 'wikipedia', 'price', 'cost', 'crypto'];
                const query = payload.text.split(' ').filter(w => !stopWords.includes(w.toLowerCase())).join(' ');

                // 1. YouTube Connector
                const isYouTubeEnabled = user?.connectors?.youtube?.connected || (!user?.connectors?.youtube && !!DEFAULT_YOUTUBE_API_KEY);
                if (isYouTubeEnabled && (lowerText.includes('youtube') || lowerText.includes('video') || lowerText.includes('watch') || lowerText.includes('channel'))) {
                    try {
                        if (query.trim().length > 1) {
                            const apiKey = user?.connectors?.youtube?.apiKey || DEFAULT_YOUTUBE_API_KEY;
                            const ytResults = await searchYouTube(query, apiKey);
                            if (ytResults.items?.length > 0) {
                                const context = ytResults.items.map((item: any) => {
                                    const kind = item.id.kind?.split('#')[1] || 'video';
                                    const title = item.snippet.title;
                                    const channel = item.snippet.channelTitle;
                                    let link = '';
                                    if (kind === 'video') link = `https://www.youtube.com/watch?v=${item.id.videoId}`;
                                    else if (kind === 'channel') link = `https://www.youtube.com/channel/${item.id.channelId}`;
                                    else if (kind === 'playlist') link = `https://www.youtube.com/playlist?list=${item.id.playlistId}`;
                                    
                                    return `- [${kind.toUpperCase()}] ${title} by ${channel} (${link})`;
                                }).join('\n');
                                processedText += `\n\n[System (YouTube Connector)]: I found the following YouTube results. Please present them to the user:\n${context}`;
                            }
                        }
                    } catch (e) {
                        console.warn('YouTube Connector failed', e);
                    }
                }

                // 2. Spotify Connector
                const isSpotifyEnabled = user?.connectors?.spotify?.connected && user?.connectors?.spotify?.accessToken;
                if (isSpotifyEnabled && (lowerText.includes('spotify') || lowerText.includes('song') || lowerText.includes('music') || lowerText.includes('play') || lowerText.includes('artist') || lowerText.includes('album'))) {
                    try {
                        if (query.trim().length > 1) {
                            const spotifyResults = await searchSpotify(query, user.connectors!.spotify!.accessToken!);
                            let context = "";
                            
                            // Tracks
                            if (spotifyResults.tracks?.items?.length > 0) {
                                context += "Tracks:\n" + spotifyResults.tracks.items.map((item: any) => 
                                    `- ${item.name} by ${item.artists[0].name} (Link: ${item.external_urls.spotify})`
                                ).join('\n') + "\n";
                            }
                            // Artists
                            if (spotifyResults.artists?.items?.length > 0) {
                                context += "Artists:\n" + spotifyResults.artists.items.map((item: any) => 
                                    `- ${item.name} (Link: ${item.external_urls.spotify})`
                                ).join('\n') + "\n";
                            }
                            // Playlists
                            if (spotifyResults.playlists?.items?.length > 0) {
                                context += "Playlists:\n" + spotifyResults.playlists.items.map((item: any) => 
                                    `- ${item.name} by ${item.owner.display_name} (Link: ${item.external_urls.spotify})`
                                ).join('\n') + "\n";
                            }

                            if (context) {
                                processedText += `\n\n[System (Spotify Connector)]: I found the following Spotify results. Please present them to the user:\n${context}`;
                            }
                        }
                    } catch (e) {
                        console.warn('Spotify Connector failed', e);
                    }
                }

                // 3. GitHub Connector
                const isGithubEnabled = user?.connectors?.github?.connected;
                if (isGithubEnabled && (lowerText.includes('github') || lowerText.includes('repo') || lowerText.includes('repository') || lowerText.includes('issue') || lowerText.includes('pr'))) {
                    try {
                        if (query.trim().length > 1) {
                            const results = await searchGithub(query, user.connectors?.github?.token);
                            if (results.items?.length > 0) {
                                const context = results.items.map((item: any) => 
                                    `- [${item.html_url ? 'Repo/Issue' : 'Item'}] ${item.full_name || item.title} (${item.html_url}) - ${item.description ? item.description.substring(0, 100) : ''}...`
                                ).join('\n');
                                processedText += `\n\n[System (GitHub Connector)]: I found the following GitHub results. Please summarize or present them:\n${context}`;
                            }
                        }
                    } catch (e) {
                        console.warn('GitHub Connector failed', e);
                    }
                }

                // 4. Unsplash Connector
                const isUnsplashEnabled = user?.connectors?.unsplash?.connected && user?.connectors?.unsplash?.accessKey;
                if (isUnsplashEnabled && (lowerText.includes('unsplash') || lowerText.includes('stock photo') || lowerText.includes('wallpaper') || lowerText.includes('picture of'))) {
                    try {
                        if (query.trim().length > 1) {
                            const results = await searchUnsplash(query, user.connectors!.unsplash!.accessKey!);
                            if (results.results?.length > 0) {
                                const context = results.results.map((item: any) => 
                                    `![${item.alt_description || 'Image'}](${item.urls.regular})\n` +
                                    `*Photo by [${item.user.name}](${item.user.links.html}) on Unsplash*`
                                ).join('\n\n');
                                processedText += `\n\n[System (Unsplash Connector)]: I found the following stock photos. Display them to the user with credits:\n${context}`;
                            }
                        }
                    } catch (e) {
                        console.warn('Unsplash Connector failed', e);
                    }
                }

                // 5. Hacker News Connector
                if (lowerText.includes('hacker news') || lowerText.includes('tech news')) {
                    const results = await searchHackerNews(lowerText.includes('new') ? 'new' : 'top');
                    if (results.length > 0) {
                        const context = results.map((item: any) => 
                            `- ${item.title} (Score: ${item.score}, By: ${item.by}) - ${item.url}`
                        ).join('\n');
                        processedText += `\n\n[System (Hacker News Connector)]: Top tech stories:\n${context}`;
                    }
                }

                // 6. Weather Connector
                if (lowerText.includes('weather')) {
                    // Extract city name (rough heuristic)
                    const cityMatch = payload.text.match(/weather (?:in|for|at)?\s*([a-zA-Z\s]+)/i);
                    const city = cityMatch ? cityMatch[1] : null;
                    if (city) {
                        const data = await getWeather(city);
                        if (data) {
                            processedText += `\n\n[System (Weather Connector)]: Weather for ${data.location.name}, ${data.location.country}:\n` +
                                `Current: ${data.current.temperature_2m}°C, Wind: ${data.current.wind_speed_10m}km/h\n` +
                                `Forecast Max: ${data.daily.temperature_2m_max[0]}°C, Min: ${data.daily.temperature_2m_min[0]}°C`;
                        }
                    }
                }

                // 7. Wikipedia Connector
                if (lowerText.includes('wiki') || lowerText.startsWith('what is') || lowerText.startsWith('who is')) {
                    const topic = query.replace('wiki', '').trim();
                    if (topic.length > 2) {
                        const results = await searchWikipedia(topic);
                        if (results.length > 0) {
                            processedText += `\n\n[System (Wikipedia Connector)]: I found this info on Wikipedia:\n` +
                                results.map((r: any) => `- **${r.title}**: ${r.snippet} ([Link](${r.url}))`).join('\n');
                        }
                    }
                }

                // 8. Crypto Price Connector
                if (lowerText.includes('price of') || lowerText.includes('crypto')) {
                    const coinMatch = payload.text.match(/price of\s*([a-zA-Z]+)/i);
                    const coin = coinMatch ? coinMatch[1] : null;
                    if (coin) {
                        const data = await getCryptoPrice(coin);
                        if (data) {
                            processedText += `\n\n[System (CoinGecko Connector)]: Price of ${coin.toUpperCase()}:\n` +
                                `USD: $${data.usd}, EUR: €${data.eur} (24h Change: ${data.usd_24h_change.toFixed(2)}%)`;
                        }
                    }
                }
            }
            
            let convId = currentConversationId;
            if (isTemporaryChat) convId = 'temp';
            else if (!convId) {
                convId = await createConversation(user!.uid, activeModels[0]);
                setCurrentConversationId(convId);
            }

            trackEvent('message_sent', { model_count: activeModels.length, conversation_id: convId, is_temp: isTemporaryChat });

            const userMsg: Message = {
                id: `msg-${Date.now()}`,
                role: 'user',
                content: processedText, // Contains the original prompt + any injected context
                timestamp: Date.now(),
                attachments: payload.attachments,
                conversationId: convId || undefined,
                userId: user?.uid || 'anonymous'
            };

            if (isTemporaryChat) setTempMessages(prev => [...prev, userMsg]);
            else {
                await sendMessageToDb(convId!, userMsg);
                
                // Gamification (only for logged in users)
                if (user) {
                    const newXp = (user.gamification?.xp || 0) + 10;
                    if (user.uid.startsWith('guest_local_')) {
                        const currentGamification = { ...user.gamification, xp: newXp };
                        const nextLevel = LEVELS.find(l => l.xp <= newXp && l.level > (currentGamification.level || 1));
                        if (nextLevel) {
                            currentGamification.level = nextLevel.level;
                            createNotification(user.uid, { title: "Level Up!", message: `Level ${nextLevel.level} Reached`, type: 'achievement' });
                        }
                        setLocalUser({ ...user, gamification: currentGamification });
                    } else {
                        await updateUserGamification(user.uid, { xp: newXp });
                        const nextLevel = LEVELS.find(l => l.xp <= newXp && l.level > (user.gamification?.level || 1));
                        if(nextLevel) {
                            await updateUserGamification(user.uid, { level: nextLevel.level });
                            createNotification(user.uid, { title: "Level Up!", message: `Level ${nextLevel.level} Reached`, type: 'achievement' });
                        }
                    }
                }
            }

            const effectiveKeys = getEffectiveKeys();
            const generationConfig = user?.preferences.generationConfig;

            // Fetch Knowledge Base Context (Project/Workspace files)
            let knowledgeContext = "";
            if (!isTemporaryChat && convId) {
                knowledgeContext = await fetchContextFiles(convId);
            }

            await Promise.all(activeModels.map(async (modelId) => {
                const startTime = Date.now();
                const aiMessageId = `ai-${modelId}-${Date.now()}`;
                
                const initialAiMsg: Message = {
                    id: aiMessageId,
                    role: 'model',
                    content: '',
                    timestamp: Date.now() + 1,
                    thinking: true,
                    model: modelId,
                    conversationId: convId || undefined
                };

                if (isTemporaryChat) setTempMessages(prev => [...prev, initialAiMsg]);
                else await sendMessageToDb(convId!, initialAiMsg);

                try {
                    if (modelId === 'dall-e-3') {
                        const imageUrl = await generateImage(modelId, processedText, effectiveKeys.openai || process.env.OPENAI_API_KEY);
                        await updateLastAiMessage(convId!, modelId, { content: 'Generated Image:', imageUrl, thinking: false }, isTemporaryChat, aiMessageId);
                    } else if (modelId.startsWith('veo')) {
                         const videoUrl = await generateVideo(modelId, processedText, payload.attachments);
                         await updateLastAiMessage(convId!, modelId, { content: 'Generated Video:', videoUrl, thinking: false }, isTemporaryChat, aiMessageId);
                    } else {
                        const sourceMessages = isTemporaryChat ? tempMessages : messages;
                        const contextHistory = sourceMessages.map(m => ({ role: m.role, content: m.content }));
                        
                        let systemContent = "";
                        if (generationConfig?.globalSystemPrompt) systemContent += `[System Instructions]: ${generationConfig.globalSystemPrompt}\n\n`;
                        if (currentPersona) systemContent += `[Role/Persona]: ${currentPersona.systemPrompt}\n\n`;
                        if (memories.length > 0) systemContent += `[User Context/Memories]:\n${memories.map(m => `- ${m.content}`).join('\n')}\n\n`;
                        if (knowledgeContext) systemContent += `[Context from Project/Workspace Files]:\n${knowledgeContext}\n\n`;

                        if (systemContent) {
                            contextHistory.unshift({ role: 'user', content: systemContent });
                        }

                        const provider = AVAILABLE_MODELS.find(m => m.id === modelId)?.provider || 'Google';
                        const stream = streamResponse(modelId, provider, contextHistory, processedText, payload.attachments, effectiveKeys, generationConfig);
                        
                        let accText = '';
                        let totalTokens = 0;
                        
                        for await (const chunk of stream) {
                            if (chunk.text) {
                                accText += chunk.text;
                                if (isTemporaryChat) {
                                     setTempMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: accText } : m));
                                }
                            }
                            if (chunk.usageMetadata) totalTokens = chunk.usageMetadata.totalTokenCount;
                        }
                        
                        const endTime = Date.now();
                        trackEvent('performance_metric', { metric: 'api_latency', value: endTime - startTime, model: modelId });

                         await updateLastAiMessage(convId!, modelId, { 
                             content: accText, 
                             thinking: false,
                             latency: endTime - startTime
                         }, isTemporaryChat, aiMessageId);

                         // Generate Title based on AI response if first message (and standard chat)
                         if (!isTemporaryChat && messages.length === 0 && modelId === activeModels[0] && convId && convId !== 'temp' && !isSharedEdit) {
                             generateConversationTitle(payload.text, accText).then(title => {
                                 updateDoc(doc(db, "conversations", convId!), { title });
                             });
                         }
                    }
                } catch (e: any) {
                    trackEvent('error_boundary', { error_message: e.message, type: 'generation_error' });
                    await updateLastAiMessage(convId!, modelId, { content: `Error: ${e.message}`, error: true, thinking: false }, isTemporaryChat, aiMessageId);
                }
            }));
        }
    });

    const updateLastAiMessage = async (convId: string, modelId: string, updates: Partial<Message>, isTemp: boolean, msgId: string) => {
        if (isTemp) {
            setTempMessages(prev => prev.map(m => m.id === msgId ? { ...m, ...updates } : m));
        } else {
             // We now use updateMessageInDb with the known ID (msgId) to prevent creating new documents
             await updateMessageInDb(convId, msgId, { ...updates, role: 'model', model: modelId } as any);
        }
    };

    return {
        conversations,
        messages: isTemporaryChat ? tempMessages : messages,
        currentConversationId: isTemporaryChat ? 'temp' : currentConversationId,
        setCurrentConversationId: (id: string | null) => {
            if (isTemporaryChat) return; 
            setCurrentConversationId(id);
        },
        sendMessage: sendMessageMutation.mutate,
        isGenerating: sendMessageMutation.isPending,
        memories
    };
};
