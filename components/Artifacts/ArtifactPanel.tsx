
import React, { useEffect, useRef, useState } from 'react';
import { X, Code, Play, Check, Download, ExternalLink, RotateCcw, Loader2, Terminal, Trash2 } from 'lucide-react';
import { Artifact } from '../../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
}

// Helper to load external scripts dynamically
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
};

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'run'>('preview');
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine default tab based on type
    if (['javascript', 'typescript', 'python'].includes(artifact?.language || '')) {
        setActiveTab('code'); // Default to code for scripts
    } else {
        setActiveTab('preview');
    }
    setOutput([]);
  }, [artifact]);

  useEffect(() => {
    const initPyodide = async () => {
      if (artifact?.language === 'python' && !pyodide) {
        try {
          setOutput(prev => [...prev, "Initializing Python environment..."]);
          await loadScript("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");
          const py = await window.loadPyodide();
          setPyodide(py);
          setOutput(prev => [...prev, "Python ready."]);
        } catch (e) {
          console.error("Failed to load Pyodide:", e);
          setOutput(prev => [...prev, "Error: Could not load Python environment."]);
        }
      }
    };
    if (artifact?.language === 'python') initPyodide();
  }, [artifact, pyodide]);

  useEffect(() => {
    if (artifact?.type === 'html' && activeTab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(artifact.content);
        doc.close();
      }
    }
  }, [artifact, activeTab]);

  useEffect(() => {
      if (activeTab === 'run') {
          outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [output, activeTab]);

  const runJavaScript = async (code: string) => {
      return new Promise<void>((resolve) => {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.setAttribute('sandbox', 'allow-scripts'); // Sandbox: execution only, no DOM/Cookie access to parent
          document.body.appendChild(iframe);

          const handleMessage = (event: MessageEvent) => {
              // Although sandboxed frames usually have null origin, we filter by a custom flag in data
              if (event.data?.source === 'sandbox-logger') {
                  const { type, args } = event.data;
                  if (type === 'log') {
                      setOutput(prev => [...prev, args.join(' ')]);
                  } else if (type === 'error') {
                      setOutput(prev => [...prev, `ERROR: ${args.join(' ')}`]);
                  } else if (type === 'done') {
                      window.removeEventListener('message', handleMessage);
                      document.body.removeChild(iframe);
                      resolve();
                  }
              }
          };

          window.addEventListener('message', handleMessage);

          // Wrap code to catch errors and redirect console
          const html = `
            <html><body><script>
                const send = (type, args) => window.parent.postMessage({ source: 'sandbox-logger', type, args: args.map(String) }, '*');
                
                console.log = (...args) => send('log', args);
                console.info = (...args) => send('log', args);
                console.warn = (...args) => send('log', ['WARN:', ...args]);
                console.error = (...args) => send('error', args);
                
                window.onerror = (msg, url, line) => send('error', [msg + ' (Line ' + line + ')']);

                (async function() {
                    try {
                        ${code}
                    } catch (e) {
                        console.error(e.toString());
                    } finally {
                        send('done', []);
                    }
                })();
            </script></body></html>
          `;
          
          iframe.contentWindow?.document.open();
          iframe.contentWindow?.document.write(html);
          iframe.contentWindow?.document.close();
      });
  };

  const runCode = async () => {
    setOutput([]); // Clear previous output
    setActiveTab('run');
    setIsRunning(true);
    
    try {
        if (artifact?.language === 'javascript' || artifact?.language === 'typescript') {
            await runJavaScript(artifact.content);
        } else if (artifact?.language === 'python') {
            if (!pyodide) {
                setOutput(["Python environment loading... please wait."]);
                // Retry checking pyodide in loop or just return
                setIsRunning(false);
                return;
            }
            // Reset stdout/stderr capture
            pyodide.setStdout({ batched: (msg: string) => setOutput(prev => [...prev, msg]) });
            pyodide.setStderr({ batched: (msg: string) => setOutput(prev => [...prev, `Error: ${msg}`]) });
            
            await pyodide.runPythonAsync(artifact.content);
        } else {
            setOutput(["Execution only supported for JavaScript and Python in this sandbox."]);
        }
    } catch (e: any) {
        setOutput(prev => [...prev, `Runtime Error: ${e.message}`]);
    } finally {
        setIsRunning(false);
    }
  };

  if (!artifact) return null;

  const canRun = ['javascript', 'typescript', 'python'].includes(artifact.language || '');

  return (
    <div className="w-[450px] md:w-[600px] border-l border-slate-800 bg-background flex flex-col h-full shadow-2xl absolute right-0 top-0 bottom-0 z-40 animate-[slideIn_0.3s_ease-out]">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50">
        <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">{artifact.type}</span>
            <h3 className="text-sm font-medium text-slate-200 truncate">{artifact.title}</h3>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg mr-2">
                <button 
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Code size={14} className="mr-1 inline" /> Code
                </button>
                {(artifact.type === 'html' || artifact.type === 'svg') && (
                     <button 
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Preview
                    </button>
                )}
                {canRun && (
                    <button 
                        onClick={() => setActiveTab('run')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'run' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Terminal size={14} className="mr-1 inline" /> Output
                    </button>
                )}
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                <X size={18} />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-[#0d1117]">
        {activeTab === 'code' ? (
            <div className="absolute inset-0 overflow-auto">
                 <SyntaxHighlighter
                    style={oneDark}
                    language={artifact.language || 'text'}
                    customStyle={{ margin: 0, minHeight: '100%', fontSize: '13px' }}
                    showLineNumbers={true}
                >
                    {artifact.content}
                </SyntaxHighlighter>
            </div>
        ) : activeTab === 'run' ? (
            <div className="w-full h-full bg-[#1e1e1e] p-4 font-mono text-sm text-slate-300 overflow-auto flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <span className="font-semibold text-white flex items-center gap-2">
                        <Terminal size={16} /> Console Output
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setOutput([])} 
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Clear Output"
                        >
                            <Trash2 size={14} />
                        </button>
                        <button onClick={runCode} disabled={isRunning} className="flex items-center gap-1 text-green-400 hover:text-green-300 disabled:opacity-50">
                            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 
                            {isRunning ? 'Running...' : 'Run Again'}
                        </button>
                    </div>
                </div>
                {output.length === 0 ? (
                    <div className="text-slate-500 italic">No output. Click Run to execute code.</div>
                ) : (
                    <div className="flex-1 overflow-auto space-y-1">
                        {output.map((line, i) => (
                            <div key={i} className={`break-words border-l-2 pl-2 ${line.startsWith('ERROR') || line.startsWith('Traceback') ? 'text-red-400 border-red-500' : line.startsWith('WARN') ? 'text-yellow-400 border-yellow-500' : 'text-slate-300 border-slate-700'}`}>
                                {line}
                            </div>
                        ))}
                        <div ref={outputEndRef} />
                    </div>
                )}
            </div>
        ) : (
            <div className="w-full h-full bg-white relative">
                 {artifact.type === 'html' && (
                     <iframe 
                        ref={iframeRef}
                        title="Artifact Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-modals"
                     />
                 )}
                 {artifact.type === 'svg' && (
                     <div className="w-full h-full flex items-center justify-center p-8 bg-[url('https://transparenttextures.com/patterns/grid-me.png')] bg-repeat" dangerouslySetInnerHTML={{ __html: artifact.content }} />
                 )}
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
          {canRun && (activeTab === 'code' || activeTab === 'run') && (
             <button onClick={runCode} disabled={isRunning} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded transition-colors shadow-lg shadow-green-900/20">
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Run Code
            </button>
          )}
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded border border-slate-700 transition-colors">
              <Download size={14} />
              Download
          </button>
      </div>
    </div>
  );
};
