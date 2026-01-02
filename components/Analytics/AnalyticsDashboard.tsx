import React, { useEffect, useState } from 'react';
import { X, TrendingUp, DollarSign, Activity, MessageSquare } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Message } from '../../types';
import { subscribeToConversations, subscribeToMessages } from '../../services/firebase';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose, userId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      totalMessages: 0,
      totalTokens: 0,
      estimatedCost: 0,
      messagesByDay: [] as any[],
      modelUsage: [] as any[]
  });

  // Calculate stats on open
  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);

    // Subscribe to all conversations (limited by recent ideally, but fetching all for simple analytics)
    const unsubConvs = subscribeToConversations(userId, async (conversations) => {
        let totalMsgs = 0;
        let totalToks = 0;
        let totalCost = 0;
        const dayMap = new Map<string, number>();
        const modelMap = new Map<string, number>();

        // Fetch messages for each conversation to aggregate real data
        // CAUTION: This causes many reads. In prod, use aggregated counters in DB.
        // For demo, we limit to last 20 convs to save reads.
        const recentConvs = conversations.slice(0, 20);
        
        const promises = recentConvs.map(conv => 
            new Promise<void>((resolve) => {
                const unsub = subscribeToMessages(conv.id, (msgs) => {
                   msgs.forEach(m => {
                       if (m.role === 'user') return; // Only count AI output for simplicty or track user input too if metadata exists
                       
                       totalMsgs++;
                       
                       // Token Counting
                       const tokens = m.usageMetadata?.totalTokenCount || (m.content.length / 4);
                       totalToks += tokens;
                       
                       // Cost Estimation (Rough Avg: $2 / 1M tokens)
                       totalCost += (tokens / 1000000) * 2; 

                       // Daily Stats
                       const date = new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                       dayMap.set(date, (dayMap.get(date) || 0) + 1);

                       // Model Usage
                       const modelName = m.model || 'Unknown';
                       modelMap.set(modelName, (modelMap.get(modelName) || 0) + 1);
                   });
                   unsub(); // Unsub immediately after fetch
                   resolve();
                });
            })
        );

        await Promise.all(promises);

        setStats({
            totalMessages: totalMsgs,
            totalTokens: Math.round(totalToks),
            estimatedCost: parseFloat(totalCost.toFixed(4)),
            messagesByDay: Array.from(dayMap.entries()).map(([name, count]) => ({ name, count })).reverse().slice(0, 7).reverse(), // Last 7 active days
            modelUsage: Array.from(modelMap.entries()).map(([name, count]) => ({ name, count }))
        });
        setLoading(false);
    });

    return () => unsubConvs();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-4xl bg-[#0b1120] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-indigo-400" />
                Analytics Dashboard
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-500">
                    Loading analytics data...
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><MessageSquare size={20} /></div>
                                <span className="text-slate-400 text-sm">Total Messages</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Activity size={20} /></div>
                                <span className="text-slate-400 text-sm">Total Tokens</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.totalTokens.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><DollarSign size={20} /></div>
                                <span className="text-slate-400 text-sm">Est. Cost</span>
                            </div>
                            <div className="text-2xl font-bold text-white">${stats.estimatedCost}</div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Chart */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                <TrendingUp size={16} /> Activity Trend (Last 7 Days)
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.messagesByDay}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                                            itemStyle={{ color: '#818cf8' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Model Usage Chart */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4">Model Distribution</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.modelUsage} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} hide />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} tickLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#334155'}}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                                        />
                                        <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};