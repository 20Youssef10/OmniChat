
export type Role = 'user' | 'model' | 'system';
export type UserRole = 'user' | 'admin' | 'superadmin';

export interface UserApiKeys {
  google?: string;
  openai?: string;
  anthropic?: string;
  deepseek?: string;
  groq?: string;
}

export interface GenerationConfig {
  temperature: number; // 0.0 to 2.0
  topP: number;
  maxTokens: number;
  globalSystemPrompt?: string; // Appended to all chats
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultModelId: string;
  language: 'en' | 'es' | 'ar';
  accessibility: {
    highContrast: boolean;
    fontSize: 'normal' | 'large' | 'xl';
    reduceMotion: boolean;
  };
  // New: User-defined API keys
  apiKeys?: UserApiKeys;
  // New: Generation settings
  generationConfig?: GenerationConfig;
}

export interface UserSettings {
  // Deprecated in favor of preferences.generationConfig, keeping for backward compat if needed
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement';
  read: boolean;
  createdAt: number;
  link?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  phoneNumber?: string | null; // Added
  displayName: string | null;
  photoURL: string | null;
  bio?: string; // Added
  providerId: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  role: UserRole; // Added Role
  credits: number;
  preferences: UserPreferences;
  settings?: UserSettings;
  createdAt: number;
  lastLoginAt: number;
  workspaceId?: string;
  
  // Gamification
  gamification: {
    xp: number;
    level: number;
    streak: number;
    lastActiveDate: string; // YYYY-MM-DD
    badges: string[]; // Array of Achievement IDs
  };

  // Integrations
  integrations?: {
    slackWebhook?: string;
    discordWebhook?: string;
    notionApiKey?: string;
    githubToken?: string;
  };
}

export interface Attachment {
  type: 'image' | 'file';
  url: string; // Base64 or Storage URL
  name?: string;
  mimeType?: string;
  size?: number;
  storagePath?: string; // Firebase Storage path
  extractedText?: string; // Text content extracted from file
}

export interface Message {
  id: string;
  conversationId?: string;
  userId?: string;
  role: Role;
  content: string;
  model?: string;
  timestamp: number;
  attachments?: Attachment[];
  thinking?: boolean;
  error?: boolean;
  
  // Interaction
  rating?: 'like' | 'dislike';
  isBookmarked?: boolean;
  
  // Rich Content & Metadata
  videoUrl?: string;
  imageUrl?: string;
  groundingMetadata?: any;
  
  // Analytics
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  cost?: number;
  latency?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  modelId: string; 
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  
  // Organization
  tags: string[];
  folderId?: string;
  projectId?: string; // Link to Project
  isArchived: boolean;
  privacy: 'private' | 'shared';
  workspaceId?: string;
  sharedWith?: string[]; // Array of User IDs
  
  // Public Sharing
  shareId?: string; // Unique ID for public link
  shareConfig?: {
      isPublic: boolean;
      accessLevel: 'view' | 'edit';
  };
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  customInstructions?: string;
  files?: Attachment[]; // Reference files for context
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface PromptTemplate {
  id: string;
  userId?: string; // Optional if public
  name: string;
  category: 'writing' | 'coding' | 'analysis' | 'other';
  content: string; // The prompt text with {{variables}}
  description?: string;
  isPublic?: boolean;
}

export interface Persona {
  id: string;
  userId?: string; // null for system presets
  name: string;
  description: string;
  systemPrompt: string;
  avatar?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'academic';
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category: 'preference' | 'fact' | 'summary';
  createdAt: number;
}

export interface Artifact {
  id: string;
  type: 'code' | 'html' | 'svg' | 'mermaid' | 'markdown';
  title: string;
  content: string;
  language?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'Google' | 'OpenAI' | 'Anthropic' | 'DeepSeek' | 'Groq';
  description: string;
  capabilities: ('text' | 'image' | 'code' | 'video' | 'search' | 'maps' | 'reasoning' | 'speech')[];
  maxTokens?: number;
  icon: string;
  isPaid?: boolean;
}

export interface Workspace {
    id: string;
    ownerId: string;
    name: string;
    members: {
        userId: string;
        role: 'admin' | 'editor' | 'viewer';
        email: string;
    }[];
    files?: Attachment[]; // Added: Knowledge base for workspace
    createdAt: number;
}

export interface WorkflowStep {
    id: string;
    type: 'prompt' | 'delay';
    content: string; // Prompt text or delay ms
    modelId?: string;
}

export interface Workflow {
    id: string;
    userId: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    createdAt: number;
    runs?: number;
}

export interface ApiKey {
    id: string;
    userId: string;
    key: string;
    name: string;
    createdAt: number;
    lastUsed: number;
    status: 'active' | 'revoked';
    scopes: string[];
}

export interface GuestConfig {
    enabled: boolean;
    messageLimitPerDay: number;
    allowedModels: string[]; // Empty means all
    features: {
        imageGeneration: boolean;
        videoGeneration: boolean;
        fileUploads: boolean;
    };
}

export interface GlobalConfig {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowSignup: boolean;
    // Admin defined keys that are used if user doesn't provide their own
    globalApiKeys?: UserApiKeys; 
    guestConfig?: GuestConfig;
    announcement?: string;
}

export interface SystemConfig extends GlobalConfig {
    defaultModel: string;
    enabledModels: string[];
}

export interface AdminLog {
    id: string;
    adminId: string;
    action: string;
    targetId?: string;
    details: string;
    timestamp: number;
}

export interface SystemStatus {
    maintenanceMode: boolean;
    message?: string;
    eta?: string;
    version: string;
}

// --- Global Type Extensions ---
declare global {
  // Define AIStudio interface to satisfy subsequent property declaration requirement
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    loadPyodide: any; // Added for Pyodide
    aistudio?: AIStudio;
  }
}
