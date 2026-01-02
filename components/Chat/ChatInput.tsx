
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Loader2, Mic, MicOff, Command } from 'lucide-react';
import { Attachment } from '../../types';
import { uploadFile, readFileAsBase64 } from '../../services/fileService';

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
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, userId }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Simple navigation for suggestions could be added here
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled || isUploading) return;
    
    // Stop listening if sending
    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    // Append extracted text from files to the prompt context if present
    let finalPrompt = text;
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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
      // Replace the current text (which starts with /) with the command tag or just use it as a trigger
      // Here we just set the text, but logic in useChat will detect it.
      setText(cmd + ' ');
      if (textareaRef.current) textareaRef.current.focus();
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

        <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Uploading files..." : isListening ? "Listening..." : disabled ? "Conversation is read-only" : "Ask anything... (type / for commands)"}
            className={`flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0 resize-none py-2 max-h-[200px] overflow-y-auto leading-relaxed ${isListening ? 'animate-pulse' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            rows={1}
            disabled={disabled || isUploading}
        />

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
      <div className="text-center mt-2 text-xs text-slate-500">
        AI may display inaccurate info. Uploads limited to 10MB.
      </div>
    </div>
  );
};
