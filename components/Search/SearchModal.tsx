import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, Hash, Calendar, Filter, ArrowRight, MessageSquare, Save, Trash2, Folder } from 'lucide-react';
import { Conversation, Message } from '../../types';
import { performSearch, SearchResult, generateSnippet } from '../../services/searchService';
import { subscribeToSavedSearches, saveSearchQuery, deleteSavedSearch, SavedSearch } from '../../services/firebase';
import { AVAILABLE_MODELS } from '../../constants/models';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  // In a real app with massive history, we wouldn't pass all messages.
  // We'd rely on a server-side index. For this client-side demo, we pass loaded messages or empty array.
  messages: Message[]; 
  onNavigate: (conversationId: string, messageId?: string) => void;
  userId: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, conversations, messages, onNavigate, userId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'conversations' | 'messages'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  // Filters
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 50);
        // Load saved searches
        const unsub = subscribeToSavedSearches(userId, setSavedSearches);
        return () => unsub();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const filters = {
        modelId: filterModel || undefined,
        dateRange: filterDate as any || undefined
    };
    
    // Simulate searching through messages from active conversations + some history
    // In production: fetch from Algolia/Elasticsearch
    const searchResults = performSearch(query, conversations, messages, filters);
    
    // Filter by tab
    const filteredByTab = searchResults.filter(r => {
        if (activeTab === 'all') return true;
        if (activeTab === 'conversations') return r.type === 'conversation';
        if (activeTab === 'messages') return r.type === 'message';
        return true;
    });

    setResults(filteredByTab);
    setSelectedIndex(0);
  }, [query, conversations, messages, filterModel, filterDate, activeTab]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        // Scroll into view logic could go here
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    } else if (e.key === 'Escape') {
        onClose();
    }
  };

  const handleSelect = (result: SearchResult) => {
      if (result.type === 'conversation') {
          onNavigate(result.id);
      } else if (result.type === 'message' && result.metadata?.conversationId) {
          onNavigate(result.metadata.conversationId, result.id);
      }
      onClose();
  };

  const handleSaveSearch = async () => {
      if (!query.trim()) return;
      await saveSearchQuery(userId, query, query, { modelId: filterModel });
      alert('Search saved!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-3xl glass-panel rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
            <Search className="text-slate-400" size={24} />
            <input 
                ref={inputRef}
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages, conversations, or files..."
                className="flex-1 bg-transparent border-none text-xl text-white placeholder-slate-500 focus:ring-0 outline-none"
            />
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                    <Filter size={18} />
                </button>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <div className="text-xs font-mono border border-slate-600 rounded px-1.5">ESC</div>
                </button>
            </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
            <div className="px-4 py-3 border-b border-white/10 bg-slate-900/50 flex flex-wrap gap-4 text-sm animate-slideIn">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Model:</span>
                    <select 
                        value={filterModel} 
                        onChange={(e) => setFilterModel(e.target.value)}
                        className="bg-slate-800 border-none rounded px-2 py-1 text-slate-300 focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">Any</option>
                        {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Date:</span>
                    <select 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-slate-800 border-none rounded px-2 py-1 text-slate-300 focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">Anytime</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
                 {query && (
                    <button onClick={handleSaveSearch} className="ml-auto flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300">
                        <Save size={14} /> Save Search
                    </button>
                )}
            </div>
        )}

        {/* Tabs */}
        <div className="flex px-4 pt-2 border-b border-white/5 gap-4 text-sm font-medium">
            {['all', 'conversations', 'messages'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-2 border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Results / Empty State */}
        <div className="flex-1 overflow-y-auto bg-slate-950/30" ref={listRef}>
            {!query ? (
                // Empty State / Saved Searches
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Saved Searches & Smart Folders</h3>
                        <div className="grid grid-cols-2 gap-3">
                             {savedSearches.length === 0 ? (
                                <div className="text-sm text-slate-600 italic col-span-2">No saved searches yet.</div>
                             ) : (
                                savedSearches.map(search => (
                                    <div key={search.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all"
                                         onClick={() => setQuery(search.query)}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                                <Folder size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-200">{search.name}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteSavedSearch(search.id); }} className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggested</h3>
                         <div className="flex flex-wrap gap-2">
                             {['Debug Python code', 'Write a poem', 'Analyze data', 'React component'].map(s => (
                                 <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                                     {s}
                                 </button>
                             ))}
                         </div>
                    </div>
                </div>
            ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                    <Search size={32} className="mb-2 opacity-50" />
                    <p>No results found for "{query}"</p>
                </div>
            ) : (
                <div className="p-2 space-y-1">
                    {results.map((result, idx) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className={`
                                flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
                                ${idx === selectedIndex ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-300 hover:bg-white/5'}
                            `}
                        >
                            <div className={`mt-1 p-2 rounded-lg ${idx === selectedIndex ? 'bg-white/20' : 'bg-slate-800'}`}>
                                {result.type === 'conversation' ? <MessageSquare size={16} /> : <Hash size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className={`font-semibold text-sm ${idx === selectedIndex ? 'text-white' : 'text-slate-200'}`}>
                                        {result.title}
                                    </h4>
                                    <span className={`text-xs ${idx === selectedIndex ? 'text-indigo-200' : 'text-slate-500'}`}>
                                        {new Date(result.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className={`text-sm mt-1 line-clamp-2 ${idx === selectedIndex ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {generateSnippet(result.content, query)}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    {result.metadata?.modelId && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${idx === selectedIndex ? 'border-white/30 bg-white/10' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                                            {AVAILABLE_MODELS.find(m => m.id === result.metadata?.modelId)?.name || 'Unknown Model'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {idx === selectedIndex && (
                                <ArrowRight size={16} className="self-center animate-pulse" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
            <div className="flex gap-4">
                <span><kbd className="bg-slate-800 px-1 rounded text-slate-300">↑↓</kbd> Navigate</span>
                <span><kbd className="bg-slate-800 px-1 rounded text-slate-300">↵</kbd> Select</span>
                <span><kbd className="bg-slate-800 px-1 rounded text-slate-300">esc</kbd> Close</span>
            </div>
            <div>
                {results.length} results
            </div>
        </div>
      </div>
    </div>
  );
};