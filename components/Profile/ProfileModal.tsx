
import React, { useState } from 'react';
import { X, User, Mail, Phone, FileText, Camera, Save, Shield } from 'lucide-react';
import { UserProfile } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAppStore } from '../../contexts/AppContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const { setLocalUser } = useAppStore();
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Handle Local Guest (No Firestore Document)
      if (user.uid.startsWith('guest_local_')) {
          setLocalUser({
              ...user,
              displayName,
              phoneNumber,
              bio
          });
          onClose();
          return;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName,
        phoneNumber,
        bio
      });
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User size={20} className="text-indigo-400" />
            User Profile
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-800">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-500">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-mono">UID: {user.uid}</div>
            <div className="flex items-center gap-1 mt-1">
                 <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${user.role === 'admin' || user.role === 'superadmin' ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-slate-600 text-slate-400'}`}>
                    {user.role}
                 </span>
                 <span className="text-[10px] uppercase px-1.5 py-0.5 rounded border border-blue-500/50 text-blue-400 bg-blue-500/10">
                    {user.plan} Plan
                 </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="email" 
                  value={user.email || ''}
                  disabled
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bio / Info</label>
              <div className="relative">
                <FileText size={16} className="absolute left-3 top-3 text-slate-500" />
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-2">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
        </div>
      </div>
    </div>
  );
};
