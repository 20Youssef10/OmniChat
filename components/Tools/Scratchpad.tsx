
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, StickyNote } from 'lucide-react';

interface ScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Scratchpad: React.FC<ScratchpadProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('omnichat_scratchpad');
    if (saved) setContent(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    localStorage.setItem('omnichat_scratchpad', newVal);
  };

  const handleClear = () => {
      if(confirm('Clear scratchpad?')) {
          setContent('');
          localStorage.removeItem('omnichat_scratchpad');
      }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-[#0f172a] flex flex-col h-full shadow-xl absolute right-0 top-0 bottom-0 z-40 animate-[slideIn_0.3s_ease-out]">
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50">
        <div className="flex items-center gap-2 text-yellow-400">
            <StickyNote size={18} />
            <h3 className="font-bold text-sm">Scratchpad</h3>
        </div>
        <div className="flex gap-2">
            <button onClick={handleClear} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded">
                <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <X size={18} />
            </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="flex-1 w-full bg-transparent p-4 text-sm text-slate-300 resize-none focus:outline-none font-mono leading-relaxed"
        placeholder="Type notes here... they are saved automatically."
      />
      <div className="p-2 text-xs text-slate-600 text-center border-t border-slate-800">
          Auto-saved locally
      </div>
    </div>
  );
};
