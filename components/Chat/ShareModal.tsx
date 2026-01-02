
import React, { useState, useEffect } from 'react';
import { X, Share2, Globe, Lock, Copy, Check, Shield } from 'lucide-react';
import { Conversation } from '../../types';
import { updateConversationSharing, getConversationByShareId } from '../../services/firebase';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, conversation }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const [shareLink, setShareLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (conversation) {
        setIsPublic(!!conversation.shareId);
        setAccessLevel(conversation.shareConfig?.accessLevel || 'view');
        if (conversation.shareId) {
            setShareLink(`${window.location.origin}/?share=${conversation.shareId}`);
        } else {
            setShareLink('');
        }
    }
  }, [conversation]);

  const handleSave = async () => {
      if (!conversation) return;
      setIsLoading(true);
      try {
        const newShareId = await updateConversationSharing(conversation.id, {
            isPublic,
            accessLevel
        });
        
        if (isPublic && newShareId) {
            setShareLink(`${window.location.origin}/?share=${newShareId}`);
        } else {
            setShareLink('');
        }
      } catch (e) {
          console.error("Failed to update sharing", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 size={20} className="text-indigo-400" />
                Share Conversation
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPublic ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {isPublic ? <Globe size={24} /> : <Lock size={24} />}
                    </div>
                    <div>
                        <div className="font-medium text-white">{isPublic ? 'Public Link' : 'Private'}</div>
                        <div className="text-xs text-slate-500">{isPublic ? 'Anyone with the link can access' : 'Only you can view this chat'}</div>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>

            {isPublic && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Permissions</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setAccessLevel('view')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${accessLevel === 'view' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                            >
                                View Only
                            </button>
                            <button 
                                onClick={() => setAccessLevel('edit')}
                                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${accessLevel === 'edit' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                            >
                                Collaborative (Edit)
                            </button>
                        </div>
                    </div>

                    {shareLink && (
                        <div>
                             <label className="block text-sm font-medium text-slate-300 mb-2">Share Link</label>
                             <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    readOnly 
                                    value={shareLink} 
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 font-mono focus:outline-none"
                                 />
                                 <button 
                                    onClick={handleCopy}
                                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                 >
                                     {isCopied ? <Check size={20} /> : <Copy size={20} />}
                                 </button>
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
            <button 
                onClick={handleSave} 
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                {isLoading ? 'Saving...' : 'Update Settings'}
            </button>
        </div>
      </div>
    </div>
  );
};
