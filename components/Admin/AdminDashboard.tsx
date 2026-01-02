
import React, { useEffect, useState } from 'react';
import { 
    X, Shield, Users, Activity, AlertCircle, Search, RefreshCw, Database, 
    Settings, CreditCard, Lock, MessageSquare, Globe, Smartphone, 
    Cpu, LifeBuoy, Terminal, BarChart2, Mail, Layout, ToggleLeft, ToggleRight, Check, Play, UserX, AlertTriangle, Key, Save,
    UserCheck, UserCog
} from 'lucide-react';
import { UserProfile, AdminLog, SystemStatus, GlobalConfig, GuestConfig, UserRole } from '../../types';
import { getAllUsers, getAdminStats, getAdminAuditLogs, setSystemMaintenance, broadcastNotification, subscribeToSystemStatus, subscribeToGlobalConfig, updateGlobalConfig, updateUserRole } from '../../services/firebase';
import { AVAILABLE_MODELS } from '../../constants/models';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

const ADMIN_EMAIL = "youssef2010.mahmoud@gmail.com";

type AdminTab = 
    | 'overview' 
    | 'users' 
    | 'permissions'
    | 'guests'
    | 'content' 
    | 'models' 
    | 'billing' 
    | 'analytics' 
    | 'security' 
    | 'system' 
    | 'comms' 
    | 'growth' 
    | 'dev' 
    | 'support' 
    | 'mobile' 
    | 'i18n' 
    | 'qa' 
    | 'automation';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
  
  // Config State
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Maintenance State
  const [maintMessage, setMaintMessage] = useState('');
  
  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  
  // Forms
  const [globalKeysForm, setGlobalKeysForm] = useState<any>({});
  const [guestConfigForm, setGuestConfigForm] = useState<GuestConfig>({
      enabled: true,
      messageLimitPerDay: 50,
      allowedModels: [],
      features: { imageGeneration: true, videoGeneration: false, fileUploads: true }
  });

  const checkAccess = () => {
    return currentUser.role === 'admin' || currentUser.role === 'superadmin' || currentUser.email === ADMIN_EMAIL;
  };

  const isSuperAdmin = currentUser.role === 'superadmin' || currentUser.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isOpen && checkAccess()) {
        fetchData();
        const unsubStatus = subscribeToSystemStatus(setSystemStatus);
        const unsubConfig = subscribeToGlobalConfig((config) => {
            setGlobalConfig(config);
            setGlobalKeysForm(config.globalApiKeys || {});
            if (config.guestConfig) setGuestConfigForm(config.guestConfig);
        });
        return () => {
            unsubStatus();
            unsubConfig();
        };
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [usersData, statsData, logsData] = await Promise.all([
            getAllUsers(),
            getAdminStats(),
            getAdminAuditLogs()
        ]);
        setUsers(usersData);
        setStats(statsData);
        setAuditLogs(logsData);
    } catch (error) {
        console.error("Admin fetch error", error);
    } finally {
        setLoading(false);
    }
  };

  const handleMaintenanceToggle = async (enabled: boolean) => {
      if (confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} maintenance mode?`)) {
          await setSystemMaintenance(enabled, maintMessage || "We are currently upgrading our systems.");
          alert(`System is now ${enabled ? 'Under Maintenance' : 'Live'}`);
      }
  };

  const handleBroadcast = async () => {
      if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
      if (confirm('Send this notification to ALL active users?')) {
          await broadcastNotification({
              title: broadcastTitle,
              message: broadcastMsg,
              type: 'info'
          });
          setBroadcastTitle('');
          setBroadcastMsg('');
          alert('Broadcast sent!');
      }
  };

  const handleSaveGlobalKeys = async () => {
      if(confirm("These keys will be available to all users who haven't set their own. Proceed?")) {
          await updateGlobalConfig({ globalApiKeys: globalKeysForm });
          alert("Global keys updated.");
      }
  };

  const handleSaveGuestConfig = async () => {
      await updateGlobalConfig({ guestConfig: guestConfigForm });
      alert("Guest configuration updated.");
  };

  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
      if (!isSuperAdmin) {
          alert("Only Super Admins can change roles.");
          return;
      }
      if (confirm(`Change role to ${newRole}?`)) {
          await updateUserRole(targetId, newRole);
          // Optimistic update
          setUsers(users.map(u => u.uid === targetId ? { ...u, role: newRole } : u));
      }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  if (!checkAccess()) {
      return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-surface p-6 rounded-xl border border-red-500/50 text-center">
                <Shield size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-slate-400 mb-4">You do not have permission to view this dashboard.</p>
                <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">Close</button>
            </div>
        </div>
      );
  }

  const renderSidebarItem = (id: AdminTab, label: string, icon: React.ReactNode) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
          {icon}
          {label}
      </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-[95vw] h-[90vh] bg-[#0b1120] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-bold text-white">
                <Shield size={20} className="text-red-500" />
                Admin Panel
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Core</div>
                {renderSidebarItem('overview', 'Dashboard', <Layout size={18} />)}
                {renderSidebarItem('users', 'Users', <Users size={18} />)}
                {renderSidebarItem('permissions', 'Permissions', <UserCheck size={18} />)}
                {renderSidebarItem('guests', 'Guest Control', <UserCog size={18} />)}
                {renderSidebarItem('content', 'Content Mod', <MessageSquare size={18} />)}
                
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase mt-2">Platform</div>
                {renderSidebarItem('models', 'AI Models', <Cpu size={18} />)}
                {renderSidebarItem('system', 'System Config', <Settings size={18} />)}
                {renderSidebarItem('security', 'Security', <Lock size={18} />)}
                {renderSidebarItem('billing', 'Billing & Rev', <CreditCard size={18} />)}
                {renderSidebarItem('analytics', 'Analytics', <BarChart2 size={18} />)}

                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase mt-2">Operations</div>
                {renderSidebarItem('comms', 'Comms', <Mail size={18} />)}
                {renderSidebarItem('support', 'Support', <LifeBuoy size={18} />)}
                {renderSidebarItem('growth', 'Growth', <Activity size={18} />)}
                {renderSidebarItem('dev', 'Developers', <Terminal size={18} />)}
                
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase mt-2">Misc</div>
                {renderSidebarItem('mobile', 'Mobile', <Smartphone size={18} />)}
                {renderSidebarItem('i18n', 'International', <Globe size={18} />)}
                {renderSidebarItem('qa', 'QA & Testing', <Check size={18} />)}
                {renderSidebarItem('automation', 'Automation', <Play size={18} />)}
            </div>
            <div className="p-4 border-t border-slate-800">
                <button onClick={onClose} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">
                    Exit Admin
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30">
                <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">v2.2.0</span>
                    <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {/* ... (Previous Overview Tab content) ... */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-2 text-slate-400 mb-1"><Activity size={16} /> System Health</div>
                                <div className="text-xl font-bold text-green-400">{stats?.systemHealth || 'Healthy'}</div>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-2 text-slate-400 mb-1"><Users size={16} /> Active Users</div>
                                <div className="text-xl font-bold text-white">{stats?.activeUsers || 0}</div>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-2 text-slate-400 mb-1"><Database size={16} /> Conversations</div>
                                <div className="text-xl font-bold text-white">{stats?.totalConversations || 0}</div>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-2 text-slate-400 mb-1"><CreditCard size={16} /> Revenue (MRR)</div>
                                <div className="text-xl font-bold text-white">{stats?.revenue || '$0'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="relative w-64">
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">Export CSV</button>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3">Plan</th>
                                        <th className="px-6 py-3">Credits</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => (
                                        <tr key={u.uid} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                    {u.displayName?.[0] || u.email?.[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{u.displayName || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                    u.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400' :
                                                    u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-700 text-slate-300'
                                                }`}>
                                                    {u.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 capitalize"><span className="px-2 py-0.5 bg-slate-700 rounded-full text-xs">{u.plan}</span></td>
                                            <td className="px-6 py-4">{u.credits}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded transition-colors" title="Impersonate"><Users size={14}/></button>
                                                <button className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Ban"><UserX size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><UserCheck size={20} /> Role Management</h3>
                            <p className="text-sm text-slate-400 mb-6">Manage user roles and administrative access. Only Super Admins can promote users.</p>
                            
                            <div className="overflow-hidden bg-slate-900/50 rounded-lg border border-slate-800">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">Current Role</th>
                                            <th className="px-6 py-3">Change Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(u => (
                                            <tr key={u.uid} className="border-b border-slate-800">
                                                <td className="px-6 py-3 font-medium">{u.email || u.displayName}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-blue-900 text-blue-300' : u.role === 'superadmin' ? 'bg-purple-900 text-purple-300' : 'bg-slate-800'}`}>
                                                        {u.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 flex gap-2">
                                                    <button onClick={() => handleRoleChange(u.uid, 'user')} className={`px-2 py-1 rounded text-xs border ${u.role === 'user' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-700 text-slate-500 hover:text-white'}`}>User</button>
                                                    <button onClick={() => handleRoleChange(u.uid, 'admin')} className={`px-2 py-1 rounded text-xs border ${u.role === 'admin' ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-500 hover:text-blue-400'}`}>Admin</button>
                                                    <button onClick={() => handleRoleChange(u.uid, 'superadmin')} className={`px-2 py-1 rounded text-xs border ${u.role === 'superadmin' ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-500 hover:text-purple-400'}`}>Super</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'guests' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><UserCog size={20} /> Guest Configuration</h3>
                            <p className="text-sm text-slate-400 mb-6">Manage feature access and limits for anonymous (guest) users.</p>

                            <div className="space-y-6 max-w-2xl">
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                    <div>
                                        <div className="font-medium text-white">Enable Guest Access</div>
                                        <div className="text-sm text-slate-500">Allow users to use the app without creating an account.</div>
                                    </div>
                                    <button 
                                        onClick={() => setGuestConfigForm({...guestConfigForm, enabled: !guestConfigForm.enabled})}
                                        className={`p-2 rounded-full transition-colors ${guestConfigForm.enabled ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        {guestConfigForm.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                        <div className="mb-2 font-medium text-white">Daily Message Limit</div>
                                        <input 
                                            type="number" 
                                            value={guestConfigForm.messageLimitPerDay}
                                            onChange={(e) => setGuestConfigForm({...guestConfigForm, messageLimitPerDay: parseInt(e.target.value)})}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                        />
                                    </div>
                                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                        <div className="mb-2 font-medium text-white">Features</div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={guestConfigForm.features.imageGeneration}
                                                    onChange={(e) => setGuestConfigForm({...guestConfigForm, features: {...guestConfigForm.features, imageGeneration: e.target.checked}})}
                                                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                                                />
                                                <span className="text-sm text-slate-300">Image Generation</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={guestConfigForm.features.videoGeneration}
                                                    onChange={(e) => setGuestConfigForm({...guestConfigForm, features: {...guestConfigForm.features, videoGeneration: e.target.checked}})}
                                                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                                                />
                                                <span className="text-sm text-slate-300">Video Generation</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={guestConfigForm.features.fileUploads}
                                                    onChange={(e) => setGuestConfigForm({...guestConfigForm, features: {...guestConfigForm.features, fileUploads: e.target.checked}})}
                                                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                                                />
                                                <span className="text-sm text-slate-300">File Uploads</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleSaveGuestConfig} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                                    <Save size={16} /> Save Guest Config
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings size={20} /> System Configuration</h3>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                        <div>
                                            <div className="font-medium text-white">Maintenance Mode</div>
                                            <div className="text-sm text-slate-500">Locks the app for all users except admins.</div>
                                        </div>
                                        <button 
                                            onClick={() => handleMaintenanceToggle(!systemStatus?.maintenanceMode)}
                                            className={`p-2 rounded-full transition-colors ${systemStatus?.maintenanceMode ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                        >
                                            {systemStatus?.maintenanceMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    </div>
                                    {systemStatus?.maintenanceMode && (
                                         <div>
                                            <label className="text-xs text-slate-400 mb-1 block">Maintenance Message</label>
                                            <input 
                                                type="text" 
                                                value={maintMessage}
                                                onChange={e => setMaintMessage(e.target.value)}
                                                placeholder="We are currently upgrading..."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                            />
                                         </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                             <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700 border-l-4 border-l-yellow-500">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Key size={20} className="text-yellow-500" /> Global Public API Keys
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Set default keys for users who have not provided their own. 
                                    <br/><span className="text-red-400 font-bold">WARNING:</span> These are visible to the client in this demo implementation. In production, use a proxy backend.
                                </p>
                                <div className="space-y-3">
                                    {['openai', 'anthropic', 'google', 'deepseek', 'groq'].map((provider) => (
                                        <div key={provider}>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{provider}</label>
                                            <input 
                                                type="password"
                                                value={globalKeysForm[provider] || ''}
                                                onChange={(e) => setGlobalKeysForm({ ...globalKeysForm, [provider]: e.target.value })}
                                                placeholder={`Global ${provider} key`}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleSaveGlobalKeys} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Save size={16} /> Save Global Keys
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Other tabs simplified for brevity, they remain similar to before */}
                {['content', 'models', 'billing', 'analytics', 'comms', 'security', 'growth', 'dev', 'support', 'mobile', 'i18n', 'qa', 'automation'].includes(activeTab) && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Terminal size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Module Under Construction</h3>
                        <p className="max-w-md text-center">The <strong>{activeTab}</strong> administration module is currently being built.</p>
                    </div>
                )}
            </main>
        </div>
      </div>
    </div>
  );
};
