import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Trash2, ArrowRight, Zap } from 'lucide-react';
import { Workflow, WorkflowStep } from '../../types';
import { saveWorkflow, subscribeToWorkflows } from '../../services/firebase';

interface WorkflowPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onRunWorkflow: (prompt: string, modelId: string) => Promise<void>;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ isOpen, onClose, userId, onRunWorkflow }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  
  // Create State
  const [newName, setNewName] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([{ id: '1', type: 'prompt', content: '' }]);

  useEffect(() => {
    if (!userId || !isOpen) return;
    const unsubscribe = subscribeToWorkflows(userId, setWorkflows);
    return () => unsubscribe();
  }, [userId, isOpen]);

  const handleAddStep = () => {
      setSteps([...steps, { id: Date.now().toString(), type: 'prompt', content: '' }]);
  };

  const handleSave = async () => {
      if (!newName.trim() || steps.some(s => !s.content.trim())) return;
      await saveWorkflow({
          userId,
          name: newName,
          description: `Workflow with ${steps.length} steps`,
          steps,
      });
      setNewName('');
      setSteps([{ id: '1', type: 'prompt', content: '' }]);
      setActiveTab('list');
  };

  const handleRun = async (workflow: Workflow) => {
      // Execute steps sequentially
      onClose(); // Close panel to show chat
      for (const step of workflow.steps) {
          if (step.type === 'prompt') {
              await onRunWorkflow(step.content, step.modelId || 'gemini-2.5-flash-latest');
              // Simple delay between steps to allow generation to start/finish roughly
              await new Promise(r => setTimeout(r, 2000)); 
          }
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-2xl bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                Workflow Automation
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
                My Workflows
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
                Create New
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-background">
            {activeTab === 'list' ? (
                <div className="space-y-3">
                    {workflows.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">No workflows yet. Create one to automate tasks.</div>
                    ) : (
                        workflows.map(wf => (
                            <div key={wf.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-slate-200">{wf.name}</div>
                                    <div className="text-xs text-slate-500">{wf.steps.length} Steps</div>
                                </div>
                                <button 
                                    onClick={() => handleRun(wf)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <Play size={12} fill="currentColor" /> Run
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Workflow Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400">Steps sequence</label>
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex gap-2 items-start">
                                <div className="mt-2 text-xs text-slate-500 w-4">{idx + 1}.</div>
                                <textarea 
                                    value={step.content}
                                    onChange={(e) => {
                                        const newSteps = [...steps];
                                        newSteps[idx].content = e.target.value;
                                        setSteps(newSteps);
                                    }}
                                    placeholder="Enter prompt..."
                                    rows={2}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                />
                                {idx > 0 && (
                                    <button onClick={() => setSteps(steps.filter((_, i) => i !== idx))} className="p-2 text-slate-500 hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleAddStep}
                        className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Add Step
                    </button>

                    <button 
                        onClick={handleSave}
                        className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
                    >
                        Save Workflow
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};