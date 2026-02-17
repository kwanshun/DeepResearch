'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
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
  'keyword': { color: '#005cc5' },
  'function': { color: '#6f42c1' },
  'comment': { color: '#6a737d', fontStyle: 'italic' },
};

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
      onClick={handleCopy}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Send, Loader2, FileText, MessageSquare, ExternalLink, History, Plus, Copy, Check, Info } from 'lucide-react';
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
  const [isPlanning, setIsPlanning] = useState(false);
  const [researchPlan, setResearchPlan] = useState<string | null>(null);
  const [thinking, setThinking] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainReportRef = useRef<string>('');

  const handleCopyReport = async () => {
    if (!reportMarkdown) return;
    await navigator.clipboard.writeText(reportMarkdown);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

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
    setResearchPlan(null);
    setIsPlanning(false);
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
    setIsPlanning(true);
    
    // Add user prompt to chat
    const initialPrompt = prompt;
    setChatHistory([{ role: 'user', content: initialPrompt }]);
    setPrompt('');

    try {
      const res = await fetch('/api/deep_research/research/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: initialPrompt }),
      });
      const data = await res.json();
      
      if (res.ok && data.plan && data.plan !== 'Failed to generate plan.') {
        setResearchPlan(data.plan);
        setChatHistory(current => [...current, { 
          role: 'assistant', 
          content: data.plan,
          type: 'plan' // Special type to render the "Proceed" button
        }]);
      } else {
        throw new Error(data.error || 'Failed to generate a valid research plan.');
      }
    } catch (error: any) {
      console.error('Research plan error:', error);
      setChatHistory(current => [...current, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Failed to generate research plan.'} Please try again.` 
      }]);
    } finally {
      setLoading(false);
      setIsPlanning(false);
    }
  };

  const handleConfirmResearch = async (plan: string, originalPrompt: string) => {
    setLoading(true);
    setStatus('researching');
    setResearchPlan(null); // Clear plan after starting
    
    try {
      const res = await fetch('/api/deep_research/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: originalPrompt, plan }),
      });
      const data = await res.json();
      if (data.id) {
        setSessionId(data.id);
        fetchSessions(); // Refresh history
      }
    } catch (error) {
      console.error('Start research error:', error);
      setStatus('idle');
    } finally {
      setLoading(false);
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
      <ResizablePanelGroup orientation="horizontal" className="h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
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
                  <PopoverContent className="w-80 p-0 z-[100] bg-white dark:bg-zinc-950 shadow-2xl border-zinc-200 dark:border-zinc-800" align="end">
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
                <div key={i} className="space-y-2">
                  <div className={cn(
                    "p-4 rounded-2xl max-w-[90%] shadow-sm transition-all",
                    msg.role === 'user' 
                      ? "bg-white border border-zinc-200 text-[#18181B] ml-auto rounded-tr-none" 
                      : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-tl-none text-zinc-800 dark:text-zinc-200"
                  )}>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70",
                      msg.role === 'user' ? "text-zinc-500" : "text-zinc-400"
                    )}>
                      {msg.role === 'user' ? 'You' : 'Editor'}
                    </div>
                    <div className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none",
                      msg.role === 'user' && "text-inherit prose-headings:text-inherit"
                    )}>
                      {msg.type === 'plan' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                  
                  {msg.type === 'plan' && !sessionId && status === 'idle' && (
                    <div className="flex justify-center py-2">
                      <Button 
                        onClick={() => handleConfirmResearch(msg.content, chatHistory[0].content)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 px-8 py-6 rounded-xl text-lg font-bold gap-2 animate-in zoom-in-95 duration-300"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        Proceed with Research
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm italic">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isPlanning ? 'Agent is drafting a research plan...' : 'Agent is thinking...'}
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
              <div className="flex items-center gap-3">
                {status === 'researching' && (
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-800/50">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Researching
                  </div>
                )}
                {isEditing && (
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Updating
                  </div>
                )}
                {reportMarkdown && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={handleCopyReport}
                  >
                    {reportCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Markdown
                      </>
                    )}
                  </Button>
                )}
              </div>
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
                    <PopoverContent className="w-64 p-0 z-[100] bg-white dark:bg-zinc-950 shadow-2xl border-zinc-200 dark:border-zinc-800" align="start">
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
              "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-headings:mt-8 prose-headings:mb-4",
              "prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-3",
              "prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-li:my-1.5",
              "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-bold",
              "prose-code:text-zinc-900 dark:prose-code:text-zinc-100 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
              isEditing ? "opacity-50" : "opacity-100"
            )}>
              {status === 'researching' && !reportMarkdown && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-6 py-12">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 relative" />
                  </div>
                  <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Deep Research in Progress</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Our AI agent is currently browsing sources, analyzing data, and synthesizing your report. This usually takes 5-15 minutes.
                    </p>
                  </div>
                  <div className="w-full max-w-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      Live Activity
                    </div>
                    <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 italic">
                      {thinking || 'Initializing research engine...'}
                    </p>
                  </div>
                </div>
              )}
              {!reportMarkdown && status === 'idle' && (
                <div className="h-full flex items-center justify-center text-zinc-400 italic">
                  Waiting for research to start...
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  [rehypeSanitize, {
                    ...defaultSchema,
                    tagNames: [...(defaultSchema.tagNames || []), 'updated_report', 'additional_report'],
                    attributes: {
                      ...defaultSchema.attributes,
                      'additional_report': ['type']
                    }
                  }]
                ]}
                components={{
                  pre: ({ node, children, ...props }: any) => {
                    // Extract the actual code and language from children (which is the <code> element)
                    const codeElement = children;
                    const code = codeElement?.props?.children || '';
                    const language = /language-(\w+)/.exec(codeElement?.props?.className || '')?.[1] || '';
                    const isMultiLine = String(code).trim().includes('\n');
                    
                    return (
                      <div className={cn(
                        "not-prose shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-lg overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50 block",
                        isMultiLine ? "my-6" : "my-2"
                      )}>
                        {isMultiLine && (
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-800/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{language || 'text'}</span>
                            <CopyButton content={String(code).replace(/\n$/, '')} />
                          </div>
                        )}
                        <div className="relative group">
                          {!isMultiLine && (
                            <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <CopyButton content={String(code).replace(/\n$/, '')} />
                            </div>
                          )}
                          {children}
                        </div>
                      </div>
                    );
                  },
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isMultiLine = String(children).trim().includes('\n');
                    
                    // In react-markdown v9, the 'inline' prop is removed.
                    // We use the presence of a language class or multiline content
                    // to determine if it should be rendered as a block.
                    // This avoids rendering a <div> (from SyntaxHighlighter) inside a <p> for inline code.
                    if (match || isMultiLine) {
                      return (
                        <SyntaxHighlighter
                          language={match ? match[1] : 'text'}
                          style={codeTheme}
                          PreTag="div"
                          CodeTag="div"
                          customStyle={{
                            margin: 0,
                            padding: isMultiLine ? '1rem' : '0.5rem 3rem 0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            background: 'transparent',
                            display: 'block',
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              display: 'block',
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
                    const href = props.href;
                    const children = props.children?.toString() || '';
                    const citationIndexMatch = children.match(/\[(\d+)\]/);
                    
                    let source = null;
                    if (citationIndexMatch && sources.length > 0) {
                      const idx = parseInt(citationIndexMatch[1]) - 1;
                      source = sources[idx];
                    } else if (href && sources.length > 0) {
                      // Try to find source by URL if not a citation
                      source = sources.find(s => s.url === href);
                    }

                    if (source) {
                      // If it's a regular link (not a citation) and the text looks like a domain or is generic, use the title
                      const isGenericText = children.length < 40 && (
                        children.includes('.') || 
                        children.toLowerCase() === 'link' || 
                        children.toLowerCase() === 'source' ||
                        children.toLowerCase().startsWith('http')
                      );
                      const displayText = (isGenericText && source.title) ? source.title : children;

                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <span className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium decoration-blue-300 dark:decoration-blue-700 underline-offset-4">
                              {displayText}
                              {!citationIndexMatch && <ExternalLink className="w-3 h-3 opacity-50" />}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 z-[100] shadow-xl border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100">{source.title || 'Source'}</h4>
                                <div className="p-1 bg-zinc-100 dark:bg-zinc-800 rounded flex-shrink-0">
                                  <Info className="w-3 h-3 text-zinc-400" />
                                </div>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-4">
                                {source.snippet || 'No description available for this source.'}
                              </p>
                              {source.url && (
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors w-full"
                                >
                                  Visit Source Website <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    }
                    return <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />;
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
