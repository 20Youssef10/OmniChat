
import React, { useRef, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    signInAnonymously
} from 'firebase/auth';
import { auth, googleProvider, createConversation, deleteMessagesAfter, updateMessageInDb, subscribeToSystemStatus, getConversationByShareId, updateUserConnectors } from './services/firebase';
import { SystemStatus, UserProfile } from './types';
import { AppProvider, useAppStore } from './contexts/AppContext';
import { useChat } from './hooks/useChat';
import { initPerformanceMonitoring, setAnalyticsUser, trackEvent } from './services/analyticsService';
import { exchangeSpotifyCode } from './services/connectorService';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { MessageBubble } from './components/Chat/MessageBubble';
import { ChatInput } from './components/Chat/ChatInput';
import { AuthModal } from './components/Auth/AuthModal';
import { OfflineIndicator } from './components/Layout/OfflineIndicator';
import { ErrorBoundary } from './components/Layout/ErrorBoundary';
import { NotificationCenter } from './components/Notifications/NotificationCenter';
import { LevelBadge } from './components/Gamification/LevelBadge';
import { SearchModal } from './components/Search/SearchModal';
import { MaintenanceScreen } from './components/Layout/MaintenanceScreen';
import { ProfileModal } from './components/Profile/ProfileModal';
import { AVAILABLE_MODELS } from './constants/models';
import { Cpu, SplitSquareHorizontal, CheckCircle2, User, BrainCircuit, Activity, Zap, Users, Settings, Loader2, Shield, Search, Folder, BookTemplate, Ghost, Share2, Lock, StickyNote, Download, ArrowDownCircle, Maximize2, Minimize2 } from 'lucide-react';
import { getTranslation } from './utils/i18n';
import { Scratchpad } from './components/Tools/Scratchpad';

