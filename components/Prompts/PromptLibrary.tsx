import React, { useState, useEffect } from 'react';
import { X, BookTemplate, Search, Copy, Plus, Trash2 } from 'lucide-react';
import { PromptTemplate } from '../../types';
import { savePrompt, deletePrompt, subscribeToPrompts } from '../../services/firebase';

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelectPrompt: (text: string) => void;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({ isOpen, onClose, userId, onSelectPrompt }) => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Prompt State
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<any>('writing');

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToPrompts(userId, setPrompts);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleSave = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    await savePrompt({
      userId,
      name: newName,
      content: newContent,
      category: newCategory
    });
    setNewName('');
    setNewContent('');
    setActiveTab('browse');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm('Delete this template?')) {
          await deletePrompt(id);
      }
  };

  const filteredPrompts = prompts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-2xl bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookTemplate size={20} className="text-purple-400" />
            Prompt Library
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 flex gap-2">
             <button 
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'browse' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                Browse
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                New Template
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'browse' ? (
                <>
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-300 focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredPrompts.length === 0 ? (
                             <div className="col-span-2 text-center text-slate-500 py-8">
                                No templates found.
                            </div>
                        ) : (
                            filteredPrompts.map(prompt => (
                                <div 
                                    key={prompt.id}
                                    onClick={() => { onSelectPrompt(prompt.content); onClose(); }}
                                    className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl cursor-pointer transition-all group flex flex-col h-32"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm font-medium text-slate-200 truncate">{prompt.name}</div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] uppercase bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{prompt.category}</span>
                                            <button onClick={(e) => handleDelete(e, prompt.id)} className="p-1 hover:text-red-400 text-slate-500 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 line-clamp-3 flex-1">{prompt.content}</div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Template Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                        <select 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none"
                        >
                            <option value="writing">Writing</option>
                            <option value="coding">Coding</option>
                            <option value="analysis">Analysis</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Prompt Content</label>
                        <textarea 
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                        />
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={!newName.trim() || !newContent.trim()}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Save Template
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
