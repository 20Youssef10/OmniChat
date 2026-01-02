
import React, { useState } from 'react';
import { 
    Plus, MessageSquare, Trash2, LogOut, Settings, PanelLeftClose, PanelLeftOpen, LogIn, Search, Archive, Command,
    User, BrainCircuit, Activity, Zap, Users, Folder, BookTemplate, Shield, Clock, Ghost, Info, NotebookPen
} from 'lucide-react';
import { Conversation, UserProfile } from '../../types';
import { useAppStore } from '../../contexts/AppContext';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (e: React.MouseEvent, id: string) => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onSignIn: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSearch: () => void;
  onOpenModal: (modal: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  user,
  onSignOut,
  onSignIn,
  isOpen,
  setIsOpen,
  onOpenSearch,
  onOpenModal
}) => {
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.email === "youssef2010.mahmoud@gmail.com";
  // Simplified for display, real filtering happens in modal
  const recentConversations = conversations.slice(0, 20);
  
  // Access global state for temp chat toggle
  const { isTemporaryChat, setTemporaryChat, setOmniBookOpen, isOmniBookOpen } = useAppStore();

  const renderNavItem = (icon: React.ReactNode, label: string, onClick: () => void, highlight: boolean = false) => (
      <button 
          onClick={() => {
              onClick();
              if (window.innerWidth < 768) setIsOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${highlight ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
      >
          {icon}
          <span>{label}</span>
      </button>
  );

  return (
    <>
        {/* Mobile Toggle */}
        <div className={`fixed top-4 left-4 z-50 md:hidden ${isOpen ? 'hidden' : 'block'}`}>
            <button onClick={() => setIsOpen(true)} className="p-2 bg-surface border border-slate-700 rounded-lg text-slate-200">
                <PanelLeftOpen size={20} />
            </button>
        </div>

        {/* Sidebar Backdrop (Mobile) */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsOpen(false)}
            />
        )}

        <div className={`
            fixed top-0 left-0 bottom-0 z-50 flex flex-col w-72 bg-[#0b1120] border-r border-slate-800/50 backdrop-blur-xl transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
        `}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-lg text-slate-100 tracking-tight">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="text-white text-sm">AI</span>
                    </div>
                    OmniChat
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400">
                    <PanelLeftClose size={20} />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="px-4 mb-3 space-y-2">
                <button 
                    onClick={() => {
                        onNewChat();
                        setOmniBookOpen(false); // Close OmniBook when starting new chat
                        setTemporaryChat(false);
                        if (window.innerWidth < 768) setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-white/10 rounded-xl transition-all duration-200 group shadow-lg shadow-indigo-900/20"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-medium text-sm">New Conversation</span>
                </button>
                
                <button 
                    onClick={() => {
                        setTemporaryChat(!isTemporaryChat);
                        if (!isTemporaryChat) onNewChat(); // Start new if entering temp mode
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-medium ${isTemporaryChat ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                    <div className="flex items-center gap-2">
                        <Ghost size={14} />
                        <span>Temporary Chat</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isTemporaryChat ? 'bg-orange-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isTemporaryChat ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                </button>
            </div>

            {/* Search Trigger */}
            <div className="px-4 mb-2">
                <button 
                    onClick={onOpenSearch}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 rounded-lg text-sm text-slate-400 hover:text-white transition-all group"
                >
                    <div className="flex items-center gap-2">
                        <Search size={14} />
                        <span>Search...</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 group-hover:text-slate-300">
                        <Command size={10} /> K
                    </div>
                </button>
            </div>

            {/* Navigation Items (Guests can click everything) */}
            <div className="px-2 py-2 space-y-0.5 border-b border-slate-800/50 mb-2">
                {renderNavItem(<NotebookPen size={18} className="text-pink-400" />, "OmniBook (NotebookLM)", () => setOmniBookOpen(!isOmniBookOpen), isOmniBookOpen)}
                {renderNavItem(<Folder size={18} />, "Projects", () => onOpenModal('projects'))}
                {renderNavItem(<BookTemplate size={18} />, "Prompt Library", () => onOpenModal('prompts'))}
                {renderNavItem(<User size={18} />, "Personas", () => onOpenModal('personas'))}
                {renderNavItem(<BrainCircuit size={18} />, "Memories", () => onOpenModal('memories'))}
                {renderNavItem(<Activity size={18} />, "Analytics", () => onOpenModal('analytics'))}
                {renderNavItem(<Zap size={18} />, "Workflows", () => onOpenModal('workflow'))}
                {renderNavItem(<Users size={18} />, "Workspaces (Groups)", () => onOpenModal('workspace'))}
                {isAdmin && renderNavItem(<Shield size={18} />, "Admin Dashboard", () => onOpenModal('admin'))}
                {renderNavItem(<Settings size={18} />, "Settings", () => onOpenModal('settings'))}
                {renderNavItem(<Info size={18} />, "Help & Info", () => onOpenModal('info'))}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-[#0b1120] z-10">
                    <span>Recent Chats</span>
                </div>
                {conversations.length === 0 ? (
                    <div className="px-4 text-sm text-slate-600 italic py-4 text-center opacity-60">
                        {user ? 'No conversations yet.' : 'Sign in or Chat to see history.'}
                    </div>
                ) : (
                    recentConversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                onSelectConversation(conv.id);
                                setOmniBookOpen(false); // Close OmniBook when selecting chat
                                if (window.innerWidth < 768) setIsOpen(false);
                            }}
                            className={`
                                group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-all
                                ${currentConversationId === conv.id 
                                    ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' 
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}
                            `}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={16} className={currentConversationId === conv.id ? 'text-indigo-400' : 'text-slate-600'} />
                                <span className="truncate">{conv.title}</span>
                            </div>
                            <div 
                                onClick={(e) => onDeleteConversation(e, conv.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 size={14} />
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-[#0b1120]/80 backdrop-blur">
                {user ? (
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => onOpenModal('profile')}
                            className="flex items-center gap-3 hover:bg-slate-800/50 p-2 rounded-lg -ml-2 transition-colors w-full text-left"
                        >
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border border-slate-600 object-cover" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="text-sm font-medium text-white truncate">{user.displayName || 'Guest'}</span>
                                <span className="text-xs text-slate-500 truncate">{user.email || 'Anonymous'}</span>
                            </div>
                        </button>
                        <div className="flex items-center gap-1">
                             <button onClick={onSignOut} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Sign Out">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={onSignIn}
                        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
                    >
                        <LogIn size={18} />
                        Sign In
                    </button>
                )}
            </div>
        </div>
    </>
  );
};
