
import React, { useState, useEffect } from 'react';
import { X, User, Plus, Trash2, CheckCircle, Smile, Briefcase, GraduationCap, Code, LineChart, PenTool, Globe, ShieldCheck } from 'lucide-react';
import { Persona } from '../../types';
import { savePersona, deletePersona, subscribeToPersonas } from '../../services/firebase';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelectPersona: (persona: Persona | null) => void;
  currentPersonaId: string | null;
}

const DEFAULT_PERSONAS: Persona[] = [
  { 
      id: 'default', 
      name: 'Default Assistant', 
      description: 'Helpful, neutral, and versatile.', 
      systemPrompt: 'You are a helpful AI assistant. Answer concisely and accurately.', 
      avatar: 'bot' 
  },
  { 
      id: 'coder', 
      name: 'Senior Developer', 
      description: 'Expert in Clean Code, React, and Architecture.', 
      systemPrompt: 'You are a Senior Software Engineer. You write clean, production-ready code. You prefer TypeScript, React, and modern patterns. Explain your thought process briefly before coding.', 
      avatar: 'dev' 
  },
  { 
      id: 'creative', 
      name: 'Creative Writer', 
      description: 'Imaginative storytelling and copywriting.', 
      systemPrompt: 'You are a creative writer and editor. Use vivid imagery, metaphors, and engaging storytelling techniques. Adapt tone to the specific request (persuasive, emotional, witty).', 
      avatar: 'writer' 
  },
  {
      id: 'analyst',
      name: 'Data Analyst',
      description: 'Insights from data, SQL, and Python expert.',
      systemPrompt: 'You are a Data Analyst. You are expert in SQL, Python (Pandas), and data visualization. You provide data-driven insights and explain complex trends simply.',
      avatar: 'analyst'
  },
  {
      id: 'product',
      name: 'Product Manager',
      description: 'Strategy, user stories, and roadmaps.',
      systemPrompt: 'You are a Product Manager. Focus on user value, prioritization (RICE/MoSCoW), and clear requirements. Help draft PRDs and user stories.',
      avatar: 'pm'
  },
  {
      id: 'tutor',
      name: 'Academic Tutor',
      description: 'Patient explanations for complex topics.',
      systemPrompt: 'You are an Academic Tutor. Explain complex concepts step-by-step. Use Socratic questioning to help the user learn. Be patient and encouraging.',
      avatar: 'tutor'
  },
  {
      id: 'security',
      name: 'Security Engineer',
      description: 'Vulnerability analysis and secure coding.',
      systemPrompt: 'You are a Cybersecurity Expert. Analyze code for vulnerabilities (OWASP Top 10). Suggest secure architectural patterns.',
      avatar: 'security'
  }
];

export const PersonaModal: React.FC<PersonaModalProps> = ({ isOpen, onClose, userId, onSelectPersona, currentPersonaId }) => {
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToPersonas(userId, setCustomPersonas);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleCreate = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    await savePersona({
      userId,
      name: newName,
      description: newDesc,
      systemPrompt: newPrompt,
      avatar: 'custom'
    });
    setNewName('');
    setNewDesc('');
    setNewPrompt('');
    setActiveTab('select');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm('Delete this persona?')) {
        await deletePersona(id);
        if (currentPersonaId === id) onSelectPersona(null);
    }
  };

  const getAvatarIcon = (avatar: string) => {
      switch(avatar) {
          case 'dev': return <Code size={20} />;
          case 'writer': return <PenTool size={20} />;
          case 'analyst': return <LineChart size={20} />;
          case 'pm': return <Briefcase size={20} />;
          case 'tutor': return <GraduationCap size={20} />;
          case 'security': return <ShieldCheck size={20} />;
          case 'custom': return <User size={20} />;
          default: return <Smile size={20} />;
      }
  };

  const getAvatarColor = (avatar: string) => {
      switch(avatar) {
          case 'dev': return 'text-blue-400 bg-blue-500/20';
          case 'writer': return 'text-purple-400 bg-purple-500/20';
          case 'analyst': return 'text-green-400 bg-green-500/20';
          case 'pm': return 'text-orange-400 bg-orange-500/20';
          case 'tutor': return 'text-yellow-400 bg-yellow-500/20';
          case 'security': return 'text-red-400 bg-red-500/20';
          default: return 'text-indigo-400 bg-indigo-500/20';
      }
  };

  if (!isOpen) return null;

  const allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-3xl bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User size={20} className="text-indigo-400" />
            AI Personas
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 flex gap-2">
            <button 
                onClick={() => setActiveTab('select')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'select' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                Select Persona
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                Create Custom
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'select' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allPersonas.map(persona => {
                        const isSelected = (currentPersonaId === persona.id) || (!currentPersonaId && persona.id === 'default');
                        return (
                            <div 
                                key={persona.id}
                                onClick={() => { onSelectPersona(persona.id === 'default' ? null : persona); onClose(); }}
                                className={`
                                    relative p-4 border rounded-xl cursor-pointer transition-all group
                                    ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800'}
                                `}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${getAvatarColor(persona.avatar || 'bot')}`}>
                                            {getAvatarIcon(persona.avatar || 'bot')}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-200">{persona.name}</div>
                                            <div className="text-xs text-slate-500 capitalize">{persona.userId ? 'Custom' : 'System'}</div>
                                        </div>
                                    </div>
                                    {isSelected && <CheckCircle size={18} className="text-indigo-500" />}
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-2">{persona.description}</div>
                                
                                {persona.userId && (
                                    <button 
                                        onClick={(e) => handleDelete(e, persona.id)}
                                        className="absolute bottom-2 right-2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Persona Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. React Expert"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Short Description</label>
                        <input 
                            type="text" 
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="e.g. Helps with frontend coding"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">System Prompt / Instructions</label>
                        <textarea 
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            rows={6}
                            placeholder="You are a helpful coding assistant..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        disabled={!newName.trim() || !newPrompt.trim()}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Create Persona
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
