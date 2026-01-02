import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import { Notification } from '../../types';
import { subscribeToNotifications, markNotificationRead, clearAllNotifications } from '../../services/firebase';

interface NotificationCenterProps {
  userId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, setNotifications);
    return () => unsubscribe();
  }, [userId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      markNotificationRead(id);
  };

  const getIcon = (type: Notification['type']) => {
      switch(type) {
          case 'success': return <CheckCircle size={16} className="text-green-400" />;
          case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />;
          case 'error': return <AlertTriangle size={16} className="text-red-400" />;
          case 'achievement': return <Award size={16} className="text-purple-400" />;
          default: return <Info size={16} className="text-blue-400" />;
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg relative transition-colors"
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0b1120]"></span>
            )}
        </button>

        {isOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-[scaleIn_0.1s_ease-out]">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {notifications.length > 0 && (
                        <button 
                            onClick={() => clearAllNotifications(userId)}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                            <Check size={12} /> Mark all read
                        </button>
                    )}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No notifications yet.
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                className={`p-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors ${!notif.read ? 'bg-indigo-500/5' : ''}`}
                                onClick={(e) => handleMarkRead(notif.id, e)}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <h4 className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-slate-400'}`}>{notif.title}</h4>
                                            {!notif.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1"></div>}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                                        <div className="text-[10px] text-slate-500 mt-2 text-right">
                                            {new Date(notif.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
    </div>
  );
};