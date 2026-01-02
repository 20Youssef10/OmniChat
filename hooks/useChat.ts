
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
                content: processedText,
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
                             generateConversationTitle(processedText, accText).then(title => {
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
             await sendMessageToDb(convId, { ...updates, role: 'model', model: modelId, timestamp: Date.now() } as any);
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
