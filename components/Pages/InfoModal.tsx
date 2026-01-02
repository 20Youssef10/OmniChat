
import React, { useState } from 'react';
import { X, Book, Code, Shield, FileText, Info, Lock, Terminal, Cpu, Users } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = 'docs' | 'legal' | 'about';
type SubTab = 'user' | 'dev' | 'code' | 'privacy' | 'tos';

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const [mainTab, setMainTab] = useState<MainTab>('docs');
  const [subTab, setSubTab] = useState<SubTab>('user');

  if (!isOpen) return null;

  const renderContent = () => {
    // --- Documentation Section ---
    if (mainTab === 'docs') {
      return (
        <div className="space-y-6 animate-[fadeIn_0.2s]">
          <div className="flex gap-2 border-b border-slate-700 pb-4">
             <button onClick={() => setSubTab('user')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>User Guide</button>
             <button onClick={() => setSubTab('dev')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'dev' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Developer Docs</button>
             <button onClick={() => setSubTab('code')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'code' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Code Docs</button>
          </div>

          <div className="prose prose-invert max-w-none prose-sm overflow-y-auto max-h-[60vh] pr-2">
            {subTab === 'user' && (
              <>
                <h1>User Guide</h1>
                <p>Welcome to OmniChat AI! This guide will help you get started with the core features of the application.</p>
                
                <h3>Getting Started</h3>
                <ol>
                  <li><strong>Sign In:</strong> Click the "Sign In" button in the sidebar. You can use Google, Email, or continue as a Guest.</li>
                  <li><strong>Select a Model:</strong> Use the dropdown in the top header to choose an AI model (e.g., Gemini 2.5 Flash, GPT-4o).</li>
                  <li><strong>Start Chatting:</strong> Type your message in the input box at the bottom.</li>
                </ol>

                <h3>Key Features</h3>
                <ul>
                  <li><strong>Chat & Media:</strong> Upload images via the paperclip icon or use the microphone for voice input.</li>
                  <li><strong>Generation:</strong> Use slash commands like <code>/image</code> to generate visuals or <code>/video</code> for Veo video generation.</li>
                  <li><strong>Compare Mode:</strong> Click the "Compare" toggle in the model dropdown to run two models side-by-side.</li>
                  <li><strong>Personas:</strong> Switch the AI's personality (e.g., Coder, Creative Writer) via the User icon in the sidebar.</li>
                </ul>
              </>
            )}

            {subTab === 'dev' && (
              <>
                <h1>Developer Documentation</h1>
                <p>OmniChat is built with React, TypeScript, and Firebase. It leverages the Google GenAI SDK for Gemini integration.</p>

                <h3>Setup</h3>
                <pre className="bg-slate-900 p-4 rounded-lg">
                  <code>git clone https://github.com/your-org/omnichat.git{'\n'}
npm install{'\n'}
# Configure .env with API_KEY{'\n'}
npm start</code>
                </pre>

                <h3>Architecture</h3>
                <p>The app follows a client-side architecture using React Context for global state management and React Query for server state.</p>
                <ul>
                    <li><strong>Frontend:</strong> React 18, Tailwind CSS, Lucide Icons.</li>
                    <li><strong>Backend:</strong> Firebase (Auth, Firestore, Storage).</li>
                    <li><strong>AI:</strong> Direct SDK integration via <code>@google/genai</code>.</li>
                </ul>
              </>
            )}

            {subTab === 'code' && (
              <>
                <h1>Code Documentation</h1>
                <p>Overview of the codebase structure and key modules.</p>

                <h3>Core Services</h3>
                <ul>
                    <li><code>services/geminiService.ts</code>: Handles all interactions with Google's Gemini API, including streaming responses and multimodal inputs.</li>
                    <li><code>services/firebase.ts</code>: Centralized configuration for Auth, Firestore, and Storage. Contains helper functions for DB operations.</li>
                    <li><code>hooks/useChat.ts</code>: The primary hook managing conversation state, message streaming, and optimistic UI updates.</li>
                </ul>

                <h3>State Management</h3>
                <p>We use <code>AppContext.tsx</code> to manage UI state (modals, sidebar) and global user preferences. React Query is used for caching async data like projects and prompts.</p>
              </>
            )}
          </div>
        </div>
      );
    }

    // --- Legal Section ---
    if (mainTab === 'legal') {
      return (
        <div className="space-y-6 animate-[fadeIn_0.2s]">
          <div className="flex gap-2 border-b border-slate-700 pb-4">
             <button onClick={() => setSubTab('privacy')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'privacy' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Privacy Policy</button>
             <button onClick={() => setSubTab('tos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === 'tos' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Terms of Service</button>
          </div>

          <div className="prose prose-invert max-w-none prose-sm overflow-y-auto max-h-[60vh] pr-2">
            {subTab === 'privacy' && (
               <>
                <h1>Privacy Policy</h1>
                <p className="text-sm text-slate-400">Last updated: May 20, 2024</p>
                <p>At OmniChat AI, we take your privacy seriously. This Privacy Policy describes how your personal information is collected, used, and shared.</p>
                
                <h3>1. Information We Collect</h3>
                <p>We collect information you provide directly to us, such as when you create an account, update your profile, or use our interactive features.</p>

                <h3>2. How We Use Your Information</h3>
                <p>We use the information we collect to provide, maintain, and improve our services, including to process transactions, identify you, and authenticate your access.</p>

                <h3>3. AI Data Usage</h3>
                <p>Conversations sent to AI models (Gemini, OpenAI) are processed by respective providers. We do not use your private conversations to train our own models without explicit consent.</p>
               </>
            )}
            {subTab === 'tos' && (
                <>
                <h1>Terms of Service</h1>
                <p>By accessing or using OmniChat AI, you agree to be bound by these Terms.</p>

                <h3>1. Use of Service</h3>
                <p>You must follow any policies made available to you within the Services. You may not misuse our Services.</p>

                <h3>2. AI Generated Content</h3>
                <p>You acknowledge that AI outputs may be inaccurate. You are responsible for verifying any information generated by the AI before relying on it.</p>
                
                <h3>3. Termination</h3>
                <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever.</p>
                </>
            )}
          </div>
        </div>
      );
    }

    // --- About Section ---
    if (mainTab === 'about') {
        return (
            <div className="space-y-8 animate-[fadeIn_0.2s] text-center pt-8">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-4">
                    <span className="text-white font-bold text-2xl">Ai</span>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">OmniChat AI</h1>
                    <p className="text-slate-400">Version 2.2.0</p>
                </div>
                
                <p className="max-w-md mx-auto text-slate-300 leading-relaxed">
                    OmniChat is a next-generation AI interface designed to bridge the gap between powerful language models and human productivity. 
                    Built with a focus on usability, speed, and privacy.
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Cpu className="mx-auto mb-2 text-indigo-400" size={24} />
                        <div className="font-bold text-white">Multi-Model</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Shield className="mx-auto mb-2 text-green-400" size={24} />
                        <div className="font-bold text-white">Secure</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Users className="mx-auto mb-2 text-purple-400" size={24} />
                        <div className="font-bold text-white">Collaborative</div>
                    </div>
                </div>

                <div className="pt-8 text-xs text-slate-500">
                    &copy; {new Date().getFullYear()} OmniChat AI. All rights reserved.
                </div>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-5xl bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex h-[85vh] animate-[scaleIn_0.2s_ease-out]">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-700 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">Information</h2>
            <button 
                onClick={() => { setMainTab('docs'); setSubTab('user'); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'docs' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Book size={18} /> Documentation
            </button>
            <button 
                onClick={() => { setMainTab('legal'); setSubTab('privacy'); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'legal' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Shield size={18} /> Legal & Privacy
            </button>
            <button 
                onClick={() => setMainTab('about')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === 'about' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Info size={18} /> About Us
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-background">
            <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-900/30">
                <h2 className="text-lg font-bold text-white capitalize">
                    {mainTab === 'docs' ? 'Documentation' : mainTab === 'legal' ? 'Legal Information' : 'About OmniChat'}
                </h2>
                <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-hidden p-8">
                {renderContent()}
            </div>
        </div>

      </div>
    </div>
  );
};
