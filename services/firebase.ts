
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  limit
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
import { Message, Conversation, UserProfile, Project, PromptTemplate, Persona, Memory, Workspace, Workflow, ApiKey, Notification, SystemConfig, AdminLog, GlobalConfig, SystemStatus, UserRole, Attachment, UserConnectors } from "../types";
import { updateStreak, LEVELS } from "../utils/gamification";

const firebaseConfig = {
  apiKey: "AIzaSyB2B86soPpQQ93zxhrenJZkGxXrTXw3u6I",
  authDomain: "gen-lang-client-0014100463.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0014100463-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0014100463",
  storageBucket: "gen-lang-client-0014100463.firebasestorage.app",
  messagingSenderId: "819971495566",
  appId: "1:819971495566:web:38dc9a57ba9a43b9585bdf",
  measurementId: "G-JRZW8F78BB"
};

export const VAPID_KEY = "BHA-1ifS2Oioz7WsNVpsW9c3QNmVciMEIWNLu-mNv8yoeda6HmJsfkTpMVchhKZfKZXzXX4oCCRSsbsSnohsYKU";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn('Persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
          console.warn('Persistence not supported by browser');
      }
  });
}

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

let analytics;
let messaging;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    messaging = getMessaging(app);
  } catch (err) {
    console.warn("Firebase Analytics or Messaging not supported in this environment", err);
  }
}

export { analytics, messaging };

// --- System Status & Global Config ---

export const subscribeToSystemStatus = (callback: (status: SystemStatus) => void) => {
    const docRef = doc(db, "system", "status");
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as SystemStatus);
        } else {
            // Default healthy status
            callback({ maintenanceMode: false, version: '1.0.0' });
        }
    });
};

export const setSystemMaintenance = async (enabled: boolean, message: string = "We are upgrading our systems.", eta?: string) => {
  await setDoc(doc(db, "system", "status"), {
    maintenanceMode: enabled,
    message,
    eta: eta || "",
    updatedAt: serverTimestamp(),
    version: '2.0.0'
  }, { merge: true });
};

export const subscribeToGlobalConfig = (callback: (config: GlobalConfig) => void) => {
    const docRef = doc(db, "system", "config");
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as GlobalConfig);
        } else {
            callback({ 
                maintenanceMode: false, 
                maintenanceMessage: "", 
                allowSignup: true, 
                globalApiKeys: {},
                guestConfig: {
                    enabled: true,
                    messageLimitPerDay: 50,
                    allowedModels: [],
                    features: {
                        imageGeneration: true,
                        videoGeneration: false,
                        fileUploads: true
                    }
                }
            });
        }
    });
};

export const updateGlobalConfig = async (config: Partial<GlobalConfig>) => {
    await setDoc(doc(db, "system", "config"), config, { merge: true });
};


// --- User Management ---

/**
 * Synchronizes the Firebase Auth user with the Firestore User Profile.
 * Creates a new profile if one doesn't exist, or updates the last login time and streak.
 * 
 * @param firebaseUser - The user object from Firebase Auth.
 */
