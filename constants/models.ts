
import { AIModel } from "../types";

export const AVAILABLE_MODELS: AIModel[] = [
  // --- Google Gemini ---
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'Fast, low-latency multimodal model ideal for high-frequency tasks, summaries, and real-time chat.',
    capabilities: ['text', 'image', 'code', 'maps'],
    maxTokens: 1000000,
    icon: '⚡'
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    description: 'Google\'s most capable model for complex reasoning, advanced coding, and multi-step workflows.',
    capabilities: ['text', 'image', 'code', 'reasoning'],
    icon: '🧠'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    description: 'Optimized for speed and cost, featuring Google Search grounding for up-to-date real-world information.',
    capabilities: ['text', 'search'],
    icon: '🌐'
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'Google',
    description: 'Efficient model specialized for general-purpose image generation and quick editing tasks.',
    capabilities: ['image'],
    icon: '🖼️'
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    provider: 'Google',
    description: 'Premium model for generating high-fidelity, photorealistic images with complex prompts.',
    capabilities: ['image'],
    icon: '🎨',
    isPaid: true
  },
  {
    id: 'veo-3.1-fast-generate-preview',
    name: 'Veo 3.1 Fast',
    provider: 'Google',
    description: 'Rapid video generation model perfect for quick drafts, social media content, and prototyping (720p).',
    capabilities: ['video'],
    icon: '🎥',
    isPaid: true
  },
  {
    id: 'veo-3.1-generate-preview',
    name: 'Veo 3.1 High-Quality',
    provider: 'Google',
    description: 'Professional-grade video generation model for high-definition content creation (1080p).',
    capabilities: ['video'],
    icon: '🎬',
    isPaid: true
  },
  
  // --- OpenAI ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Flagship omni model offering top-tier performance across text, audio, and vision benchmarks.',
    capabilities: ['text', 'image', 'code'],
    icon: '🟢'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Affordable and lightweight model, perfect for simple tasks, chat bots, and high-volume applications.',
    capabilities: ['text', 'code'],
    icon: '🔹'
  },
  {
    id: 'o1-preview',
    name: 'o1 Preview',
    provider: 'OpenAI',
    description: 'Specialized reasoning model designed to "think" before answering, excelling in math, science, and logic.',
    capabilities: ['text', 'reasoning'],
    icon: '🤯'
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'OpenAI',
    description: 'Faster, cost-effective reasoning model optimized for coding and STEM tasks without broad world knowledge.',
    capabilities: ['text', 'reasoning', 'code'],
    icon: '🏎️'
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'State-of-the-art image generation model known for adhering closely to complex prompt descriptions.',
    capabilities: ['image'],
    icon: '🖌️'
  },

  // --- Anthropic ---
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced intelligence and speed, exceptional at coding, nuances, and creative writing.',
    capabilities: ['text', 'image', 'code'],
    icon: '🎭'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Top-tier model for open-ended research, strategy, and complex analysis requiring high cognitive capability.',
    capabilities: ['text', 'code'],
    icon: '🎩'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    description: 'Extremely fast and compact model, optimized for near-instant responses and simple queries.',
    capabilities: ['text'],
    icon: '💨'
  },

  // --- DeepSeek ---
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Strong general-purpose model with excellent performance in both Chinese and English contexts.',
    capabilities: ['text', 'code'],
    icon: '🤖'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Reasoning-focused model capable of chain-of-thought processing for logic puzzles and math.',
    capabilities: ['text', 'reasoning'],
    icon: '🤔'
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'DeepSeek',
    description: 'Domain-specific model trained on vast codebases, perfect for debugging and generation.',
    capabilities: ['text', 'code'],
    icon: '💻'
  },

  // --- Groq ---
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'Groq',
    description: 'Meta\'s powerful open-source model running at lightning speeds, great for general language tasks.',
    capabilities: ['text'],
    icon: '🦙'
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'Groq',
    description: 'High-performance Mixture-of-Experts model, offering a great balance of quality and inference speed.',
    capabilities: ['text'],
    icon: '🌪️'
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'Groq',
    description: 'Lightweight Google model optimized for speed and efficiency on smaller tasks.',
    capabilities: ['text'],
    icon: '💎'
  }
];
