
import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Trash2, Folder, Upload, FileText, Loader2 } from 'lucide-react';
import { Project, Attachment } from '../../types';
import { createProject, deleteProject, subscribeToProjects, updateProjectFiles } from '../../services/firebase';
import { uploadFile } from '../../services/fileService';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelectProject: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, userId, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToProjects(userId, setProjects);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    await createProject({
      userId,
      name: newProjectName,
      files: files
    });
    setNewProjectName('');
    setFiles([]);
    setActiveTab('list');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm('Are you sure you want to delete this project?')) {
          await deleteProject(id);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsUploading(true);
          const newFiles: Attachment[] = [];
          try {
              for (const file of Array.from(e.target.files) as File[]) {
                  const attachment = await uploadFile(file, userId);
                  newFiles.push(attachment);
              }
              setFiles(prev => [...prev, ...newFiles]);
          } catch (e) {
              console.error(e);
              alert("Upload failed.");
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Folder size={20} className="text-indigo-400" />
            Projects
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 flex gap-2">
            <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                My Projects
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                Create New
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'list' ? (
                <div className="space-y-2">
                    {projects.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            No projects yet. Create one to organize your chats.
                        </div>
                    ) : (
                        projects.map(project => (
                            <div 
                                key={project.id}
                                onClick={() => { onSelectProject(project.id); onClose(); }}
                                className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <Folder className="text-indigo-400" size={18} />
                                    <div>
                                        <div className="text-sm font-medium text-slate-200">{project.name}</div>
                                        <div className="flex gap-2 text-xs text-slate-500">
                                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                            {project.files && project.files.length > 0 && (
                                                <span className="flex items-center gap-1"><FileText size={10}/> {project.files.length} files</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, project.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
                        <input 
                            type="text" 
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="e.g. Q4 Marketing Plan"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Knowledge Base Files</label>
                        <div className="flex flex-col gap-2">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs border border-slate-700">
                                    <span className="truncate flex-1 text-slate-300">{file.name}</span>
                                    <button onClick={() => removeFile(idx)} className="text-slate-500 hover:text-red-400">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            
                            <input 
                                type="file" 
                                multiple 
                                ref={fileInputRef}
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
                                Upload Knowledge Files
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Files uploaded here will be available as context for chats in this project.</p>
                    </div>

                    <button 
                        onClick={handleCreate}
                        disabled={!newProjectName.trim() || isUploading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <FolderPlus size={18} />
                        Create Project
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