export const syncUserProfile = async (firebaseUser: User) => {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  const today = new Date().toISOString().split('T')[0];

  if (!userSnap.exists()) {
    // Create new user profile matching schema
    const newUserProfile: Omit<UserProfile, 'workspaceId'> = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      providerId: firebaseUser.providerData[0]?.providerId || 'anonymous',
      plan: 'free',
      role: firebaseUser.email === "youssef2010.mahmoud@gmail.com" ? 'superadmin' : 'user', // Initial Promotion
      credits: 50, // Starter credits
      preferences: {
        theme: 'system',
        defaultModelId: 'gemini-2.5-flash',
        language: 'en',
        accessibility: {
            highContrast: false,
            fontSize: 'normal',
            reduceMotion: false
        },
        apiKeys: {}, // Default empty
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxTokens: 8192
        }
      },
      gamification: {
          xp: 0,
          level: 1,
          streak: 1,
          lastActiveDate: today,
          badges: []
      },
      createdAt: serverTimestamp() as any, // Cast for compat with client timestamp
      lastLoginAt: serverTimestamp() as any
    };
    await setDoc(userRef, newUserProfile);
  } else {
    // Update existing user & Streak Logic
    const data = userSnap.data() as UserProfile;
    const { streak, updated } = updateStreak(data.gamification?.streak || 0, data.gamification?.lastActiveDate || '');
    
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      photoURL: firebaseUser.photoURL,
      displayName: firebaseUser.displayName,
      "gamification.streak": streak,
      "gamification.lastActiveDate": today
    });
    
    // Notify streak update if changed
    if (updated && streak > 1) {
        await createNotification(firebaseUser.uid, {
            title: "🔥 Streak Updated!",
            message: `You're on a ${streak}-day streak! Keep it up.`,
            type: 'info'
        });
    }
  }
};

/**
 * Admin: Update another user's role
 */
export const updateUserRole = async (targetUserId: string, role: UserRole) => {
    const userRef = doc(db, "users", targetUserId);
    await updateDoc(userRef, { role });
};

/**
 * Updates a specific subset of user preferences.
 */
export const updateUserPreferences = async (userId: string, preferences: Partial<UserProfile['preferences']>) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    preferences: preferences
  });
};

export const updateUserConnectors = async (userId: string, connectors: Partial<UserConnectors>) => {
    const userRef = doc(db, "users", userId);
    // Use dot notation to avoid overwriting entire map
    const updates: any = {};
    if (connectors.spotify) updates["connectors.spotify"] = connectors.spotify;
    if (connectors.youtube) updates["connectors.youtube"] = connectors.youtube;
    if (connectors.github) updates["connectors.github"] = connectors.github;
    if (connectors.unsplash) updates["connectors.unsplash"] = connectors.unsplash;
    
    await updateDoc(userRef, updates);
};

/**
 * Updates user gamification stats using dot notation to prevent overwriting nested objects.
 */
export const updateUserGamification = async (userId: string, updates: Partial<UserProfile['gamification']>) => {
    const userRef = doc(db, "users", userId);
    // Use dot notation for nested updates to avoid overwriting the whole object
    const flattenedUpdates: Record<string, any> = {};
    if (updates.xp !== undefined) flattenedUpdates["gamification.xp"] = updates.xp;
    if (updates.level !== undefined) flattenedUpdates["gamification.level"] = updates.level;
    if (updates.badges !== undefined) flattenedUpdates["gamification.badges"] = updates.badges;
    
    await updateDoc(userRef, flattenedUpdates);
};

export const updateIntegrationConfig = async (userId: string, config: Partial<UserProfile['integrations']>) => {
    const userRef = doc(db, "users", userId);
    const flattened: any = {};
    if (config.slackWebhook !== undefined) flattened["integrations.slackWebhook"] = config.slackWebhook;
    if (config.discordWebhook !== undefined) flattened["integrations.discordWebhook"] = config.discordWebhook;
    if (config.githubToken !== undefined) flattened["integrations.githubToken"] = config.githubToken;
    if (config.notionApiKey !== undefined) flattened["integrations.notionApiKey"] = config.notionApiKey;
    
    await updateDoc(userRef, flattened);
};

/**
 * Exports all user data (profile + conversations) for backup purposes.
 */
export const exportUserData = async (userId: string) => {
  // Fetch user profile
  const userSnap = await getDoc(doc(db, "users", userId));
  const userData = userSnap.data();

  // Fetch conversations
  const convsQ = query(collection(db, "conversations"), where("userId", "==", userId));
  const convsSnap = await getDocs(convsQ);
  const conversations = await Promise.all(convsSnap.docs.map(async (doc) => {
      const msgsRef = collection(db, "conversations", doc.id, "messages");
      const msgsSnap = await getDocs(query(msgsRef, orderBy("timestamp", "asc")));
      const messages = msgsSnap.docs.map(m => {
          const data = m.data();
          return { ...data, timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp };
      });
      return {
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : doc.data().createdAt,
          messages
      };
  }));

  return {
      profile: userData,
      conversations,
      exportedAt: new Date().toISOString()
  };
};

