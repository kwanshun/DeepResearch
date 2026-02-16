'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const codeTheme = {
  ...oneLight,
  'string': { color: '#6e8a3a' },
  'attr-value': { color: '#6e8a3a' },
  'attr-name': { color: '#1a1a1a' },
  'tag': { color: '#1a1a1a' },
  'punctuation': { color: '#1a1a1a' },
};

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Send, Loader2, FileText, MessageSquare, ExternalLink, History, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function ResearchPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [activeReportId, setActiveReportId] = useState<'main' | string>('main');
  const [sources, setSources] = useState<any[]>([]);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [additionalReports, setAdditionalReports] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'researching' | 'completed' | 'failed'>('idle');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [thinking, setThinking] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainReportRef = useRef<string>('');

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('research_sessions')
      .select('id, created_at, chat_history, status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      // Robust parsing for chat_history in sessions list
      const parsedSessions = data.map(s => {
        let history = s.chat_history;
        if (typeof history === 'string') {
          try {
            history = JSON.parse(history);
          } catch (e) {
            history = [];
          }
        }
        return { ...s, chat_history: Array.isArray(history) ? history : [] };
      });
      setSessions(parsedSessions);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        fetchSessions();
      }
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleNewResearch = () => {
    setSessionId(null);
    setPrompt('');
    setChatHistory([]);
    setReportMarkdown('');
    setSources([]);
    setStatus('idle');
    setThinking('');
  };

  const loadSession = async (id: string) => {
    setLoading(true);
    setHistoryOpen(false);
    try {
      const { data, error } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) {
        console.log('Successfully loaded session data:', data);
        setSessionId(data.id);
        
        // Handle potential double-encoded JSON or stringified JSONB
        let parsedHistory = data.chat_history;
        if (typeof parsedHistory === 'string') {
          try {
            parsedHistory = JSON.parse(parsedHistory);
          } catch (e) {
            console.error('Failed to parse chat_history string:', e);
            parsedHistory = [];
          }
        }
        setChatHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
        
        setReportMarkdown(data.report_markdown || '');
        mainReportRef.current = data.report_markdown || '';
        setActiveReportId('main');
        setSources(data.sources || []);
        
        let parsedReportHistory = data.report_history;
        if (typeof parsedReportHistory === 'string') {
          try {
            parsedReportHistory = JSON.parse(parsedReportHistory);
          } catch (e) {
            parsedReportHistory = [];
          }
        }
        setReportHistory(Array.isArray(parsedReportHistory) ? parsedReportHistory : []);
        
        let parsedAdditionalReports = data.additional_reports;
        if (typeof parsedAdditionalReports === 'string') {
          try {
            parsedAdditionalReports = JSON.parse(parsedAdditionalReports);
          } catch (e) {
            parsedAdditionalReports = [];
          }
        }
        setAdditionalReports(Array.isArray(parsedAdditionalReports) ? parsedAdditionalReports : []);
        
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Update mainReportRef whenever reportMarkdown changes while on 'main' report
  useEffect(() => {
    if (activeReportId === 'main') {
      mainReportRef.current = reportMarkdown;
    }
  }, [reportMarkdown, activeReportId]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'deep_research',
          table: 'research_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newDoc = payload.new as any;
          setReportMarkdown((current) => 
            newDoc.report_markdown !== current ? newDoc.report_markdown : current
          );
          setSources((current) => 
            JSON.stringify(newDoc.sources) !== JSON.stringify(current) ? newDoc.sources : current
          );
          setChatHistory((current) => 
            JSON.stringify(newDoc.chat_history) !== JSON.stringify(current) ? newDoc.chat_history : current
          );
          setReportHistory((current) => 
            JSON.stringify(newDoc.report_history) !== JSON.stringify(current) ? newDoc.report_history : current
          );
          setAdditionalReports((current) => 
            JSON.stringify(newDoc.additional_reports) !== JSON.stringify(current) ? newDoc.additional_reports : current
          );
          setStatus((current) => 
            newDoc.status !== current ? newDoc.status : current
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Polling for initial research
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'researching' && sessionId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/deep_research/research/status/${sessionId}`);
          const data = await res.json();
          
          if (data.status === 'completed') {
            setStatus('completed');
            setReportMarkdown(data.report_markdown);
            setSources(data.sources || []);
            clearInterval(interval);
          } else if (data.thinking_summaries) {
            setThinking(data.thinking_summaries);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [status, sessionId]);

  const handleStartResearch = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus('researching');
    
    try {
      const res = await fetch('/api/deep_research/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.id) {
        setSessionId(data.id);
        setChatHistory([{ role: 'user', content: prompt }]);
        fetchSessions(); // Refresh history
      }
    } catch (error) {
      console.error('Start research error:', error);
      setStatus('idle');
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || !sessionId) return;
    setLoading(true);
    setIsEditing(true);
    
    // Optimistic UI for chat
    const newHistory = [...chatHistory, { role: 'user', content: prompt }];
    setChatHistory(newHistory);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const res = await fetch('/api/deep_research/chat/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, message: currentPrompt }),
      });
      const data = await res.json();
      // Supabase Realtime will handle updating the chat_history and report_markdown
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  return (
    <TooltipProvider>
      <ResizablePanelGroup direction="horizontal" className="h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        {/* Left Panel: Chat */}
        <ResizablePanel defaultSize={50} minSize={20} className="h-full">
          <div className="h-full border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Research Chat
              </div>
              
              <div className="flex items-center gap-1">
                {user && (
                  <div className="flex items-center gap-2 mr-2">
                    <div className="text-[10px] text-zinc-500 hidden sm:block">
                      {user.email}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={handleLogout}
                    >
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="User" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px]">
                          {user.email?.[0].toUpperCase()}
                        </div>
                      )}
                    </Button>
                  </div>
                )}

                <Popover open={historyOpen} onOpenChange={(open) => {
                  setHistoryOpen(open);
                  if (open) fetchSessions();
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <History className="w-4 h-4 text-zinc-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 font-medium text-sm">
                      Recent Sessions
                    </div>
                    <ScrollArea className="h-[300px]">
                      {sessions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500">
                          No recent sessions found.
                        </div>
                      ) : (
                        <div className="grid divide-y divide-zinc-100 dark:divide-zinc-800">
                          {sessions.map((session) => (
                            <button
                              key={session.id}
                              onClick={() => loadSession(session.id)}
                              className={cn(
                                "text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group",
                                sessionId === session.id && "bg-blue-50/50 dark:bg-blue-900/10"
                              )}
                            >
                              <div className="text-sm font-medium line-clamp-1 group-hover:text-blue-600 transition-colors">
                                {session.chat_history?.[0]?.content || 'Untitled Research'}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                  {new Date(session.created_at).toLocaleDateString()}
                                </div>
                                <div className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full",
                                  session.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                  session.status === 'researching' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse" :
                                  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                  {session.status}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewResearch}>
                      <Plus className="w-4 h-4 text-zinc-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New Research</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                  Enter a research topic to get started.
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg max-w-[85%]",
                  msg.role === 'user' ? "bg-blue-50 dark:bg-blue-900/20 ml-auto" : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                )}>
                  <div className="text-sm font-medium mb-1 opacity-50">
                    {msg.role === 'user' ? 'You' : 'Editor'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm italic">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agent is thinking...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={sessionId ? "Ask the editor to update the report..." : "What do you want to research?"}
                  className="flex-1 min-h-[40px] max-h-[200px] p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sessionId ? handleSendMessage() : handleStartResearch();
                    }
                  }}
                />
                <button
                  onClick={() => sessionId ? handleSendMessage() : handleStartResearch()}
                  disabled={loading || !prompt.trim()}
                  className="p-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors self-end"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Document */}
        <ResizablePanel defaultSize={50} minSize={20} className="h-full">
          <div className="h-full flex flex-col bg-white dark:bg-zinc-900">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Report Preview
              </div>
              {status === 'researching' && (
                <div className="text-xs font-normal text-zinc-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {thinking || 'Deep Research in progress...'}
                </div>
              )}
              {isEditing && (
                <div className="text-xs font-normal text-zinc-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Editor is updating report...
                </div>
              )}
            </div>
            
            {(reportHistory.length > 0 || additionalReports.length > 0) && (
              <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto bg-zinc-50/50 dark:bg-zinc-900/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "text-[10px] h-6 px-2 rounded-full", 
                    activeReportId === 'main' && "bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 font-bold text-blue-600"
                  )}
                  onClick={() => {
                    setActiveReportId('main');
                    setReportMarkdown(mainReportRef.current);
                  }}
                >
                  Main Report
                </Button>
                {additionalReports.map((report, idx) => (
                  <Button 
                    key={idx}
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "text-[10px] h-6 px-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      activeReportId === `additional-${idx}` && "bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 font-bold text-blue-600"
                    )}
                    onClick={() => {
                      setActiveReportId(`additional-${idx}`);
                      setReportMarkdown(report.content);
                    }}
                  >
                    {report.type}
                  </Button>
                ))}
                {reportHistory.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                          "text-[10px] h-6 px-2 rounded-full gap-1",
                          activeReportId.startsWith('history-') && "bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 font-bold text-blue-600"
                        )}
                      >
                        <History className="w-3 h-3" /> History
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="p-2 border-b text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Version History</div>
                      <ScrollArea className="h-48">
                        {reportHistory.map((v, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setActiveReportId(`history-${i}`);
                              setReportMarkdown(v.content);
                            }}
                            className={cn(
                              "w-full text-left p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs border-b last:border-0",
                              activeReportId === `history-${i}` && "bg-blue-50/50 dark:bg-blue-900/10"
                            )}
                          >
                            <div className="font-medium">Version {reportHistory.length - i}</div>
                            <div className="text-[10px] text-zinc-400">{new Date(v.updated_at).toLocaleString()}</div>
                          </button>
                        )).reverse()}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
            
            <div className={cn(
              "flex-1 overflow-y-auto p-8 prose prose-zinc dark:prose-invert max-w-none transition-opacity",
              "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
              "prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed",
              "prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-li:my-1",
              "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-bold",
              "prose-code:text-zinc-900 dark:prose-code:text-zinc-100 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
              isEditing ? "opacity-50" : "opacity-100"
            )}>
              {status === 'researching' && !reportMarkdown && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p>Initializing Deep Research Agent...</p>
                  <p className="text-sm italic">{thinking}</p>
                </div>
              )}
              {!reportMarkdown && status === 'idle' && (
                <div className="h-full flex items-center justify-center text-zinc-400 italic">
                  Waiting for research to start...
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, ...props }) => (
                    <div className="not-prose my-6 shadow-sm ring-1 ring-zinc-200 rounded-lg overflow-hidden bg-zinc-50/50">
                      {props.children}
                    </div>
                  ),
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline) {
                      return (
                        <SyntaxHighlighter
                          language={match ? match[1] : 'text'}
                          style={codeTheme}
                          customStyle={{
                            margin: 0,
                            padding: '1.5rem',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            background: 'transparent',
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            }
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    }
                    return (
                      <code 
                        className={cn(
                          "bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-900 dark:text-zinc-100", 
                          className
                        )} 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a: ({ node, ...props }) => {
                    const citationIndex = props.children?.toString().match(/\[(\d+)\]/);
                    if (citationIndex && sources.length > 0) {
                      const idx = parseInt(citationIndex[1]) - 1;
                      const source = sources[idx];
                      if (source) {
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span className="cursor-pointer text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium">
                                {props.children}
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">{source.title || 'Source'}</h4>
                                <p className="text-sm text-zinc-500 line-clamp-3">
                                  {source.snippet || source.url}
                                </p>
                                {source.url && (
                                  <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    View Source <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      }
                    }
                    return <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />;
                  }
                }}
              >
                {reportMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
