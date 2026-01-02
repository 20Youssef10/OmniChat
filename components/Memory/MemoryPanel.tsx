import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, Plus, Trash2, Search } from 'lucide-react';
import { Memory } from '../../types';
import { addMemory, deleteMemory, subscribeToMemories } from '../../services/firebase';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ isOpen, onClose, userId }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToMemories(userId, setMemories);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleAdd = async () => {
    if (!newMemoryContent.trim()) return;
    await addMemory({
      userId,
      content: newMemoryContent,
      category: 'fact'
    });
    setNewMemoryContent('');
  };

  const handleDelete = async (id: string) => {
      if(confirm('Forget this memory?')) {
          await deleteMemory(id);
      }
  };

  const filteredMemories = memories.filter(m => 
      m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BrainCircuit size={20} className="text-pink-400" />
            Core Memory
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 bg-slate-900/30">
             <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    placeholder="Add a new fact (e.g., 'I prefer concise answers')"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-pink-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button 
                    onClick={handleAdd}
                    disabled={!newMemoryContent.trim()}
                    className="p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg"
                >
                    <Plus size={20} />
                </button>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
            <div className="mb-4 relative">
                 <input 
                    type="text" 
                    placeholder="Search memories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-300 focus:outline-none focus:border-pink-500/50"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

            <div className="space-y-2">
                {filteredMemories.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 text-sm">
                        No memories stored yet. Add facts about yourself to help the AI learn.
                    </div>
                ) : (
                    filteredMemories.map(memory => (
                        <div 
                            key={memory.id}
                            className="flex items-start justify-between p-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-colors group"
                        >
                            <div className="text-sm text-slate-200">{memory.content}</div>
                            <button 
                                onClick={() => handleDelete(memory.id)}
                                className="ml-3 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-500 text-center">
            Memories are injected into the context of every conversation.
        </div>
      </div>
    </div>
  );
};