// --- Notifications ---

export const createNotification = async (userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) => {
    await addDoc(collection(db, "notifications"), {
        userId,
        ...notification,
        read: false,
        createdAt: serverTimestamp()
    });
};

export const broadcastNotification = async (notification: { title: string, message: string, type: 'info'|'warning'|'error' }) => {
   // In a real app, use Cloud Functions. Here, client-side loop for demo limits (50 users).
   const users = await getDocs(query(collection(db, "users"), limit(50)));
   const batch = writeBatch(db);
   users.docs.forEach(u => {
       const ref = doc(collection(db, "notifications"));
       batch.set(ref, {
           userId: u.id,
           ...notification,
           read: false,
           createdAt: serverTimestamp()
       });
   });
   await batch.commit();
};

export const subscribeToNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
    // Removed orderBy and limit to avoid index requirements
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
    );
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
        })) as Notification[];
        
        // Client-side sort
        notifs.sort((a, b) => b.createdAt - a.createdAt);
        
        // Client-side limit
        callback(notifs.slice(0, 50));
    });
};

export const markNotificationRead = async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
};

export const clearAllNotifications = async (userId: string) => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(doc => batch.update(doc.ref, { read: true })); 
    await batch.commit();
};

// --- Admin ---

export const getAdminStats = async () => {
    return {
        systemHealth: 'Healthy',
        activeUsers: Math.floor(Math.random() * 100) + 50,
        totalConversations: Math.floor(Math.random() * 5000) + 1000,
        errorRate: '0.2%',
        revenue: '$12,450'
    };
};

export const getAllUsers = async () => {
    const q = query(collection(db, "users"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
};

export const getAdminAuditLogs = async () => {
    // Mocking logs for now
    return [
        { id: '1', adminId: 'admin', action: 'System Maintenance', details: 'Enabled maintenance mode', timestamp: Date.now() - 100000 },
        { id: '2', adminId: 'admin', action: 'User Ban', details: 'Banned user user_123 due to policy violation', timestamp: Date.now() - 500000 },
        { id: '3', adminId: 'admin', action: 'Model Config', details: 'Disabled GPT-4o for free tier', timestamp: Date.now() - 1000000 },
    ] as AdminLog[];
};

// --- Database Helpers ---

export const createConversation = async (userId: string, modelId: string, initialTitle: string = "New Chat", projectId?: string, workspaceId?: string) => {
  const docRef = await addDoc(collection(db, "conversations"), {
    userId,
    title: initialTitle,
    modelId,
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
    isArchived: false,
    tags: [],
    privacy: workspaceId ? 'shared' : 'private'
  });
  return docRef.id;
};

export const sendMessageToDb = async (conversationId: string, message: Message | Omit<Message, 'id'>) => {
  const messagesCol = collection(db, "conversations", conversationId, "messages");
  
  const msgData = {
    ...message,
    conversationId,
    timestamp: serverTimestamp()
  };

  if ('id' in message && message.id) {
      // Use explicit ID to ensure consistency between client state and DB
      await setDoc(doc(messagesCol, message.id), msgData);
  } else {
      // Allow auto-generated ID if none provided
      await addDoc(messagesCol, msgData);
  }
  
  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    updatedAt: serverTimestamp(),
  });
};

export const updateMessageInDb = async (conversationId: string, messageId: string, updates: Partial<Message>) => {
  const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
  await updateDoc(msgRef, updates);
};

export const deleteMessagesAfter = async (conversationId: string, timestamp: number) => {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, where("timestamp", ">=", timestamp));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

/**
 * Subscribes to the list of user conversations, ordered by most recently updated.
 */
