
import React, { createContext, useContext, useEffect, useState, ReactNode, startTransition } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, syncUserProfile, subscribeToGlobalConfig } from '../services/firebase';
import { UserProfile, Persona, Memory, Artifact, GlobalConfig, Conversation } from '../types';
import { AVAILABLE_MODELS } from '../constants/models';

interface AppState {
  // Auth
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  setLocalUser: (user: UserProfile | null) => void;
  
  // UI State
  isSidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isScratchpadOpen: boolean; // New
  setScratchpadOpen: (v: boolean) => void; // New
  isFocusMode: boolean; // New
  setFocusMode: (v: boolean) => void; // New
  modals: {
      auth: boolean;
      settings: boolean;
      projects: boolean;
      prompts: boolean;
      personas: boolean;
      memories: boolean;
      analytics: boolean;
      workflow: boolean;
      workspace: boolean;
      search: boolean;
      admin: boolean;
      profile: boolean;
      info: boolean;
      share: boolean;
  };
  openModal: (modal: keyof AppState['modals']) => void;
  closeModal: (modal: keyof AppState['modals']) => void;
  
  // Feature State (Global prefs that persist in session)
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  isComparisonMode: boolean;
  toggleComparisonMode: () => void;
  currentPersona: Persona | null;
  setCurrentPersona: (p: Persona | null) => void;
  currentArtifact: Artifact | null;
  setCurrentArtifact: (a: Artifact | null) => void;
  isTemporaryChat: boolean; 
  setTemporaryChat: (v: boolean) => void; 
  
  // Shared Context
  sharedConversation: Conversation | null;
  setSharedConversation: (c: Conversation | null) => void;

  // Config
  globalConfig: GlobalConfig | null;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [localUser, setLocalUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // UI
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isScratchpadOpen, setScratchpadOpen] = useState(false); // New
  const [isFocusMode, setFocusMode] = useState(false); // New
  const [modals, setModals] = useState({
      auth: false,
      settings: false,
      projects: false,
      prompts: false,
      personas: false,
      memories: false,
      analytics: false,
      workflow: false,
      workspace: false,
      search: false,
      admin: false,
      profile: false,
      info: false,
      share: false
  });

  // Feature
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(['gemini-2.5-flash']);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isTemporaryChat, setTemporaryChat] = useState(false);
  const [sharedConversation, setSharedConversation] = useState<Conversation | null>(null);
  
  // Config
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
        setFirebaseUser(fUser);
        if (fUser) {
            try {
                await syncUserProfile(fUser);
            } catch (e) { console.error(e); }
        } else if (!localUser) {
            setUser(null);
        }
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // User Profile Sync (Firebase)
  useEffect(() => {
    if (firebaseUser) {
        const unsub = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
            if(docSnap.exists()) {
                setUser(prev => ({ ...prev, ...(docSnap.data() as UserProfile) }));
            }
        });
        return () => unsub();
    }
  }, [firebaseUser]);

  // Local User Sync (Fallback)
  useEffect(() => {
      if (!firebaseUser && localUser) {
          setUser(localUser);
      }
  }, [firebaseUser, localUser]);

  // Global Config Sync
  useEffect(() => {
    const unsub = subscribeToGlobalConfig(setGlobalConfig);
    return () => unsub();
  }, []);

  // Global Styles Effect
  useEffect(() => {
    if (!user) return;
    if (user.preferences.language === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
    } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = user.preferences.language || 'en';
    }
    if (user.preferences.accessibility?.highContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    document.body.classList.remove('font-large', 'font-xl');
    if (user.preferences.accessibility?.fontSize === 'large') document.body.classList.add('font-large');
    if (user.preferences.accessibility?.fontSize === 'xl') document.body.classList.add('font-xl');
  }, [user]);

  const openModal = (modal: keyof typeof modals) => {
      startTransition(() => {
          setModals(prev => ({ ...prev, [modal]: true }));
      });
  };

  const closeModal = (modal: keyof typeof modals) => {
      startTransition(() => {
          setModals(prev => ({ ...prev, [modal]: false }));
      });
  };

  const toggleComparisonMode = () => {
    setIsComparisonMode(prev => {
        const next = !prev;
        if (!next) setSelectedModelIds(curr => [curr[0]]);
        return next;
    });
  };

  return (
    <AppContext.Provider value={{
      user, firebaseUser, authLoading, setLocalUser,
      isSidebarOpen, setSidebarOpen,
      isScratchpadOpen, setScratchpadOpen,
      isFocusMode, setFocusMode,
      modals, openModal, closeModal,
      selectedModelIds, setSelectedModelIds,
      isComparisonMode, toggleComparisonMode,
      currentPersona, setCurrentPersona,
      currentArtifact, setCurrentArtifact,
      globalConfig,
      isTemporaryChat, setTemporaryChat,
      sharedConversation, setSharedConversation
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
