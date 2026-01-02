
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Mic, MicOff, Command, Wand2, Hash, Type } from 'lucide-react';
import { Attachment } from '../../types';
import { uploadFile, readFileAsBase64 } from '../../services/fileService';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import { GoogleGenAI } from '@google/genai';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
  userId?: string;
}

const SLASH_COMMANDS = [
    { cmd: '/web', desc: 'Search the web using Google', icon: '🌐' },
    { cmd: '/image', desc: 'Generate an image', icon: '🎨' },
    { cmd: '/video', desc: 'Generate a video', icon: '🎥' },
    { cmd: '/deep', desc: 'Deep research & reasoning', icon: '🧠' },
    { cmd: '/page', desc: 'Create a web page/artifact', icon: '📄' },
    { cmd: '/quiz', desc: 'Create a quiz based on topic', icon: '❓' },
    { cmd: '/visualize', desc: 'Create a chart from data', icon: '📊' },
    { cmd: '/analyze', desc: 'Analyze the attached file', icon: '📈' },
    { cmd: '/summarize', desc: 'Summarize the conversation', icon: '📝' },
    { cmd: '/rewrite', desc: 'Rewrite text professionally', icon: '✒️' },
    { cmd: '/eli5', desc: 'Explain Like I\'m 5', icon: '👶' },
    { cmd: '/fix', desc: 'Fix Grammar & Spelling', icon: '✨' },
    { cmd: '/review', desc: 'Code Review', icon: '🧐' },
    { cmd: '/short', desc: 'TL;DR Summary', icon: '📉' },
];