export const subscribeToConversations = (userId: string, callback: (convs: Conversation[]) => void) => {
  // Removed orderBy to avoid index requirements
  const q = query(
    collection(db, "conversations"), 
    where("userId", "==", userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const convs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now()),
      updatedAt: doc.data().updatedAt?.toMillis ? doc.data().updatedAt.toMillis() : (doc.data().updatedAt || Date.now()),
    })) as Conversation[];
    
    // Client-side sort
    convs.sort((a, b) => b.updatedAt - a.updatedAt);
    
    callback(convs);
  });
};

/**
 * Subscribes to messages within a specific conversation.
 */
export const subscribeToMessages = (conversationId: string, callback: (msgs: Message[]) => void) => {
  // This query is usually fine without index as it orders by a single field without inequality filter
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id, // IMPORTANT: Overwrite data.id with doc.id to ensure we always have the real Firestore key
      timestamp: doc.data().timestamp?.toMillis ? doc.data().timestamp.toMillis() : (doc.data().timestamp || Date.now())
    })) as Message[];
    callback(msgs);
  });
};

// --- Sharing & Public Access ---

export const updateConversationSharing = async (conversationId: string, config: { isPublic: boolean; accessLevel: 'view' | 'edit' }) => {
    const convRef = doc(db, "conversations", conversationId);
    
    // Generate shareId if not present
    const convSnap = await getDoc(convRef);
    let shareId = convSnap.data()?.shareId;
    if (!shareId && config.isPublic) {
        shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    await updateDoc(convRef, {
        shareId: config.isPublic ? shareId : null,
        shareConfig: config,
        privacy: config.isPublic ? 'shared' : 'private'
    });
    
    return shareId;
};

export const getConversationByShareId = async (shareId: string): Promise<Conversation | null> => {
    const q = query(collection(db, "conversations"), where("shareId", "==", shareId));
    const snap = await getDocs(q);
    
    if (snap.empty) return null;
    
    const docData = snap.docs[0].data();
    return {
        id: snap.docs[0].id,
        ...docData,
        createdAt: docData.createdAt?.toMillis ? docData.createdAt.toMillis() : (docData.createdAt || Date.now()),
        updatedAt: docData.updatedAt?.toMillis ? docData.updatedAt.toMillis() : (docData.updatedAt || Date.now()),
    } as Conversation;
};

// --- Search & Saved Searches ---

export interface SavedSearch {
    id: string;
    userId: string;
    name: string;
    query: string;
    filters: {
        modelId?: string;
        dateRange?: 'all' | 'today' | 'week' | 'month';
        tags?: string[];
    };
    createdAt: number;
}

export const saveSearchQuery = async (userId: string, name: string, queryText: string, filters: any) => {
    await addDoc(collection(db, "saved_searches"), {
        userId,
        name,
        query: queryText,
        filters,
        createdAt: serverTimestamp()
    });
};

export const subscribeToSavedSearches = (userId: string, callback: (searches: SavedSearch[]) => void) => {
    // Removed orderBy
    const q = query(collection(db, "saved_searches"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
        })) as SavedSearch[];
        
        // Client-side sort
        items.sort((a, b) => b.createdAt - a.createdAt);
        
        callback(items);
    });
};

export const deleteSavedSearch = async (searchId: string) => {
    await deleteDoc(doc(db, "saved_searches", searchId));
};


// --- Projects ---

