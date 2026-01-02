
import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Plus, Mail, Shield, UserPlus, FileText, Upload, Loader2 } from 'lucide-react';
import { Workspace, Attachment } from '../../types';
import { createWorkspace, subscribeToWorkspaces, updateWorkspaceFiles } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { uploadFile } from '../../services/fileService';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose, userId, userEmail }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // File Upload State
  const [newFiles, setNewFiles] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToWorkspaces(userId, setWorkspaces);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleCreate = async () => {
      if (!newName.trim()) return;
      await createWorkspace(userId, newName, userEmail, newFiles);
      setNewName('');
      setNewFiles([]);
  };

  const handleInvite = async () => {
      if (!selectedWorkspace || !inviteEmail.trim()) return;
      try {
        const wsRef = doc(db, "workspaces", selectedWorkspace.id);
        const newMember = {
            userId: `invited_${Date.now()}`, 
            email: inviteEmail,
            role: 'viewer' as const
        };
        await updateDoc(wsRef, {
            members: arrayUnion(newMember)
        });
        setInviteEmail('');
        alert(`Invited ${inviteEmail} to workspace!`);
      } catch (e) {
        console.error("Invite failed", e);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploading(true);
          const uploaded: Attachment[] = [];
          try {
              for (const file of Array.from(e.target.files) as File[]) {
                  const attachment = await uploadFile(file, userId);
                  uploaded.push(attachment);
              }
              if (selectedWorkspace) {
                  // If editing existing workspace
                  const updatedFiles = [...(selectedWorkspace.files || []), ...uploaded];
                  await updateWorkspaceFiles(selectedWorkspace.id, updatedFiles);
              } else {
                  // Creating new
                  setNewFiles(prev => [...prev, ...uploaded]);
              }
          } catch (e) {
              console.error(e);
              alert("Upload failed.");
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-blue-400" />
                Workspaces (Group Chats)
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <X size={20} />
            </button>
        </div>

        <div className="p-4 space-y-6 bg-background overflow-y-auto">
            
            {/* Create New */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Create New Group</label>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Group Name (e.g. Marketing Team)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button 
                            onClick={handleCreate}
                            disabled={!newName.trim() || isUploading}
                            className="px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {/* New Files for Creation */}
                    {newFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {newFiles.map((f, i) => (
                                <span key={i} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{f.name}</span>
                            ))}
                        </div>
                    )}
                    <button 
                        onClick={() => { setSelectedWorkspace(null); fileInputRef.current?.click(); }}
                        disabled={isUploading}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} /> Add shared files to new group
                    </button>
                </div>
            </div>

            <hr className="border-slate-800" />

            {/* List */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase">Your Groups</h3>
                {workspaces.length === 0 ? (
                    <div className="text-center text-slate-500 py-4 text-sm">No workspaces found.</div>
                ) : (
                    workspaces.map(ws => (
                        <div key={ws.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-medium text-slate-200">{ws.name}</div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Users size={12} /> {ws.members.length} members</span>
                                        {ws.files && ws.files.length > 0 && (
                                            <span className="flex items-center gap-1"><FileText size={12} /> {ws.files.length} docs</span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedWorkspace(selectedWorkspace?.id === ws.id ? null : ws)}
                                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
                                >
                                    {selectedWorkspace?.id === ws.id ? 'Close' : 'Manage'}
                                </button>
                            </div>

                            {selectedWorkspace?.id === ws.id && (
                                <div className="mt-3 pt-3 border-t border-slate-700 animate-[fadeIn_0.2s]">
                                    
                                    {/* Members Section */}
                                    <div className="mb-4">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Members</div>
                                        <div className="space-y-2 mb-3">
                                            {ws.members.map((m, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs text-slate-300 bg-slate-900/50 p-2 rounded">
                                                    <span>{m.email}</span>
                                                    <span className="uppercase text-[10px] bg-slate-700 px-1 rounded">{m.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="email" 
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="Add member by email..."
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                                            />
                                            <button 
                                                onClick={handleInvite}
                                                className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded"
                                                title="Add Member"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Files Section */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase">Shared Knowledge</div>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white flex items-center gap-1"
                                            >
                                                <Upload size={10} /> Add
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            {ws.files?.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/30 p-1.5 rounded border border-slate-700/50">
                                                    <FileText size={12} className="text-blue-400" />
                                                    <span className="truncate flex-1">{f.name}</span>
                                                </div>
                                            ))}
                                            {(!ws.files || ws.files.length === 0) && <div className="text-xs text-slate-600 italic">No shared files.</div>}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            
            {/* Hidden File Input */}
            <input 
                type="file" 
                multiple 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
            />

            <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex gap-2">
                <Shield size={16} />
                <div>
                    Chats started within a workspace are visible to all added members. Shared files are used as context for all workspace chats.
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
