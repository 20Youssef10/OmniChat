
import React, { useState, useEffect, useRef } from 'react';
import { 
    Book, Mic, Play, Plus, Upload, Youtube, FileText, X, 
    MessageSquare, Settings, LayoutGrid, Search, Wand2, 
    Headphones, Volume2, StopCircle, ArrowRight, Save, 
    MoreHorizontal, Pin, ExternalLink, Calendar, MapPin, List,
    Check, Globe
} from 'lucide-react';
import { Project, Attachment, Note, Artifact } from '../../types';
import { subscribeToProjects, updateProjectFiles } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { uploadFile } from '../../services/fileService';
import { generatePodcastScript, generateStudyArtifact, streamGeminiResponse } from '../../services/geminiService';
import { MessageBubble } from '../Chat/MessageBubble';
import { ChatInput } from '../Chat/ChatInput';
import ReactMarkdown from 'react-markdown';

interface OmniBookProps {
    userId: string;
    onClose: () => void;
    onOpenArtifact: (artifact: Artifact) => void;
}

export const OmniBook: React.FC<OmniBookProps> = ({ userId, onClose, onOpenArtifact }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
    
    // Feature States
    const [isSourceMode, setIsSourceMode] = useState(true); // Source-Only Mode
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioScript, setAudioScript] = useState('');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    
    // Chat State specific to OmniBook
    const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const unsub = subscribeToProjects(userId, setProjects);
        return () => unsub();
    }, [userId]);

    // Audio Overview Logic
    const handleGenerateAudio = async () => {
        if (!activeProject || !activeProject.files?.length) return;
        setIsGeneratingAudio(true);
        try {
            const context = activeProject.files.map(f => f.extractedText || f.name).join('\n\n');
            const script = await generatePodcastScript(context);
            setAudioScript(script);
            
            // Auto-play (using browser SpeechSynthesis for demo, ideally specialized TTS)
            speakScript(script);
        } catch (e) {
            console.error(e);
            alert("Failed to generate audio overview.");
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const speakScript = (script: string) => {
        window.speechSynthesis.cancel();
        const parts = script.split('\n').filter(l => l.includes(':'));
        let index = 0;
        setIsPlaying(true);

        const speakNext = () => {
            if (index >= parts.length) {
                setIsPlaying(false);
                return;
            }
            const line = parts[index];
            const isHostA = line.startsWith('Host A');
            const text = line.replace(/Host [AB]:/, '').trim();
            
            const utterance = new SpeechSynthesisUtterance(text);
            // Try to assign different voices
            const voices = window.speechSynthesis.getVoices();
            utterance.voice = isHostA ? voices[0] : (voices[1] || voices[0]);
            utterance.rate = 1.1;
            utterance.onend = () => {
                index++;
                speakNext();
            };
            window.speechSynthesis.speak(utterance);
        };
        speakNext();
    };

    const handleStopAudio = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
    };

    // Chat Logic
    const handleSendMessage = async (text: string, attachments: Attachment[]) => {
        if (!activeProject) return;
        
        // 1. Construct Context from Sources
        const projectContext = activeProject.files?.map((f, i) => 
            `--- Source [${i+1}]: ${f.name} ---\n${f.extractedText?.substring(0, 8000) || '(No text content)'}`
        ).join('\n\n') || "";

        const systemPrompt = isSourceMode 
            ? "You are a research assistant. Answer ONLY based on the provided sources. If the answer is not in the sources, state that clearly. Cite your sources using [1], [2] format."
            : "You are a helpful assistant. Use the provided sources as context, but you can also use your general knowledge.";

        const fullContext = `[System]: ${systemPrompt}\n\n[Project Sources]:\n${projectContext}`;
        
        const newMsg = { id: Date.now().toString(), role: 'user' as const, content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, newMsg]);
        setIsThinking(true);

        try {
            // Merge history
            const history = [
                { role: 'user', content: fullContext },
                ...chatHistory,
                { role: 'user', content: text }
            ];

            const stream = await streamGeminiResponse('gemini-3-flash-preview', history, text, attachments);
            
            let aiContent = "";
            for await (const chunk of stream.stream) {
                if (chunk.text) aiContent += chunk.text;
            }

            const aiMsg = { id: (Date.now()+1).toString(), role: 'model' as const, content: aiContent, timestamp: Date.now() };
            setMessages(prev => [...prev, aiMsg]);
            setChatHistory(prev => [...prev, { role: 'user', content: text }, { role: 'model', content: aiContent }]);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Error generating response.", error: true, timestamp: Date.now() }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Source Management
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeProject || !e.target.files) return;
        const files = Array.from(e.target.files);
        try {
            const uploaded: Attachment[] = [];
            for (const file of files) {
                const att = await uploadFile(file, userId);
                uploaded.push(att);
            }
            const updatedFiles = [...(activeProject.files || []), ...uploaded];
            await updateProjectFiles(activeProject.id, updatedFiles);
            // Optimistic update
            setActiveProject({ ...activeProject, files: updatedFiles });
        } catch (e) {
            alert("Upload failed");
        }
    };

    const handleAddYoutube = async () => {
        if (!activeProject || !youtubeUrl) return;
        // Mock transcript extraction for demo (real implementation needs proxy/API)
        const mockAttachment: Attachment = {
            type: 'youtube',
            url: youtubeUrl,
            name: 'YouTube Video',
            mimeType: 'video/youtube',
            extractedText: `[Transcript of ${youtubeUrl}]: This is a simulated transcript for the YouTube video. In a real app, this would be fetched via Python backend or Caption API.`
        };
        const updatedFiles = [...(activeProject.files || []), mockAttachment];
        await updateProjectFiles(activeProject.id, updatedFiles);
        setActiveProject({ ...activeProject, files: updatedFiles });
        setYoutubeUrl('');
        setShowUrlInput(false);
    };

    // Artifact Generation
    const handleGenerateArtifact = async (type: any) => {
        if (!activeProject?.files?.length) return;
        setIsThinking(true);
        try {
            const context = activeProject.files.map(f => f.extractedText).join('\n');
            const content = await generateStudyArtifact(type, context);
            onOpenArtifact({
                id: Date.now().toString(),
                title: `Generated ${type}`,
                type: 'markdown',
                content
            });
        } catch (e) {
            alert("Generation failed");
        } finally {
            setIsThinking(false);
        }
    };

    // Insight Cards (Notes)
    const handleAddNote = async (text: string) => {
        if(!activeProject) return;
        const newNote: Note = {
            id: Date.now().toString(),
            content: text,
            color: ['bg-yellow-100', 'bg-blue-100', 'bg-green-100', 'bg-pink-100'][Math.floor(Math.random() * 4)]
        };
        // Simplified: In real app, save notes to sub-collection
        // For now, local state only or console log
        console.log("Saving note:", newNote);
        // Assuming Project type has notes array in DB update logic, simplified here
    };

    if (!activeProject) {
        return (
            <div className="flex-1 bg-[#0f172a] p-8 flex flex-col items-center justify-center animate-[fadeIn_0.3s]">
                <Book size={48} className="text-pink-400 mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">OmniBook</h1>
                <p className="text-slate-400 mb-8 max-w-md text-center">
                    Your personal AI research assistant. Upload documents, generate audio overviews, and uncover insights.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {projects.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setActiveProject(p)}
                            className="p-4 bg-slate-800/50 border border-slate-700 hover:border-pink-500 rounded-xl text-left transition-all group"
                        >
                            <div className="font-bold text-white group-hover:text-pink-400 mb-1">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.files?.length || 0} sources</div>
                        </button>
                    ))}
                    <button className="p-4 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2">
                        <Plus size={20} /> Create New Notebook
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0f172a] animate-[slideIn_0.2s]">
            {/* Top Bar */}
            <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveProject(null)} className="text-slate-400 hover:text-white">Back</button>
                    <div className="h-6 w-px bg-slate-700"></div>
                    <h2 className="font-bold text-lg text-white">{activeProject.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/20">OmniBook</span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Audio Overview Player */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1 pl-4 pr-1 border border-slate-700">
                        <span className="text-xs font-medium text-slate-300 mr-2 flex items-center gap-2">
                            <Headphones size={14} /> Audio Overview
                        </span>
                        {isPlaying ? (
                            <button onClick={handleStopAudio} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30">
                                <StopCircle size={16} fill="currentColor" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleGenerateAudio} 
                                disabled={isGeneratingAudio}
                                className="p-2 bg-white text-black rounded-full hover:bg-slate-200 disabled:opacity-50"
                            >
                                {isGeneratingAudio ? <div className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin"/> : <Play size={16} fill="currentColor" />}
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Sources */}
                <div className="w-72 border-r border-slate-800 bg-[#0b1120] flex flex-col">
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Sources</h3>
                            <div className="flex gap-1">
                                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" title="Upload File">
                                    <Upload size={14} />
                                </button>
                                <button onClick={() => setShowUrlInput(!showUrlInput)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" title="Add Link">
                                    <Youtube size={14} />
                                </button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                        
                        {showUrlInput && (
                            <div className="mb-3 flex gap-1 animate-[fadeIn_0.2s]">
                                <input 
                                    type="text" 
                                    value={youtubeUrl} 
                                    onChange={e => setYoutubeUrl(e.target.value)} 
                                    placeholder="YouTube URL..." 
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                                />
                                <button onClick={handleAddYoutube} className="p-1 bg-pink-600 text-white rounded"><Plus size={14}/></button>
                            </div>
                        )}

                        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">
                            {activeProject.files?.map((file, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg cursor-pointer transition-colors group">
                                    <div className="p-2 bg-slate-700 rounded text-slate-300">
                                        {file.type === 'youtube' ? <Youtube size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-200 truncate">{file.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{file.mimeType?.split('/')[1] || 'URL'}</div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-600">[{i+1}]</span>
                                </div>
                            ))}
                            {(!activeProject.files || activeProject.files.length === 0) && (
                                <div className="text-xs text-slate-600 text-center py-4 border border-dashed border-slate-800 rounded">No sources yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center: Chat & Synthesis */}
                <div className="flex-1 flex flex-col bg-background relative">
                    {/* Quick Actions / Generators */}
                    <div className="p-4 border-b border-slate-800 flex gap-2 overflow-x-auto">
                        <button onClick={() => handleGenerateArtifact('guide')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium text-slate-300 border border-slate-700 transition-colors whitespace-nowrap">
                            <Book size={14} className="text-blue-400" /> Study Guide
                        </button>
                        <button onClick={() => handleGenerateArtifact('timeline')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium text-slate-300 border border-slate-700 transition-colors whitespace-nowrap">
                            <Calendar size={14} className="text-green-400" /> Timeline
                        </button>
                        <button onClick={() => handleGenerateArtifact('matrix')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium text-slate-300 border border-slate-700 transition-colors whitespace-nowrap">
                            <LayoutGrid size={14} className="text-orange-400" /> Compare Matrix
                        </button>
                        <button onClick={() => handleGenerateArtifact('quiz')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-medium text-slate-300 border border-slate-700 transition-colors whitespace-nowrap">
                            <Check size={14} className="text-purple-400" /> Quiz
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <Wand2 size={40} className="text-pink-400 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Ready to Research</h3>
                                <p className="text-slate-400 max-w-sm">
                                    Ask questions about your sources. Use the toggle below to restrict answers strictly to the provided content.
                                </p>
                            </div>
                        ) : (
                            messages.map((m, i) => <MessageBubble key={i} message={m} />)
                        )}
                        {isThinking && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm italic">
                                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"/> Thinking...
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center justify-center mb-2 gap-2">
                            <button 
                                onClick={() => setIsSourceMode(!isSourceMode)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${isSourceMode ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                            >
                                {isSourceMode ? <Pin size={12} fill="currentColor" /> : <Globe size={12} />}
                                {isSourceMode ? 'Source-Only Mode' : 'General Knowledge Allowed'}
                            </button>
                        </div>
                        <ChatInput onSend={handleSendMessage} disabled={isThinking} />
                    </div>
                </div>

                {/* Right: Insight Board (Collapsible) */}
                <div className="w-80 border-l border-slate-800 bg-[#0b1120] hidden xl:flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Insight Board</h3>
                        <button className="text-slate-400 hover:text-white"><MoreHorizontal size={16}/></button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-fixed">
                        {/* Sample Insight Cards */}
                        <div className="bg-yellow-100/90 text-slate-900 p-3 rounded-lg shadow-lg rotate-1 text-sm font-handwriting">
                            <div className="font-bold mb-1 flex justify-between">Key Takeaway <Pin size={12}/></div>
                            The Q3 revenue growth was primarily driven by the new API monetization strategy.
                        </div>
                        <div className="bg-blue-100/90 text-slate-900 p-3 rounded-lg shadow-lg -rotate-1 text-sm font-handwriting">
                            <div className="font-bold mb-1 flex justify-between">Follow Up <Pin size={12}/></div>
                            Check the churn rate metrics for September.
                        </div>
                        <button 
                            className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-slate-500 hover:text-slate-300 flex flex-col items-center justify-center gap-2 transition-colors"
                            onClick={() => handleAddNote("New Note")}
                        >
                            <Plus size={24} />
                            <span className="text-xs font-medium">Add Note</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
