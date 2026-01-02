import { UserProfile, Achievement } from "../types";

export const LEVELS = [
    { level: 1, xp: 0, title: "Novice" },
    { level: 2, xp: 100, title: "Explorer" },
    { level: 3, xp: 300, title: "Apprentice" },
    { level: 4, xp: 600, title: "Prompter" },
    { level: 5, xp: 1000, title: "Specialist" },
    { level: 6, xp: 1500, title: "Expert" },
    { level: 7, xp: 2200, title: "Master" },
    { level: 8, xp: 3000, title: "Grandmaster" },
    { level: 9, xp: 4000, title: "Visionary" },
    { level: 10, xp: 5500, title: "Omniscient" }
];

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_chat', name: 'First Contact', description: 'Start your first conversation.', icon: '👋', xpReward: 50 },
    { id: 'streak_3', name: 'Momentum', description: 'Maintain a 3-day streak.', icon: '🔥', xpReward: 100 },
    { id: 'streak_7', name: 'Unstoppable', description: 'Maintain a 7-day streak.', icon: '🚀', xpReward: 300 },
    { id: 'msg_100', name: 'Chatterbox', description: 'Send 100 messages.', icon: '💬', xpReward: 200 },
    { id: 'prompt_master', name: 'Prompt Engineer', description: 'Save 5 custom prompts.', icon: '🧠', xpReward: 150 }
];

export const calculateLevel = (xp: number) => {
    // Find the highest level where xp >= required xp
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xp) return LEVELS[i];
    }
    return LEVELS[0];
};

export const getNextLevel = (xp: number) => {
    for (let i = 0; i < LEVELS.length; i++) {
        if (xp < LEVELS[i].xp) return LEVELS[i];
    }
    return null; // Max level
};

export const checkAchievements = (user: UserProfile, stats: { totalMessages: number, savedPrompts: number }): Achievement[] => {
    const newUnlocked: Achievement[] = [];
    
    // Check milestones
    if (stats.totalMessages >= 1 && !user.gamification.badges.includes('first_chat')) {
        newUnlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_chat')!);
    }
    if (stats.totalMessages >= 100 && !user.gamification.badges.includes('msg_100')) {
        newUnlocked.push(ACHIEVEMENTS.find(a => a.id === 'msg_100')!);
    }
    if (user.gamification.streak >= 3 && !user.gamification.badges.includes('streak_3')) {
        newUnlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_3')!);
    }
    if (user.gamification.streak >= 7 && !user.gamification.badges.includes('streak_7')) {
        newUnlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_7')!);
    }
     if (stats.savedPrompts >= 5 && !user.gamification.badges.includes('prompt_master')) {
        newUnlocked.push(ACHIEVEMENTS.find(a => a.id === 'prompt_master')!);
    }

    return newUnlocked;
};

export const updateStreak = (currentStreak: number, lastActiveDate: string): { streak: number, updated: boolean } => {
    const today = new Date().toISOString().split('T')[0];
    if (today === lastActiveDate) return { streak: currentStreak, updated: false };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActiveDate === yesterdayStr) {
        return { streak: currentStreak + 1, updated: true };
    } else {
        // Streak broken
        return { streak: 1, updated: true };
    }
};