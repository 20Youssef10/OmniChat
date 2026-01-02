import React, { useState } from 'react';
import { X, Mail, ArrowRight, UserCircle, Shield, Check } from 'lucide-react';
import { trackEvent } from '../../services/analyticsService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleLogin: () => void;
  onGuestLogin: () => void;
  onEmailAuth: (e: React.FormEvent, type: 'login' | 'signup', email: string, pass: string) => Promise<void>;
  authError: string | null;
  loading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onGoogleLogin, 
  onGuestLogin, 
  onEmailAuth,
  authError,
  loading 
}) => {
  const [authMode, setAuthMode] = useState<'selection' | 'email'>('selection');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent(isLogin ? 'login' : 'sign_up', { method: 'email' });
    await onEmailAuth(e, isLogin ? 'login' : 'signup', email, password);
  };

  const handleGoogleLogin = () => {
      trackEvent('login', { method: 'google' });
      onGoogleLogin();
  };

  const handleGuestLogin = () => {
      trackEvent('login', { method: 'guest' });
      onGuestLogin();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-md bg-surface border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-8 pb-0 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-xl">Ai</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to OmniChat</h2>
          <p className="text-slate-400 text-sm">Sign in to save your history and unlock full features.</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {authError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-start gap-2">
              <Shield size={16} className="mt-0.5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'selection' ? (
            <div className="space-y-3">
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12.5C2.03 18.2 6.42 23 12.1 23c5.83 0 10.13-5.07 10.13-11.43c0-.77-.06-1.1-.11-1.47z"/></svg>
                Continue with Google
              </button>

              <button 
                onClick={() => setAuthMode('email')}
                disabled={loading}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl font-medium transition-all flex items-center justify-center gap-3 group"
              >
                <Mail size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                Continue with Email
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-slate-500">Optional</span></div>
              </div>

              <button 
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-700 border-dashed rounded-xl font-medium transition-colors flex items-center justify-center gap-3"
              >
                <UserCircle size={20} />
                Continue as Guest
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4 animate-[slideIn_0.2s_ease-out]">
              <div className="flex items-center justify-between mb-4">
                <button 
                  type="button" 
                  onClick={() => setAuthMode('selection')} 
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  ← Back to options
                </button>
                <div className="text-xs text-slate-500">
                  {isLogin ? "No account?" : "Have an account?"}
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-1 text-indigo-400 hover:underline">
                    {isLogin ? "Sign up" : "Log in"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
                By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
      </div>
    </div>
  );
};