const TONES = [
    { id: 'casual', label: 'Casual', emoji: '😎' },
    { id: 'professional', label: 'Professional', emoji: '💼' },
    { id: 'academic', label: 'Academic', emoji: '🎓' },
    { id: 'creative', label: 'Creative', emoji: '🎨' },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, userId }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
      // Check for slash and filtering
      if (text.startsWith('/')) {
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  }, [text]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript) {
                setText(prev => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            if (isListening) {
                 // Restart if supposed to be listening (continuous mode sometimes stops)
                 try { recognitionRef.current.start(); } catch {}
            }
        };
    }
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        recognitionRef.current.start();
        setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Suggestion navigation logic could go here
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled || isUploading) return;
    
    // Stop listening if sending
    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    // Append tone if selected
    let finalPrompt = text;
    if (selectedTone) {
        finalPrompt += `\n\n(Please respond in a ${selectedTone} tone)`;
    }

    // Append extracted text from files to the prompt context if present
    const contextFiles = attachments.filter(a => a.extractedText);
    if (contextFiles.length > 0) {
        finalPrompt += "\n\n--- Attached File Context ---\n";
        contextFiles.forEach(f => {
            finalPrompt += `\n[File: ${f.name}]\n${f.extractedText}\n`;
        });
    }

    onSend(finalPrompt, attachments);
    setText('');
    setAttachments([]);
    setSelectedTone(null);
  };

  const handleOptimizePrompt = async () => {
      if (!text.trim()) return;
      setIsOptimizing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Rewrite the following user prompt to be more clear, detailed, and effective for an AI model. Keep the intent exactly the same, just improve the phrasing. Return ONLY the rewritten prompt.
              
              Original: ${text}`
          });
          if (response.text) {
              setText(response.text.trim());
          }
      } catch (e) {
          console.error("Optimization failed", e);
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsUploading(true);
      const files: File[] = Array.from(e.target.files);
      
      try {
        const newAttachments: Attachment[] = [];

        for (const file of files) {
            if (userId) {
                // Upload to Firebase Storage if user is logged in
                const attachment = await uploadFile(file, userId);
                newAttachments.push(attachment);
            } else {
                // Guest mode: Local Data URL only (no extract for now or limited)
                const base64 = await readFileAsBase64(file);
                newAttachments.push({
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: base64,
                    name: file.name,
                    mimeType: file.type
                });
            }
        }
        setAttachments(prev => [...prev, ...newAttachments]);
      } catch (error) {
        console.error("File upload error:", error);
        alert("Failed to upload file. Please try again.");
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const insertCommand = (cmd: string) => {
      setText(cmd + ' ');
      setShowSuggestions(false);
  };

  // Filter commands based on input
  const filteredCommands = SLASH_COMMANDS.filter(c => c.cmd.startsWith(text.split(' ')[0]));

  return (
    <div className="w-full max-w-4xl mx-auto p-4 relative">
      {/* Suggestions Popup */}
      {showSuggestions && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 bg-surface border border-slate-700 rounded-xl shadow-xl overflow-hidden w-64 animate-[fadeIn_0.1s_ease-out] z-50">
              <div className="p-2 bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase">Tools & Commands</div>
              {filteredCommands.map(sc => (
                  <button 
                    key={sc.cmd}
                    onClick={() => insertCommand(sc.cmd)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm flex items-center gap-3 transition-colors"
                  >
                      <span className="text-lg">{sc.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-indigo-400">{sc.cmd}</span>
                        <span className="text-xs text-slate-400">{sc.desc}</span>
                      </div>
                  </button>
              ))}
          </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
          {attachments.map((att, i) => (
            <div key={i} className="relative group w-16 h-16 rounded-md overflow-hidden bg-slate-900 border border-slate-700">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 p-1 text-center break-all leading-tight">
                    <span className="font-semibold text-slate-300">FILE</span>
                    {att.name?.slice(0, 10)}
                </div>
              )}
              <button 
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {isUploading && (
              <div className="w-16 h-16 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
          )}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-surface border border-slate-700 rounded-xl p-2 shadow-lg ring-1 ring-white/5 focus-within:ring-primary focus-within:border-primary transition-all">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg transition-colors ${disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            title="Attach file"
            disabled={isUploading || disabled}
        >
            <Paperclip size={20} />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.md"
        />

        <div className="flex-1 relative min-h-[44px] max-h-[200px] overflow-y-auto">
            {/* Placeholder Overlay */}
            {!text && !isUploading && !isListening && (
                <div className="absolute top-2.5 left-1 text-slate-500 pointer-events-none text-base truncate w-full pr-8">
                    {disabled ? "Conversation is read-only" : "Ask anything... (type / for commands)"}
                </div>
            )}
            
            {/* Highlighted Editor */}
            <Editor
                value={text}
                onValueChange={setText}
                highlight={code => Prism.highlight(code, Prism.languages.markdown, 'markdown')}
                padding={10}
                placeholder={isUploading ? "Uploading files..." : isListening ? "Listening..." : ""}
                onKeyDown={handleKeyDown}
                className="font-mono text-base bg-transparent min-h-[44px]"
                textareaClassName="focus:outline-none bg-transparent text-slate-200 placeholder-transparent w-full h-full"
                style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: '#e2e8f0', // slate-200
                }}
                disabled={disabled || isUploading}
            />
        </div>

        {/* Tone Selector */}
        <div className="hidden md:flex gap-1 mr-1">
            {TONES.map(t => (
                <button
                    key={t.id}
                    onClick={() => setSelectedTone(selectedTone === t.id ? null : t.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${selectedTone === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                    title={t.label}
                >
                    {t.emoji}
                </button>
            ))}
        </div>

        {/* Prompt Optimizer */}
        <button
            onClick={handleOptimizePrompt}
            disabled={!text.trim() || isOptimizing}
            className={`p-2 rounded-lg transition-colors ${isOptimizing ? 'text-yellow-400 animate-pulse' : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'}`}
            title="Optimize Prompt"
        >
            <Wand2 size={18} />
        </button>

        <button 
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all duration-200 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            title="Voice Input"
            disabled={disabled}
        >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0) || isUploading}
            className={`
                p-2 rounded-lg transition-all duration-200
                ${(!text.trim() && attachments.length === 0) || disabled || isUploading
                    ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed' 
                    : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-indigo-500/20'}
            `}
        >
            <Send size={18} />
        </button>
      </div>
      <div className="flex justify-between items-center mt-2 px-2 text-xs text-slate-500">
        <span>AI may display inaccurate info. Uploads limited to 10MB.</span>
        <div className="flex gap-3">
            <span className="flex items-center gap-1"><Type size={10}/> {text.length} chars</span>
            <span className="flex items-center gap-1"><Hash size={10}/> ~{Math.ceil(text.length / 4)} tokens</span>
        </div>
      </div>
    </div>
  );
};
