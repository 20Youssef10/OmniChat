
import React, { useState, useEffect } from 'react';
import { X, Globe, Eye, Key, Moon, Sun, Monitor, Plus, Trash2, Copy, Share2, Download, Trophy, Database, Webhook, Github, Sliders, Cpu, Save } from 'lucide-react';
import { UserProfile, ApiKey, UserApiKeys, GenerationConfig } from '../../types';
import { translations, getTranslation, Language } from '../../utils/i18n';
import { generateApiKey, subscribeToApiKeys, deleteApiKey, updateUserPreferences, updateIntegrationConfig, exportUserData } from '../../services/firebase';
import { ACHIEVEMENTS, LEVELS } from '../../utils/gamification';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'api_keys' | 'integrations' | 'export'>('general');
  const [appApiKeys, setAppApiKeys] = useState<ApiKey[]>([]); // Internal App Keys
  const [newKeyName, setNewKeyName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // User Personal API Keys
  const [userApiKeys, setUserApiKeys] = useState<UserApiKeys>(user.preferences.apiKeys || {});
  
  // Model Config
  const [genConfig, setGenConfig] = useState<GenerationConfig>(user.preferences.generationConfig || {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 4096,
      globalSystemPrompt: ''
  });

  // Integrations state
  const [slackWebhook, setSlackWebhook] = useState(user.integrations?.slackWebhook || '');
  const [githubToken, setGithubToken] = useState(user.integrations?.githubToken || '');
  
  // Local state for immediate UI feedback
  const [lang, setLang] = useState<Language>(user.preferences.language);
  const t = getTranslation(lang);

  useEffect(() => {
    if (!user || !isOpen) return;
    const unsubscribe = subscribeToApiKeys(user.uid, setAppApiKeys);
    return () => unsubscribe();
  }, [user, isOpen]);

  const handleUpdatePreference = async (updates: Partial<UserProfile['preferences']>) => {
      if (updates.language) setLang(updates.language);
      const merged = { ...user.preferences, ...updates };
      if (updates.accessibility) {
          merged.accessibility = { ...user.preferences.accessibility, ...updates.accessibility };
      }
      await updateUserPreferences(user.uid, merged);
  };

  const handleSaveApiKeys = async () => {
      await updateUserPreferences(user.uid, {
          ...user.preferences,
          apiKeys: userApiKeys
      });
      alert('API Keys Saved!');
  };

  const handleSaveModelConfig = async () => {
      await updateUserPreferences(user.uid, {
          ...user.preferences,
          generationConfig: genConfig
      });
      alert('Model Configuration Saved!');
  };

  const handleGenerateAppKey = async () => {
      if (!newKeyName.trim()) return;
      await generateApiKey(user.uid, newKeyName);
      setNewKeyName('');
  };

  const handleSaveIntegrations = async () => {
      await updateIntegrationConfig(user.uid, {
          slackWebhook,
          githubToken
      });
      alert('Integrations saved!');
  };

  const handleExportData = async (format: 'json' | 'csv') => {
      setIsExporting(true);
      try {
          const data = await exportUserData(user.uid);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `omnichat-export-${new Date().toISOString()}.json`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error(e);
          alert('Export failed');
      } finally {
          setIsExporting(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-5xl bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {t.settings}
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <X size={20} />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-60 bg-slate-900/50 border-r border-slate-700 p-2 space-y-1">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Sliders size={16} /> General
                </button>
                <button 
                    onClick={() => setActiveTab('models')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'models' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Cpu size={16} /> Model Config
                </button>
                <button 
                    onClick={() => setActiveTab('api_keys')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'api_keys' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Key size={16} /> My API Keys
                </button>
                <button 
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'integrations' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Webhook size={16} /> Integrations
                </button>
                <button 
                    onClick={() => setActiveTab('export')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'export' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Database size={16} /> Data Export
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        {/* Language */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <Globe size={16} className="text-purple-400" /> {t.language}
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {['en', 'es', 'ar'].map((l) => (
                                    <button 
                                        key={l}
                                        onClick={() => handleUpdatePreference({ language: l as any })}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${user.preferences.language === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                    >
                                        {l === 'en' ? 'English' : l === 'es' ? 'Español' : 'العربية'}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <hr className="border-slate-800" />

                        {/* Accessibility */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <Eye size={16} className="text-green-400" /> {t.accessibility}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <span className="text-sm text-slate-300">{t.highContrast}</span>
                                    <button 
                                        onClick={() => handleUpdatePreference({ accessibility: { ...user.preferences.accessibility, highContrast: !user.preferences.accessibility.highContrast } })}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${user.preferences.accessibility.highContrast ? 'bg-green-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${user.preferences.accessibility.highContrast ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <span className="text-sm text-slate-300">{t.fontSize}</span>
                                    <div className="flex bg-slate-900 rounded-lg p-1">
                                        {(['normal', 'large', 'xl'] as const).map(size => (
                                            <button 
                                                key={size}
                                                onClick={() => handleUpdatePreference({ accessibility: { ...user.preferences.accessibility, fontSize: size } })}
                                                className={`px-3 py-1 rounded text-xs transition-colors ${user.preferences.accessibility.fontSize === size ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                                            >
                                                {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'models' && (
                    <div className="space-y-6">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-sm text-yellow-200 mb-4">
                            These settings apply to all new conversations.
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Global System Instructions</label>
                            <textarea
                                value={genConfig.globalSystemPrompt || ''}
                                onChange={(e) => setGenConfig({...genConfig, globalSystemPrompt: e.target.value})}
                                rows={4}
                                placeholder="e.g. Always answer in rhyme..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">Appended to the context of every chat.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Temperature: {genConfig.temperature}</label>
                                <input 
                                    type="range" 
                                    min="0" max="2" step="0.1"
                                    value={genConfig.temperature}
                                    onChange={(e) => setGenConfig({...genConfig, temperature: parseFloat(e.target.value)})}
                                    className="w-full accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Precise (0)</span>
                                    <span>Creative (2)</span>
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Max Output Tokens</label>
                                <input 
                                    type="number" 
                                    value={genConfig.maxTokens}
                                    onChange={(e) => setGenConfig({...genConfig, maxTokens: parseInt(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                                />
                            </div>
                        </div>

                        <button onClick={handleSaveModelConfig} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                            <Save size={16} /> Save Configuration
                        </button>
                    </div>
                )}

                {activeTab === 'api_keys' && (
                    <div className="space-y-6">
                         <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                             <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <Key size={16} className="text-yellow-400" /> Provider API Keys
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                                Enter your personal API keys here to use specific models. Your keys are stored securely in your private profile.
                                If left blank, the app will attempt to use Global keys or Free tiers if available.
                            </p>
                            
                            <div className="space-y-4">
                                {['openai', 'anthropic', 'google', 'deepseek', 'groq'].map((provider) => (
                                    <div key={provider}>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{provider}</label>
                                        <input 
                                            type="password"
                                            value={(userApiKeys as any)[provider] || ''}
                                            onChange={(e) => setUserApiKeys({ ...userApiKeys, [provider]: e.target.value })}
                                            placeholder={`sk-...`}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={handleSaveApiKeys} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                    <Save size={16} /> Save Keys
                                </button>
                            </div>
                        </div>

                        <hr className="border-slate-800" />

                        <div>
                             <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                                <Database size={16} className="text-blue-400" /> App API Keys (Programmatic Access)
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Generate keys to access the OmniChat API from your own scripts.</p>
                            
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="Key Name (e.g. My Script)"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <button 
                                    onClick={handleGenerateAppKey}
                                    disabled={!newKeyName.trim()}
                                    className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Plus size={16} /> Generate
                                </button>
                            </div>

                            <div className="space-y-3">
                                {appApiKeys.map(key => (
                                    <div key={key.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between group">
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">{key.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-1">{key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}</div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => navigator.clipboard.writeText(key.key)} className="p-1.5 text-slate-400 hover:text-white"><Copy size={14} /></button>
                                            <button onClick={() => deleteApiKey(key.id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Webhook size={16} /> Slack Webhook</h3>
                            <input 
                                type="password" 
                                value={slackWebhook} 
                                onChange={(e) => setSlackWebhook(e.target.value)}
                                placeholder="https://hooks.slack.com/services/..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                            />
                        </div>
                         <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Github size={16} /> GitHub Token</h3>
                            <input 
                                type="password" 
                                value={githubToken} 
                                onChange={(e) => setGithubToken(e.target.value)}
                                placeholder="ghp_..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                            />
                        </div>
                        <button onClick={handleSaveIntegrations} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">
                            Save Integrations
                        </button>
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700 text-center">
                            <Database size={48} className="text-indigo-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Export Your Data</h3>
                            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">Download all your conversations, prompts, and settings in JSON format. Suitable for backups or migration.</p>
                            <button 
                                onClick={() => handleExportData('json')}
                                disabled={isExporting}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center gap-2 mx-auto"
                            >
                                <Download size={18} />
                                {isExporting ? 'Exporting...' : 'Export as JSON'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
