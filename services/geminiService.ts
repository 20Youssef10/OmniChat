
import { GoogleGenAI, Modality } from "@google/genai";
import { Attachment } from "../types";

// Helper to get the correct client
const getClient = async (isPaidModel: boolean = false) => {
  let apiKey = process.env.API_KEY;

  if (isPaidModel && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
    // The key is injected via environment in this context after selection
    apiKey = process.env.API_KEY; 
  }

  if (!apiKey) {
    console.error("API_KEY is missing.");
    throw new Error("API Key missing. Please set your Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateConversationTitle = async (userMessage: string, aiResponse: string): Promise<string> => {
    try {
        const ai = await getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a concise, engaging title (3-6 words) for this chat session based on the interaction. Avoid generic phrases like 'Conversation with' or 'Chat about'. Return only the title text.
            
User: ${userMessage.substring(0, 1000)}
AI: ${aiResponse.substring(0, 1000)}`,
            config: {
                maxOutputTokens: 20,
                temperature: 0.7
            }
        });
        return response.text?.trim() || "New Conversation";
    } catch (e) {
        console.warn("Title generation failed", e);
        return "New Conversation";
    }
};

export const generateVideo = async (
  modelId: string,
  prompt: string,
  attachments: Attachment[] = []
): Promise<string> => {
  
  const execute = async () => {
      const ai = await getClient(true); // Veo requires paid key selection

      // Basic config for Veo
      const config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' // Default
      };
      
      // Simple heuristic for aspect ratio based on prompt keywords
      if (prompt.toLowerCase().includes('portrait') || prompt.toLowerCase().includes('9:16')) {
        config.aspectRatio = '9:16';
      }

      // Handle image input for video generation if present
      let imageInput: any = undefined;
      const imageAttachment = attachments.find(a => a.type === 'image');
      if (imageAttachment) {
          // Check if data URL
          const match = imageAttachment.url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
              imageInput = {
                  imageBytes: match[2],
                  mimeType: match[1]
              };
          } else {
             // Try to fetch if it's a remote URL
             try {
                 const resp = await fetch(imageAttachment.url);
                 const blob = await resp.blob();
                 const base64 = await new Promise<string>((resolve) => {
                     const reader = new FileReader();
                     reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                     reader.readAsDataURL(blob);
                 });
                 imageInput = {
                     imageBytes: base64,
                     mimeType: blob.type
                 };
             } catch(e) {
                 console.warn("Failed to fetch image for video generation", e);
             }
          }
      }

      let operation = await ai.models.generateVideos({
        model: modelId,
        prompt: prompt,
        image: imageInput,
        config
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
        // Cast argument to any to bypass strict type check (SDK type definition mismatch)
        operation = await ai.operations.getVideosOperation({ operation } as any);
      }

      if (operation.error) {
        throw new Error(operation.error.message || "Video generation failed");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URI returned");

      // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
      return `${downloadLink}&key=${process.env.API_KEY}`;
  };

  try {
      return await execute();
  } catch (e: any) {
      const msg = e.message || JSON.stringify(e);
      // Retry if entity not found (likely expired/invalid key for project)
      if (window.aistudio && (msg.includes("Requested entity was not found") || msg.includes("404"))) {
          console.warn("Veo generation failed with 404. Retrying with new key selection...");
          await window.aistudio.openSelectKey();
          return await execute();
      }
      throw e;
  }
};

export const streamGeminiResponse = async (
  modelId: string,
  history: { role: string; content: string }[],
  newMessage: string,
  attachments: Attachment[] = []
) => {
  // Determine if we need paid key (for Pro Image)
  const isPaid = modelId === 'gemini-3-pro-image-preview';
  
  // 1. Prepare Payload (Data preparation does not need AI client)
  
  // Construct parts
  const parts: any[] = [{ text: newMessage }];
  
  // Handle attachments (images)
  for (const att of attachments) {
    if (att.type === 'image') {
      let base64Data = '';
      let mimeType = '';

      if (att.url.startsWith('data:')) {
        const match = att.url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      } else {
         // Fetch remote image (e.g. Firebase Storage)
         try {
             const resp = await fetch(att.url);
             if (resp.ok) {
                 const blob = await resp.blob();
                 mimeType = blob.type;
                 base64Data = await new Promise<string>((resolve) => {
                     const reader = new FileReader();
                     reader.onloadend = () => {
                         const res = reader.result as string;
                         resolve(res.split(',')[1]);
                     };
                     reader.readAsDataURL(blob);
                 });
             }
         } catch(e) {
             console.error("Failed to fetch image for Gemini", e);
         }
      }

      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Data
          }
        });
      }
    }
  }

  // Config setup
  const config: any = {};
  // Explicitly type tools as any array to prevent TS string assignment error
  const tools: any[] = [];

  // Extract system prompt from history and sanitize history
  let systemInstruction = undefined;
  const validHistory: any[] = [];
  let lastRole = '';

  for (const msg of history) {
      if (msg.role === 'system') {
          systemInstruction = systemInstruction ? `${systemInstruction}\n${msg.content}` : msg.content;
      } else {
          // Map 'assistant' to 'model'
          const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
          
          if (role === lastRole && validHistory.length > 0) {
              // Merge with previous message to enforce strict alternation
              validHistory[validHistory.length - 1].parts[0].text += `\n\n${msg.content}`;
          } else {
              validHistory.push({
                  role: role,
                  parts: [{ text: msg.content }]
              });
              lastRole = role;
          }
      }
  }

  // 1. Thinking Mode (Gemini 3 Pro)
  if (modelId === 'gemini-3-pro-preview') {
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else {
    // Only set maxOutputTokens if NOT thinking model (or thinking budget not set) to avoid conflict
    // But since we set thinkingBudget above, we skip maxOutputTokens there.
    config.maxOutputTokens = 8192;
  }

  // 2. Search Grounding (Gemini 3 Flash)
  if (modelId === 'gemini-3-flash-preview') {
    tools.push({ googleSearch: {} } as any);
  }

  // 3. Maps Grounding (Gemini 2.5 Flash)
  if (modelId === 'gemini-2.5-flash') {
    tools.push({ googleMaps: {} } as any);
  }

  // 4. Image Generation Configs
  if (modelId === 'gemini-3-pro-image-preview') {
    config.imageConfig = {
      imageSize: "1K", 
      aspectRatio: "1:1"
    };
  }

  // 5. TTS Config
  if (modelId === 'gemini-2.5-flash-preview-tts') {
     config.responseModalities = [Modality.AUDIO];
     config.speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
     };
  }

  if (tools.length > 0) {
    config.tools = tools;
  }
  
  if (systemInstruction) {
      config.systemInstruction = systemInstruction;
  }

  // 2. Execution Logic with Retry
  const execute = async () => {
      const ai = await getClient(isPaid);
      
      const chat = ai.chats.create({
        model: modelId,
        history: validHistory,
        config
      });

      // Use sendMessageStream with the 'message' parameter
      const response = await chat.sendMessageStream({ message: parts } as any);
      return { stream: response };
  };

  try {
      return await execute();
  } catch (e: any) {
      const msg = e.message || JSON.stringify(e);
      // Retry for any model if entity not found (project issue), OR specifically isPaid check
      if (window.aistudio && (msg.includes("Requested entity was not found") || msg.includes("404"))) {
          console.warn("Gemini request failed with 404. Retrying with new key selection...");
          await window.aistudio.openSelectKey();
          return await execute();
      }
      throw e;
  }
};
