import { Conversation, Message } from "../types";

export interface SearchResult {
    id: string;
    type: 'conversation' | 'message';
    title: string;
    content: string; // Snippet or full content
    timestamp: number;
    score: number;
    metadata?: {
        conversationId?: string;
        modelId?: string;
        tags?: string[];
    };
    highlight?: {
        field: string;
        indices: [number, number][];
    };
}

export interface SearchFilters {
    modelId?: string;
    dateRange?: 'all' | 'today' | 'week' | 'month';
    tags?: string[];
}

/**
 * Calculates a search score based on term frequency and field weight.
 * Simulates semantic search by boosting exact matches and proximity.
 */
const calculateScore = (query: string, text: string, weight: number = 1): number => {
    if (!text) return 0;
    const normalizedQuery = query.toLowerCase();
    const normalizedText = text.toLowerCase();
    
    // Exact match boost
    if (normalizedText === normalizedQuery) return 100 * weight;
    if (normalizedText.includes(normalizedQuery)) {
        // Boost by proximity to start and length ratio
        const index = normalizedText.indexOf(normalizedQuery);
        const lengthScore = normalizedQuery.length / normalizedText.length;
        return (50 - Math.min(index, 40)) * weight + (lengthScore * 10);
    }

    // Term match
    const terms = normalizedQuery.split(' ').filter(t => t.length > 2);
    let matchCount = 0;
    for (const term of terms) {
        if (normalizedText.includes(term)) matchCount++;
    }
    
    return (matchCount / terms.length) * 20 * weight;
};

export const performSearch = (
    query: string,
    conversations: Conversation[],
    messages: Message[], // Note: Requires messages to be loaded or passed in context
    filters: SearchFilters = {}
): SearchResult[] => {
    if (!query.trim()) return [];

    let results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // 1. Search Conversations (Title)
    conversations.forEach(conv => {
        // Filter Checks
        if (filters.modelId && conv.modelId !== filters.modelId) return;
        if (filters.dateRange) {
            const date = new Date(conv.updatedAt);
            const now = new Date();
            if (filters.dateRange === 'today' && date.getDate() !== now.getDate()) return;
            // Simplified week/month logic
        }

        const score = calculateScore(lowerQuery, conv.title, 2.0); // 2x weight for titles
        if (score > 5) {
            results.push({
                id: conv.id,
                type: 'conversation',
                title: conv.title,
                content: `Started ${new Date(conv.createdAt).toLocaleDateString()}`,
                timestamp: conv.updatedAt,
                score,
                metadata: {
                    modelId: conv.modelId,
                    tags: conv.tags
                }
            });
        }
    });

    // 2. Search Messages
    messages.forEach(msg => {
         // Apply same filters (requires message to have model info or link to conv)
         if (filters.modelId && msg.model && msg.model !== filters.modelId) return;

         const score = calculateScore(lowerQuery, msg.content, 1.0);
         if (score > 5) {
             results.push({
                 id: msg.id,
                 type: 'message',
                 title: msg.role === 'user' ? 'You' : (msg.model || 'AI'),
                 content: msg.content,
                 timestamp: msg.timestamp,
                 score,
                 metadata: {
                     conversationId: msg.conversationId,
                     modelId: msg.model
                 }
             });
         }
    });

    // 3. Sort by Score
    return results.sort((a, b) => b.score - a.score);
};

export const generateSnippet = (content: string, query: string, maxLength: number = 100): string => {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');

    const start = Math.max(0, index - 20);
    const end = Math.min(content.length, index + query.length + 60);
    
    return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
};