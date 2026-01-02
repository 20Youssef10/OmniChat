
import { Attachment, UserApiKeys, GenerationConfig } from "../types";
import { streamGeminiResponse, generateVideo as generateGeminiVideo } from "./geminiService";
import { logger } from "../utils/logger";

// --- Types ---

export type StreamChunk = {
  text?: string;
  groundingMetadata?: any;
  usageMetadata?: any;
  error?: string;
};

// --- Helper Functions ---

/**
 * Performs an HTTP fetch with automatic retry logic for transient errors.
 */
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, backoff = 500): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    // Retry on rate limits (429) or server errors (5xx)
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
       const retryAfter = response.headers.get('Retry-After');
       const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff;
       await new Promise(resolve => setTimeout(resolve, waitTime));
       throw new Error(`Retryable error: ${response.status}`);
    }
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (retries > 0) {
      logger.warn(`API call failed, retrying (${retries} left)...`, { url, error: errorMessage });
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2); // Exponential backoff
    }
    logger.error(`API call failed after retries`, { url, error: errorMessage });
    throw error;
  }
};

// --- API Implementation ---

/**
 * Generates an image using OpenAI's DALL-E 3 model.
 * Note: DALL-E 3 generally requires OpenAI Key.
 */
export const generateImage = async (modelId: string, prompt: string, apiKey?: string): Promise<string> => {
  if (!apiKey) throw new Error("OpenAI API Key is required for DALL-E 3.");

  const response = await fetchWithRetry("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data[0].url;
};

/**
 * Generates a video using Google's Veo model.
 */
export const generateVideo = async (modelId: string, prompt: string, attachments: Attachment[]) => {
    // Only supporting Google Veo for video currently
    if (modelId.startsWith('veo')) {
        // Veo/Gemini calls use their own GoogleGenAI instance management in geminiService
        return generateGeminiVideo(modelId, prompt, attachments);
    }
    throw new Error("Video generation not supported for this model.");
};

/**
 * Streams AI responses from various providers.
 */
export const streamResponse = async function* (
  modelId: string,
  provider: string,
  history: { role: string; content: string }[],
  newMessage: string,
  attachments: Attachment[] = [],
  apiKeys?: UserApiKeys,
  generationConfig?: GenerationConfig
): AsyncGenerator<StreamChunk> {

  // 1. Google Gemini
  if (provider === 'Google') {
    const result = await streamGeminiResponse(modelId, history, newMessage, attachments, generationConfig);
    for await (const chunk of result.stream) {
      const text = chunk.text;
      let groundingMetadata = undefined;
      let usageMetadata = undefined;

      if (chunk.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = chunk.candidates[0].groundingMetadata;
      }
      
      if (chunk.usageMetadata) {
          usageMetadata = chunk.usageMetadata;
      }

      yield { text, groundingMetadata, usageMetadata };
    }
    return;
  }

  // 2. OpenAI / DeepSeek / Groq (OpenAI Compatible)
  if (provider === 'OpenAI' || provider === 'DeepSeek' || provider === 'Groq') {
    let baseUrl = "https://api.openai.com/v1";
    let apiKey = apiKeys?.openai || process.env.OPENAI_API_KEY;

    if (provider === 'DeepSeek') {
      baseUrl = "https://api.deepseek.com"; 
      apiKey = apiKeys?.deepseek || process.env.DEEPSEEK_API_KEY;
    } else if (provider === 'Groq') {
      baseUrl = "https://api.groq.com/openai/v1";
      apiKey = apiKeys?.groq || process.env.GROQ_API_KEY;
    }

    if (!apiKey) throw new Error(`${provider} API Key missing. Please check your settings.`);

    // o1 Model Handling
    const isO1 = modelId.startsWith('o1');

    // Format Messages
    let messages: any[] = [
      ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: newMessage }
    ];

    // Handle o1 Limitations (System roles often not supported or treated differently)
    if (isO1) {
        // Map system messages to user messages for o1 models as they don't support 'system' role
        messages = messages.map(m => m.role === 'system' ? { ...m, role: 'user', content: `[System Instruction]: ${m.content}` } : m);
    }

    // Handle Image Attachments (OpenAI GPT-4o only)
    if (provider === 'OpenAI' && !isO1 && attachments.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const contentParts: any[] = [{ type: "text", text: newMessage }];
        attachments.forEach(att => {
            if (att.type === 'image') {
                contentParts.push({
                    type: "image_url",
                    image_url: { url: att.url }
                });
            }
        });
        lastMsg.content = contentParts;
    }

    const requestBody: any = {
      model: modelId,
      messages: messages,
      stream: true
    };

    if (isO1) {
        // o1 models use max_completion_tokens
        requestBody.max_completion_tokens = generationConfig?.maxTokens ?? 65536;
        // Do NOT send temperature or top_p for o1 unless specific versions support it
    } else {
        requestBody.temperature = generationConfig?.temperature ?? 0.7;
        requestBody.max_tokens = generationConfig?.maxTokens ?? 4096;
        requestBody.top_p = generationConfig?.topP ?? 1.0;
        // Only include stream_options for providers that support it well
        if (provider === 'OpenAI' || provider === 'DeepSeek') {
             requestBody.stream_options = { include_usage: true };
        }
    }

    const endpoint = `${baseUrl}/chat/completions`;

    const response = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorMsg = "API Request Failed";
        try {
            const err = await response.json();
            errorMsg = err.error?.message || JSON.stringify(err);
        } catch (e) {
            errorMsg = `Status ${response.status}`;
        }
        throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("No response body");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line === 'data: [DONE]') return;
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.substring(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield { text: content };
            
            // Check for reasoning content (DeepSeek R1)
            const reasoning = json.choices?.[0]?.delta?.reasoning_content;
            if (reasoning) yield { text: `*Thinking: ${reasoning}*\n\n` };

            if (json.usage) {
                 yield { 
                    usageMetadata: { 
                        promptTokenCount: json.usage.prompt_tokens,
                        candidatesTokenCount: json.usage.completion_tokens,
                        totalTokenCount: json.usage.total_tokens
                    }
                 };
            }
          } catch (e) {
            console.error("Error parsing stream chunk", e);
          }
        }
      }
    }
    return;
  }

  // 3. Anthropic Claude
  if (provider === 'Anthropic') {
      const apiKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("Anthropic API Key missing.");

      const messages = [
        ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: newMessage }
      ];

      // Note: Anthropic API does not support CORS for browser requests. 
      // This will fail in a standard browser environment unless using a proxy.
      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
              "dangerously-allow-browser": "true" 
          },
          body: JSON.stringify({
              model: modelId,
              max_tokens: generationConfig?.maxTokens ?? 4096,
              temperature: generationConfig?.temperature ?? 0.7,
              messages: messages,
              stream: true
          })
      });

      if (!response.ok) {
        let errorMsg = "Anthropic API Request Failed";
        try {
            const err = await response.json();
            errorMsg = err.error?.message || JSON.stringify(err);
        } catch (e) { errorMsg = `Status ${response.status}`; }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim() !== '');

          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  try {
                      const json = JSON.parse(line.substring(6));
                      if (json.type === 'content_block_delta') {
                          yield { text: json.delta?.text || '' };
                      }
                      // Usage data is in 'message_stop' event usually
                  } catch(e) {}
              }
          }
      }
  }
};