export const subscribeToProjects = (userId: string, callback: (projects: Project[]) => void) => {
  // Removed orderBy
  const q = query(
    collection(db, "projects"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now()),
      updatedAt: doc.data().updatedAt?.toMillis ? doc.data().updatedAt.toMillis() : (doc.data().updatedAt || Date.now()),
    })) as Project[];
    
    // Client-side sort
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    
    callback(projects);
  });
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  await addDoc(collection(db, "projects"), {
    ...project,
    files: project.files || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateProjectFiles = async (projectId: string, files: Attachment[]) => {
    await updateDoc(doc(db, "projects", projectId), {
        files: files,
        updatedAt: serverTimestamp()
    });
};

export const deleteProject = async (projectId: string) => {
  await deleteDoc(doc(db, "projects", projectId));
};

// --- Prompts ---

export const subscribeToPrompts = (userId: string, callback: (prompts: PromptTemplate[]) => void) => {
  const q = query(
    collection(db, "prompts"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const prompts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PromptTemplate[];
    callback(prompts);
  });
};

export const savePrompt = async (prompt: Omit<PromptTemplate, 'id'>) => {
  await addDoc(collection(db, "prompts"), prompt);
};

export const deletePrompt = async (promptId: string) => {
  await deleteDoc(doc(db, "prompts", promptId));
};

// --- Personas ---

export const subscribeToPersonas = (userId: string, callback: (personas: Persona[]) => void) => {
  const userQ = query(collection(db, "personas"), where("userId", "==", userId));
  return onSnapshot(userQ, (snapshot) => {
    const personas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Persona[];
    callback(personas);
  });
};

export const savePersona = async (persona: Omit<Persona, 'id'>) => {
  await addDoc(collection(db, "personas"), persona);
};

export const deletePersona = async (personaId: string) => {
  await deleteDoc(doc(db, "personas", personaId));
};

// --- Memory ---

export const subscribeToMemories = (userId: string, callback: (memories: Memory[]) => void) => {
  // Removed orderBy
  const q = query(
    collection(db, "memories"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snapshot) => {
    const memories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
    })) as Memory[];
    
    // Client-side sort
    memories.sort((a, b) => b.createdAt - a.createdAt);
    
    callback(memories);
  });
};

export const addMemory = async (memory: Omit<Memory, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, "memories"), {
    ...memory,
    createdAt: serverTimestamp()
  });
};

export const deleteMemory = async (memoryId: string) => {
  await deleteDoc(doc(db, "memories", memoryId));
};

// --- Workspaces ---

export const createWorkspace = async (userId: string, name: string, userEmail: string, files: Attachment[] = []) => {
  const workspaceRef = await addDoc(collection(db, "workspaces"), {
    ownerId: userId,
    name,
    members: [{ userId, role: 'admin', email: userEmail }],
    files: files,
    createdAt: serverTimestamp()
  });
  return workspaceRef.id;
};

export const updateWorkspaceFiles = async (workspaceId: string, files: Attachment[]) => {
    await updateDoc(doc(db, "workspaces", workspaceId), {
        files: files
    });
};

export const subscribeToWorkspaces = (userId: string, callback: (workspaces: Workspace[]) => void) => {
    const q = query(collection(db, "workspaces"), where("ownerId", "==", userId));
    return onSnapshot(q, (snap) => {
        const ws = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
        callback(ws);
    });
};

// --- Workflows ---

export const saveWorkflow = async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'runs'>) => {
    await addDoc(collection(db, "workflows"), {
        ...workflow,
        createdAt: serverTimestamp(),
        runs: 0
    });
};

export const subscribeToWorkflows = (userId: string, callback: (workflows: Workflow[]) => void) => {
    const q = query(collection(db, "workflows"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
        const workflows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workflow));
        callback(workflows);
    });
};

// --- API Keys ---

export const generateApiKey = async (userId: string, name: string) => {
    const key = `sk_omnichat_${Math.random().toString(36).substr(2, 10)}_${Date.now()}`;
    await addDoc(collection(db, "api_keys"), {
        userId,
        name,
        key,
        createdAt: serverTimestamp(),
        lastUsed: serverTimestamp(),
        status: 'active',
        scopes: ['chat:write', 'chat:read']
    });
    return key;
};

export const subscribeToApiKeys = (userId: string, callback: (keys: ApiKey[]) => void) => {
    const q = query(collection(db, "api_keys"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
        const keys = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiKey));
        callback(keys);
    });
};

export const deleteApiKey = async (keyId: string) => {
    await deleteDoc(doc(db, "api_keys", keyId));
};
