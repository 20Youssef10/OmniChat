import React, { useState, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Artifact } from '../../types';
import { Copy, Bot, User, Check, ExternalLink, MapPin, Edit2, RotateCw, ThumbsUp, ThumbsDown, Bookmark, Save, X, Box, Maximize2, Volume2, StopCircle, PlayCircle, Music } from 'lucide-react';
import { updateMessageInDb } from '../../services/firebase';
import { trackEvent } from '../../services/analyticsService';
import mermaid from 'mermaid';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (message: Message) => void;
  onEdit?: (message: Message, newContent: string) => void;
  onOpenArtifact?: (artifact: Artifact) => void;
}

// Memoized component to prevent re-renders when other parts of the chat update
export const MessageBubble = memo(({ message, onRegenerate, onEdit, onOpenArtifact }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'dark', 
        securityLevel: 'loose',
        fontFamily: 'Inter' 
    });
  }, []);

  useEffect(() => {
    if (!isUser && message.content.includes('```mermaid')) {
       setTimeout(() => {
          mermaid.contentLoaded();
       }, 500);
    }
  }, [message.content, isUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent('feature_used', { feature: 'copy_message' });
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent !== message.content) {
      onEdit(message, editContent);
    }
    setIsEditing(false);
  };

  const handleRate = async (rating: 'like' | 'dislike') => {
    if (message.conversationId) {
        // Toggle off if already selected
        const newRating = message.rating === rating ? undefined : rating;
        
        await updateMessageInDb(message.conversationId, message.id, { rating: newRating });
        
        // Track Satisfaction
        if (newRating) {
            trackEvent('message_feedback', { rating: newRating, model: message.model, latency: message.latency });
        }
    }
  };

  const handleBookmark = async () => {
     if (message.conversationId) {
        await updateMessageInDb(message.conversationId, message.id, { isBookmarked: !message.isBookmarked });
        trackEvent('feature_used', { feature: 'bookmark_message' });
     }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    } else {
        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.onend = () => setIsSpeaking(false);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
        trackEvent('feature_used', { feature: 'tts_read_aloud' });
    }
  };

  const renderGrounding = () => {
    if (!message.groundingMetadata?.groundingChunks) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sources</span>
        <div className="flex flex-wrap gap-2">
          {message.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
            if (chunk.web?.uri) {
              return (
                <a 
                  key={i} 
                  href={chunk.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-xs text-blue-300 transition-colors border border-slate-700"
                >
                  <ExternalLink size={10} />
                  <span className="truncate max-w-[150px]">{chunk.web.title || 'Source'}</span>
                </a>
              );
            }
            if (chunk.maps?.placeId || chunk.maps?.uri) {
               return (
                <a 
                  key={i} 
                  href={chunk.maps.uri || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-xs text-green-300 transition-colors border border-slate-700"
                >
                  <MapPin size={10} />
                  <span className="truncate max-w-[150px]">{chunk.maps.title || 'Map Location'}</span>
                </a>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const renderMediaEmbeds = () => {
      // Don't extract from user messages or thinking messages
      if (isUser || message.thinking) return null;

      const content = message.content || '';
      
      // Regex for Media IDs
      // Supports standard youtube, youtu.be, and spotify track links
      const youtubeMatch = content.match(/https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g);
      const youtubeShortMatch = content.match(/https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/g);
      const spotifyMatch = content.match(/https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/g);

      let youtubeIds: string[] = [];
      if (youtubeMatch) youtubeIds.push(...youtubeMatch.map(url => url.split('v=')[1].split('&')[0]));
      if (youtubeShortMatch) youtubeIds.push(...youtubeShortMatch.map(url => url.split('.be/')[1].split('?')[0]));
      youtubeIds = Array.from(new Set(youtubeIds));

      const spotifyIds = spotifyMatch ? Array.from(new Set(spotifyMatch.map(url => url.split('track/')[1].split('?')[0]))) : [];

      if (youtubeIds.length === 0 && spotifyIds.length === 0) return null;

      return (
          <div className="flex flex-col gap-6 mt-4 w-full border-t border-slate-800/50 pt-4">
              {/* YouTube Slider */}
              {youtubeIds.length > 0 && (
                  <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                          <PlayCircle size={16} className="text-red-500" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              {youtubeIds.length > 1 ? `Videos (${youtubeIds.length})` : 'Video'}
                          </span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-1 scrollbar-thin">
                          {youtubeIds.map(id => (
                              <div key={id} className="flex-none w-[280px] md:w-[320px] snap-center rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-black aspect-video relative group ring-1 ring-white/5 hover:ring-white/20 transition-all">
                                  <iframe 
                                      className="w-full h-full"
                                      src={`https://www.youtube.com/embed/${id}`} 
                                      title="YouTube video player" 
                                      frameBorder="0" 
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                      allowFullScreen
                                  ></iframe>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Spotify Slider */}
              {spotifyIds.length > 0 && (
                  <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                          <Music size={16} className="text-green-500" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              {spotifyIds.length > 1 ? `Songs (${spotifyIds.length})` : 'Song'}
                          </span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-1 scrollbar-thin">
                          {spotifyIds.map(id => (
                              <div key={id} className="flex-none w-[280px] snap-center rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 ring-1 ring-white/5 hover:ring-white/20 transition-all">
                                  <iframe 
                                      style={{borderRadius: '12px'}} 
                                      src={`https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`} 
                                      width="100%" 
                                      height="152" 
                                      frameBorder="0" 
                                      allowFullScreen 
                                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                      loading="lazy"
                                  ></iframe>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group/bubble`}>
      <div className={`flex max-w-4xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary' : 'bg-secondary'}`}>
          {isUser ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'} max-w-[90%]`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs text-slate-400 font-medium">
                    {isUser ? 'You' : message.model || 'Gemini'}
                </span>
                <span className="text-xs text-slate-500">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Bubble */}
            <div className={`
                relative px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed overflow-hidden w-full
                ${isUser 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'glass text-slate-100 rounded-tl-sm border border-slate-700/50'}
                ${message.error ? 'border-red-500/50 bg-red-900/10' : ''}
            `}>
                {isEditing ? (
                  <div className="flex flex-col gap-2 min-w-[300px]">
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-600 rounded p-2 text-slate-200 outline-none focus:border-indigo-500 min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><X size={16}/></button>
                      <button onClick={handleSaveEdit} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white"><Save size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* User Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {message.attachments.map((att, idx) => (
                          att.type === 'image' ? (
                            <img 
                              key={idx} 
                              src={att.url} 
                              alt="Attachment" 
                              loading="lazy"
                              decoding="async"
                              className="max-w-full h-auto max-h-64 rounded-lg border border-white/10" 
                            />
                          ) : (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/80 border border-slate-700 rounded-lg">
                                <div className="p-2 bg-slate-700 rounded">
                                    <Box size={16} className="text-slate-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-200 truncate max-w-[150px]">{att.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase">{att.mimeType?.split('/')[1] || 'FILE'}</span>
                                </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {/* Veo Video Result */}
                    {message.videoUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-700 bg-black">
                        <video controls className="w-full h-auto max-h-[400px]" preload="metadata">
                            <source src={message.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    
                    {/* DALL-E Image Result */}
                    {message.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-700">
                         <img 
                            src={message.imageUrl} 
                            alt="Generated" 
                            loading="lazy"
                            decoding="async"
                            className="w-full h-auto" 
                         />
                      </div>
                    )}

                    {message.thinking ? (
                        <div className="flex items-center gap-2 text-slate-400 italic py-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            <span className="ml-2">Thinking...</span>
                        </div>
                    ) : (
                        <div className="markdown-body prose prose-invert prose-sm max-w-none break-words">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                code({node, inline, className, children, ...props}: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    const lang = match ? match[1] : '';
                                    const isArtifact = !inline && (lang === 'html' || lang === 'svg' || lang === 'xml' || lang === 'javascript' || lang === 'typescript' || lang === 'tsx' || lang === 'python');
                                    
                                    if (lang === 'mermaid') {
                                        return <div className="mermaid bg-slate-800/50 p-4 rounded-lg my-4 overflow-x-auto">{String(children).replace(/\n$/, '')}</div>;
                                    }

                                    return !inline && match ? (
                                    <div className="relative group/code my-4 border border-slate-700/50 rounded-lg overflow-hidden font-mono text-sm">
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50">
                                            <span className="text-xs text-slate-400 font-mono">{lang}</span>
                                            {isArtifact && onOpenArtifact && (
                                                <button 
                                                    onClick={() => onOpenArtifact({
                                                        id: `art-${Date.now()}`,
                                                        type: lang === 'svg' ? 'svg' : (['html', 'xml'].includes(lang) ? 'html' : 'code'),
                                                        title: 'Code Preview',
                                                        content: String(children),
                                                        language: lang
                                                    })}
                                                    className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded text-[10px] font-medium transition-colors border border-indigo-500/30"
                                                >
                                                    <Maximize2 size={10} />
                                                    {['javascript', 'typescript', 'python'].includes(lang) ? 'Run Code' : 'Preview'}
                                                </button>
                                            )}
                                        </div>
                                        <SyntaxHighlighter
                                            style={oneDark}
                                            language={lang}
                                            PreTag="div"
                                            customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                    ) : (
                                    <code className={`${className} bg-slate-800/50 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs`} {...props}>
                                        {children}
                                    </code>
                                    )
                                }
                                }}
                            >
                                {message.content || ''}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Media Players */}
                    {renderMediaEmbeds()}

                    {/* Grounding Info */}
                    {!isUser && renderGrounding()}
                  </>
                )}
            </div>

            {/* Action Bar */}
            {!message.thinking && !isEditing && (
              <div className={`flex items-center gap-1 mt-1 px-1 transition-opacity opacity-0 group-hover/bubble:opacity-100 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <button 
                    onClick={handleCopy} 
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>

                  {/* Text to Speech Button */}
                   <button 
                    onClick={handleSpeak} 
                    className={`p-1.5 rounded-lg transition-colors ${isSpeaking ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                  >
                    {isSpeaking ? <StopCircle size={14} /> : <Volume2 size={14} />}
                  </button>

                  {isUser ? (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => onRegenerate && onRegenerate(message)}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                        title="Regenerate"
                      >
                        <RotateCw size={14} />
                      </button>
                      <div className="w-px h-3 bg-slate-800 mx-1"></div>
                      <button 
                        onClick={() => handleRate('like')}
                        className={`p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors ${message.rating === 'like' ? 'text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button 
                        onClick={() => handleRate('dislike')}
                        className={`p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors ${message.rating === 'dislike' ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`}
                      >
                        <ThumbsDown size={14} />
                      </button>
                      <button 
                        onClick={handleBookmark}
                        className={`p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors ${message.isBookmarked ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
                        title="Bookmark"
                      >
                        <Bookmark size={14} />
                      </button>
                    </>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
});

// Display name for devtools
MessageBubble.displayName = 'MessageBubble';