// Lazy Components
const ProjectModal = React.lazy(() => import('./components/Projects/ProjectModal').then(m => ({ default: m.ProjectModal })));
const PromptLibrary = React.lazy(() => import('./components/Prompts/PromptLibrary').then(m => ({ default: m.PromptLibrary })));
const PersonaModal = React.lazy(() => import('./components/Personas/PersonaModal').then(m => ({ default: m.PersonaModal })));
const MemoryPanel = React.lazy(() => import('./components/Memory/MemoryPanel').then(m => ({ default: m.MemoryPanel })));
const ArtifactPanel = React.lazy(() => import('./components/Artifacts/ArtifactPanel').then(m => ({ default: m.ArtifactPanel })));
const AnalyticsDashboard = React.lazy(() => import('./components/Analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const WorkflowPanel = React.lazy(() => import('./components/Workflows/WorkflowPanel').then(m => ({ default: m.WorkflowPanel })));
const WorkspaceModal = React.lazy(() => import('./components/Collaboration/WorkspaceModal').then(m => ({ default: m.WorkspaceModal })));
const SettingsModal = React.lazy(() => import('./components/Settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const InfoModal = React.lazy(() => import('./components/Pages/InfoModal').then(m => ({ default: m.InfoModal })));
const ShareModal = React.lazy(() => import('./components/Chat/ShareModal').then(m => ({ default: m.ShareModal })));

const queryClient = new QueryClient();

const MainLayout: React.FC = () => {
    const { 
        user, authLoading, setLocalUser,
        isSidebarOpen, setSidebarOpen,
        isScratchpadOpen, setScratchpadOpen,
        isFocusMode, setFocusMode,
        modals, openModal, closeModal,
        selectedModelIds, setSelectedModelIds,
        isComparisonMode, toggleComparisonMode,
        currentPersona, setCurrentPersona,
        currentArtifact, setCurrentArtifact,
        isTemporaryChat, setTemporaryChat,
        sharedConversation, setSharedConversation
    } = useAppStore();

    const { 
        conversations, 
        messages, 
        currentConversationId, 
        setCurrentConversationId, 
        sendMessage, 
        isGenerating,
        memories
    } = useChat(user, selectedModelIds, currentPersona);

    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Performance Monitoring & Maintenance Check
    useEffect(() => {
        initPerformanceMonitoring();
        trackEvent('session_start');
        
        const unsub = subscribeToSystemStatus(setSystemStatus);
        return () => unsub();
    }, []);

    // Helper to safely clear URL params
    const clearUrlParams = () => {
        try {
            // Use pathname instead of '/' to support blob/sandboxed environments
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } catch (e) {
            console.warn("Failed to update history state:", e);
        }
    };

    // Check for Share Link and OAuth Callbacks
    useEffect(() => {
        const checkUrlParams = async () => {
            const params = new URLSearchParams(window.location.search);
            
            // 1. Share Link
            const shareId = params.get('share');
            if (shareId) {
                const sharedConv = await getConversationByShareId(shareId);
                if (sharedConv) {
                    setSharedConversation(sharedConv);
                    setCurrentConversationId(sharedConv.id);
                    setSidebarOpen(false); // Focus on content
                } else {
                    alert("Shared link invalid or expired.");
                    clearUrlParams();
                }
                return;
            }

            // 2. Spotify OAuth Callback
            const code = params.get('code');
            if (code && window.location.pathname === '/callback') {
                if (user) {
                    try {
                        const data = await exchangeSpotifyCode(code);
                        if (data.access_token) {
                            await updateUserConnectors(user.uid, {
                                spotify: {
                                    connected: true,
                                    accessToken: data.access_token,
                                    refreshToken: data.refresh_token,
                                    expiresAt: Date.now() + (data.expires_in * 1000)
                                }
                            });
                            alert("Spotify Connected Successfully!");
                            clearUrlParams();
                            openModal('settings');
                        }
                    } catch (e) {
                        console.error("Spotify Auth Failed", e);
                        alert("Failed to connect Spotify.");
                    }
                }
            }
        };
        
        if (!authLoading) {
            checkUrlParams();
        }
    }, [authLoading, user]); // Run when user is loaded

    // Update Analytics User Context
    useEffect(() => {
        if (user) {
            setAnalyticsUser(user.uid, { 
                plan: user.plan, 
                credits: user.credits 
            });
        } else {
            setAnalyticsUser(null);
        }
    }, [user]);

    // Function to handle Guest Login Fallback
    const performGuestLogin = async () => {
        try {
            await signInAnonymously(auth);
        } catch (e: any) {
            console.warn("Firebase Anonymous Auth failed, falling back to local guest.", e.code);
            // Fallback for when Anonymous Auth is disabled in Firebase Console
            if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
                const guestId = `guest_local_${Date.now()}`;
                const localProfile: UserProfile = {
                    uid: guestId,
                    email: null,
                    displayName: 'Guest (Local)',
                    photoURL: null,
                    providerId: 'anonymous',
                    plan: 'free',
                    role: 'user',
                    credits: 10,
                    preferences: {
                        theme: 'system',
                        defaultModelId: 'gemini-2.5-flash',
                        language: 'en',
                        accessibility: { highContrast: false, fontSize: 'normal', reduceMotion: false }
                    },
                    gamification: { xp: 0, level: 1, streak: 1, lastActiveDate: new Date().toISOString().split('T')[0], badges: [] },
                    createdAt: Date.now(),
                    lastLoginAt: Date.now()
                };
                setLocalUser(localProfile);
            }
        }
    };

    // Auto-login Guest if accessing features that require a User ID (for Firebase)
    useEffect(() => {
        const featureModals = ['projects', 'prompts', 'personas', 'memories', 'analytics', 'workflow', 'workspace', 'settings'];
        const isFeatureOpen = featureModals.some(m => modals[m as keyof typeof modals]);
        
        if (isFeatureOpen && !user && !authLoading) {
            performGuestLogin();
        }
    }, [modals, user, authLoading]);

    // Track Feature Usage (Modal Opens)
    useEffect(() => {
        if (modals.projects) trackEvent('feature_used', { feature: 'projects' });
        if (modals.prompts) trackEvent('feature_used', { feature: 'prompt_library' });
        if (modals.personas) trackEvent('feature_used', { feature: 'personas' });
        if (modals.memories) trackEvent('feature_used', { feature: 'memory' });
        if (modals.analytics) trackEvent('feature_used', { feature: 'analytics_dashboard' });
        if (modals.workflow) trackEvent('feature_used', { feature: 'workflows' });
        if (modals.workspace) trackEvent('feature_used', { feature: 'workspaces' });
        if (modals.search) trackEvent('feature_used', { feature: 'search' });
        if (modals.settings) trackEvent('feature_used', { feature: 'settings' });
        if (modals.profile) trackEvent('feature_used', { feature: 'profile' });
        if (modals.info) trackEvent('feature_used', { feature: 'info_page' });
        if (modals.share) trackEvent('feature_used', { feature: 'share_modal' });
    }, [modals]);

    useEffect(() => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isGenerating, autoScroll]);

    const handleNewChat = async (projectId?: string) => {
        if (!user && !isTemporaryChat) {
            // Auto-login guest for chat if not temp
            await performGuestLogin();
            return; 
        }
        setSharedConversation(null);
        setTemporaryChat(false); // Reset temp mode when clicking new chat
        clearUrlParams(); // Clear share URL if present
        trackEvent('feature_used', { feature: 'new_chat', project_id: projectId });
        const id = await createConversation(user!.uid, selectedModelIds[0], "New Chat", projectId);
        setCurrentConversationId(id);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleAuth = async (method: 'google' | 'guest' | 'email', email?: string, pass?: string, type?: 'login' | 'signup') => {
        try {
            if (method === 'google') await signInWithPopup(auth, googleProvider);
            if (method === 'guest') await performGuestLogin();
            if (method === 'email' && email && pass) {
                if (type === 'login') await signInWithEmailAndPassword(auth, email, pass);
                else await createUserWithEmailAndPassword(auth, email, pass);
            }
            closeModal('auth');
        } catch (e: any) {
            console.error(e);
            // Don't alert if we already handled the specific error in performGuestLogin, but for email/google:
            if (method !== 'guest') alert(e.message);
        }
    };

    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        if (currentConversationId === id) setCurrentConversationId(null);
    };

    const handleSignOut = () => {
        signOut(auth);
        setLocalUser(null);
        setSharedConversation(null);
    };

    const handleExportChat = () => {
        if (!messages.length) return;
        const text = messages.map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleString()}]\n${m.content}\n`).join('\n---\n');
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${currentConversationId || 'temp'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const t = getTranslation(user?.preferences?.language || 'en');
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.email === "youssef2010.mahmoud@gmail.com";
    
    // Check if current conversation is one user owns to enable sharing
    const currentConvObj = conversations.find(c => c.id === currentConversationId);
    const canShare = currentConvObj && user && currentConvObj.userId === user.uid;
    const isSharedView = !!sharedConversation;
    const canEditShared = sharedConversation?.shareConfig?.accessLevel === 'edit';

    if (systemStatus?.maintenanceMode && !isAdmin) {
        return <MaintenanceScreen message={systemStatus.message} eta={systemStatus.eta} />;
    }

    if (authLoading) return <div className="flex items-center justify-center h-screen bg-background text-indigo-400"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            <OfflineIndicator lang={user?.preferences?.language || 'en'} />
            
            <AuthModal 
                isOpen={modals.auth} 
                onClose={() => closeModal('auth')} 
                onGoogleLogin={() => handleAuth('google')}
                onGuestLogin={() => handleAuth('guest')}
                onEmailAuth={(e, type, em, pass) => handleAuth('email', em, pass, type)}
                authError={null}
                loading={false}
            />

            <SearchModal 
                isOpen={modals.search}
                onClose={() => closeModal('search')}
                conversations={conversations}
                messages={messages}
                onNavigate={(cid, mid) => { setCurrentConversationId(cid); }}
                userId={user?.uid || ''}
            />

            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50"><Loader2 className="animate-spin text-white" /></div>}>
                {modals.settings && user && <SettingsModal isOpen={true} onClose={() => closeModal('settings')} user={user} />}
                {modals.projects && <ProjectModal isOpen={true} onClose={() => closeModal('projects')} userId={user?.uid || ''} onSelectProject={handleNewChat} />}
                {modals.prompts && <PromptLibrary isOpen={true} onClose={() => closeModal('prompts')} userId={user?.uid || ''} onSelectPrompt={(txt) => sendMessage({ text: txt, attachments: [] })} />}
                {modals.personas && <PersonaModal isOpen={true} onClose={() => closeModal('personas')} userId={user?.uid || ''} onSelectPersona={setCurrentPersona} currentPersonaId={currentPersona?.id || 'default'} />}
                {modals.memories && <MemoryPanel isOpen={true} onClose={() => closeModal('memories')} userId={user?.uid || ''} />}
                {modals.analytics && <AnalyticsDashboard isOpen={true} onClose={() => closeModal('analytics')} userId={user?.uid || ''} />}
                {modals.workflow && <WorkflowPanel isOpen={true} onClose={() => closeModal('workflow')} userId={user?.uid || ''} onRunWorkflow={async (p) => sendMessage({ text: p, attachments: [] })} />}
                {modals.workspace && <WorkspaceModal isOpen={true} onClose={() => closeModal('workspace')} userId={user?.uid || ''} userEmail={user?.email || ''} />}
                {modals.profile && user && <ProfileModal isOpen={true} onClose={() => closeModal('profile')} user={user} />}
                {modals.admin && isAdmin && <AdminDashboard isOpen={true} onClose={() => closeModal('admin')} currentUser={user!} />}
                {modals.info && <InfoModal isOpen={true} onClose={() => closeModal('info')} />}
                {modals.share && <ShareModal isOpen={true} onClose={() => closeModal('share')} conversation={currentConvObj || null} />}
            </Suspense>

            {!isSharedView && !isFocusMode && (
                <Sidebar 
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onSelectConversation={setCurrentConversationId}
                    onNewChat={handleNewChat}
                    onDeleteConversation={handleDeleteConversation}
                    user={user}
                    onSignOut={handleSignOut}
                    onSignIn={() => openModal('auth')}
                    isOpen={isSidebarOpen}
                    setIsOpen={setSidebarOpen}
                    onOpenSearch={() => openModal('search')}
                    onOpenModal={openModal}
                />
            )}

            <main className="flex-1 flex flex-col relative w-full h-full transition-all bg-background">
                {/* Header */}
                {!isFocusMode && (
                    <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-4">
                            {!isSharedView && (
                                <button className="md:hidden p-2 text-slate-400" onClick={() => setSidebarOpen(true)}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            )}
                            {isSharedView ? (
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-green-500/20 rounded text-green-400"><Share2 size={16}/></div>
                                    <span className="font-bold text-white">Shared Conversation</span>
                                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                        {sharedConversation.shareConfig?.accessLevel === 'edit' ? 'Collaborative' : 'Read Only'}
                                    </span>
                                    <button onClick={handleNewChat} className="ml-4 text-xs text-indigo-400 hover:text-indigo-300">
                                        Go Home
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                     <div className="relative group">
                                        <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-full border border-slate-700 transition-colors text-sm text-slate-200">
                                            {selectedModelIds.length > 1 ? (
                                                <><SplitSquareHorizontal size={16} className="text-indigo-400" /><span className="font-medium">Compare ({selectedModelIds.length})</span></>
                                            ) : (
                                                <><span>{AVAILABLE_MODELS.find(m => m.id === selectedModelIds[0])?.icon}</span><span className="font-medium">{AVAILABLE_MODELS.find(m => m.id === selectedModelIds[0])?.name}</span></>
                                            )}
                                        </button>
                                        {/* Model Dropdown Simplified */}
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-surface border border-slate-700 rounded-xl shadow-xl overflow-hidden hidden group-focus-within:block z-50">
                                            <div className="p-3 border-b border-slate-700/50 flex justify-between bg-slate-800/30">
                                                <span className="text-xs font-semibold text-slate-400">{t.modelCompare}</span>
                                                <button onClick={toggleComparisonMode} className={`w-10 h-5 rounded-full relative transition-colors ${isComparisonMode ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${isComparisonMode ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {AVAILABLE_MODELS.map(model => (
                                                <button key={model.id} onClick={() => {
                                                    if(isComparisonMode) {
                                                        setSelectedModelIds(prev => prev.includes(model.id) ? (prev.length > 1 ? prev.filter(p=>p!==model.id) : prev) : [...prev, model.id]);
                                                    } else {
                                                        setSelectedModelIds([model.id]);
                                                    }
                                                    trackEvent('feature_used', { feature: 'model_switch', model_id: model.id });
                                                }} className={`w-full text-left p-3 hover:bg-slate-700/50 border-b border-slate-800/50 flex gap-3 ${selectedModelIds.includes(model.id) ? 'bg-slate-700/30' : ''}`}>
                                                    <div className="text-xl">{model.icon}</div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-slate-200 text-sm">{model.name} {selectedModelIds.includes(model.id) && <CheckCircle2 size={14} className="text-green-500 inline ml-1"/>}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {canShare && !isSharedView && (
                                <button 
                                    onClick={() => openModal('share')}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Share Chat"
                                >
                                    <Share2 size={18} />
                                </button>
                            )}
                            {messages.length > 0 && (
                                <button
                                    onClick={handleExportChat}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Export to Markdown"
                                >
                                    <Download size={18} />
                                </button>
                            )}
                            <button
                                onClick={() => setFocusMode(true)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                title="Focus Mode"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => setScratchpadOpen(!isScratchpadOpen)}
                                className={`p-2 rounded-lg transition-colors ${isScratchpadOpen ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                title="Scratchpad"
                            >
                                <StickyNote size={18} />
                            </button>
                            
                            {isTemporaryChat && (
                                <div className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                                    <Ghost size={12} />
                                    Temporary Chat
                                </div>
                            )}
                            {user && <NotificationCenter userId={user.uid} />}
                            {user && <div className="hidden md:block"><LevelBadge user={user} compact={true} /></div>}
                        </div>
                    </header>
                )}

                {/* Focus Mode Exit Button */}
                {isFocusMode && (
                    <div className="absolute top-4 right-4 z-50">
                        <button 
                            onClick={() => setFocusMode(false)}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-600 shadow-lg backdrop-blur"
                            title="Exit Focus Mode"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                                    <Cpu size={40} className="text-indigo-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">{isTemporaryChat ? 'Temporary Chat Mode' : t.welcome}</h2>
                                <p className="text-slate-400 max-w-md mb-8 text-sm">
                                    {isTemporaryChat 
                                        ? "Messages here are not saved to your history." 
                                        : `OmniChat v2.3 • ${currentPersona ? `Persona: ${currentPersona.name}` : 'Ready to help.'}`
                                    }
                                </p>
                                {!isSharedView && (
                                    <button onClick={() => openModal('search')} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 text-sm flex items-center gap-2 transition-all"><Search size={14} /> Press <kbd className="font-mono bg-slate-800 px-1 rounded text-xs">Cmd+K</kbd> to search</button>
                                )}
                            </div>
                        ) : (
                            messages.map(msg => (
                                <MessageBubble 
                                    key={msg.id} 
                                    message={msg} 
                                    onEdit={async (m, newC) => {
                                        if(!currentConversationId) return;
                                        // Block editing in shared view if view only
                                        if (isSharedView && !canEditShared) return;
                                        
                                        await updateMessageInDb(currentConversationId, m.id, { content: newC });
                                        await deleteMessagesAfter(currentConversationId, m.timestamp + 1);
                                    }}
                                    onOpenArtifact={setCurrentArtifact}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {currentArtifact && <ArtifactPanel artifact={currentArtifact} onClose={() => setCurrentArtifact(null)} />}
                    <Scratchpad isOpen={isScratchpadOpen} onClose={() => setScratchpadOpen(false)} />
                    
                    {/* Auto-Scroll Toggle */}
                    {messages.length > 5 && (
                        <div className="absolute bottom-24 right-8 z-20">
                            <button 
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`p-2 rounded-full shadow-lg border backdrop-blur transition-all ${autoScroll ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/80 text-slate-400 border-slate-700'}`}
                                title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                            >
                                <ArrowDownCircle size={20} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-full bg-background/95 backdrop-blur border-t border-slate-800 z-10 pb-4 md:pb-6 pt-2">
                    {isSharedView && !canEditShared ? (
                         <div className="flex items-center justify-center p-4 text-slate-500 gap-2">
                             <Lock size={16} />
                             <span className="text-sm">This conversation is read-only.</span>
                         </div>
                    ) : (
                        <ChatInput onSend={(txt, att) => sendMessage({ text: txt, attachments: att })} disabled={isGenerating} userId={user?.uid} />
                    )}
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AppProvider>
                    <MainLayout />
                </AppProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

export default App;
