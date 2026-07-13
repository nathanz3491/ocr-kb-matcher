'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Navigation } from '@/components/navigation/Navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import ReactMarkdown from 'react-markdown';
import { 
  Loader2, Send, Trash2, Brain, MessageCircle, Sparkles, Bot, User, X, BookOpen, 
  Plus, MessageSquare, Clock, ChevronRight, MoreVertical, Pencil, Copy, Zap
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  usage?: {
    totalTokens?: number;
  };
  cachedTokens?: number;
  id?: string;
}

interface ChatSession {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: string;
}

interface KnowledgeContext {
  totalNodes: number;
  totalEdges: number;
  categories: string[];
}

export default function ChatPage() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeContext, setKnowledgeContext] = useState<KnowledgeContext | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string>('default');
  const [sessionName, setSessionName] = useState('New Chat');
  const [isEditingName, setIsEditingName] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessions([
      { id: 'default', name: 'General Chat', lastMessage: '', updatedAt: new Date().toISOString() },
    ]);
    fetchKnowledgeContext();
  }, []);

  const fetchKnowledgeContext = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chat/knowledge-context`);
      if (res.data.success) {
        const ctx = res.data.data;
        setKnowledgeContext(ctx);
        const nodes = ctx.totalNodes ?? 0;
        const edges = ctx.totalEdges ?? 0;
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm your AI learning assistant with access to your complete knowledge graph. I can help you with:

• **Explaining concepts** - Ask me about any topic in your knowledge base
• **Connecting ideas** - I can show relationships between different concepts
• **Creating quizzes** - Test your understanding on any topic
• **Study guidance** - Get personalized learning recommendations
• **Answering questions** - Clarify doubts about anything you've learned

Your knowledge graph contains **${nodes}** nodes and **${edges}** connections. What would you like to learn about?`
        }]);
      }
    } catch (err) {
      console.error('Error fetching knowledge context:', err);
      setMessages([{
        role: 'assistant',
        content: 'Hello! How can I help you learn today?'
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMessage, sessionId: activeSession }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      const assistantMsgId = `assistant_${Date.now()}`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        id: assistantMsgId,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content !== undefined) {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + (parsed.content || '') }
                  : m
              ));
            }
            if (parsed.done) {
              if (parsed.usage) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, usage: parsed.usage, cachedTokens: parsed.cachedTokens ?? null }
                    : m
                ));
              }
            }
          } catch {}
        }
      }

      // Update session's last message
      setSessions(prev => prev.map(s => 
        s.id === activeSession 
          ? { ...s, lastMessage: userMessage, updatedAt: new Date().toISOString() }
          : s
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect to the server. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (activeSession !== 'default') {
      await axios.delete(`${API_BASE_URL}/api/chat/history/${activeSession}`).catch(() => {});
    }
    setMessages([
      {
        role: 'assistant',
        content: `Chat cleared! Your knowledge graph is still intact with ${knowledgeContext?.totalNodes || '...'} nodes. How can I help you learn today?`
      }
    ]);
  };

  const createNewSession = async () => {
    if (activeSession !== 'default') {
      await axios.delete(`${API_BASE_URL}/api/chat/history/${activeSession}`).catch(() => {});
    }
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      name: `Chat ${sessions.length + 1}`,
      lastMessage: '',
      updatedAt: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSession(newId);
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! How can I help you learn today?'
      }
    ]);
  };

  const deleteSession = async (sessionId: string) => {
    if (sessionId === 'default') return; // Can't delete default
    const sessionIdToDelete = sessionId;
    await axios.delete(`${API_BASE_URL}/api/chat/history/${sessionIdToDelete}`).catch(() => {});
    setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
    if (activeSession === sessionIdToDelete) {
      setActiveSession('default');
      setMessages([
        {
          role: 'assistant',
          content: 'Switched to General Chat. How can I help you?'
        }
      ]);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      <Navigation />
      
      {/* Bordered Window Container */}
      <div className="flex-1 flex rounded-2xl overflow-hidden" 
        style={{ 
          margin: '5rem',
          height: 'calc(100vh - 5rem * 2)',
          border: theme === 'dark' ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
          backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.3)'
        }}
      >
        {/* Sessions Sidebar */}
        <div className={`hidden md:flex flex-col border-r transition-all duration-300 rounded-l-2xl ${
          theme === 'dark'
            ? 'bg-slate-900/50 border-slate-700/50'
            : 'bg-white/50 border-slate-200/50'
        } ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          {/* Sidebar Header */}
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
            <button
              onClick={createNewSession}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'
              }`}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSession(session.id);
                  setMessages([
                    {
                      role: 'assistant',
                      content: `Switched to "${session.name}". How can I help you?`
                    }
                  ]);
                }}
                className={`group relative flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                  activeSession === session.id
                    ? theme === 'dark'
                      ? 'bg-blue-600/20 border-2 border-blue-500/40'
                      : 'bg-blue-50 border-2 border-blue-200'
                    : theme === 'dark'
                      ? 'hover:bg-slate-800/50 border-2 border-transparent'
                      : 'hover:bg-slate-100 border-2 border-transparent'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  <MessageSquare className={`h-4 w-4 ${
                    activeSession === session.id 
                      ? 'text-blue-500' 
                      : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium truncate ${
                    theme === 'dark' ? 'text-white' : 'text-slate-700'
                  }`}>
                    {session.name}
                  </span>
                  <span className={`block text-xs truncate ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {session.lastMessage || 'New conversation'}
                  </span>
                </div>

                {/* Delete button */}
                {session.id !== 'default' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                      theme === 'dark' ? 'hover:bg-red-900/30 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'}`}>
            <div className={`flex items-center gap-2 text-xs ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-6 h-16 rounded-r-xl transition-all ${
            theme === 'dark'
              ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          } shadow-lg`}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col px-6 py-6 overflow-hidden rounded-r-2xl" 
          style={{ 
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.7)',
            border: theme === 'dark' ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)'
          }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between shrink-0 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              }`}>
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>AI Knowledge Assistant</h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Powered by your knowledge graph</p>
              </div>
            </div>
            
            <button
              onClick={() => clearChat()}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors z-50 relative ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>

          {/* Knowledge Context Bar */}
          {knowledgeContext && (
            <div className="mb-4 flex flex-wrap gap-2 shrink-0 max-w-4xl mx-auto w-full">
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              }`}>
                <BookOpen className={`h-4 w-4 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <span className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>{knowledgeContext.totalNodes} Topics</span>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              }`}>
                <Sparkles className={`h-4 w-4 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <span className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                }`}>{knowledgeContext.totalEdges} Connections</span>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
              }`}>
                <Brain className={`h-4 w-4 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
                <span className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-700'
                }`}>{knowledgeContext.categories?.length || 0} Categories</span>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className={`flex-1 overflow-y-auto rounded-2xl border p-4 shadow-lg backdrop-blur-sm max-w-4xl mx-auto w-full ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-slate-700/50'
              : 'bg-white/70 border-white/40'
          }`}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''} gap-2`}>
                    {/* Avatar */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'assistant' 
                        ? theme === 'dark'
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        : theme === 'dark'
                          ? 'bg-slate-600'
                          : 'bg-slate-200'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <Bot className="h-4 w-4 text-white" />
                      ) : (
                        <User className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} />
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'assistant'
                        ? theme === 'dark'
                          ? 'bg-slate-700/50 text-slate-200'
                          : 'bg-slate-100 text-slate-700'
                        : theme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      )}
                      {msg.role === 'assistant' && msg.usage && (
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                          {msg.cachedTokens != null && msg.cachedTokens > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-green-700 dark:text-green-300">
                              <Zap className="h-3 w-3" />
                              {msg.cachedTokens} cached
                            </span>
                          )}
                          <span>{msg.usage.totalTokens ?? 0} tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 ${
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                    }`}>
                      <Loader2 className={`h-4 w-4 animate-spin ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="mt-4 shrink-0 max-w-4xl mx-auto w-full">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about your learning topics..."
                  disabled={loading}
                  className={`w-full rounded-2xl border px-5 py-4 pr-12 text-base transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 transition-colors ${
                    input.trim() && !loading
                      ? theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-500'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <p className={`mt-2 text-center text-xs ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Press Enter to send • I have full access to your knowledge graph
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}