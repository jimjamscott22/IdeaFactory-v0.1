import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Terminal,
  FileCode2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ChatMessage, ChatRole, IdeaItem } from '../types/idea';

interface ChatbotViewProps {
  currentIdeaContext: IdeaItem | null;
  onSelectIdeaContext: (idea: IdeaItem | null) => void;
  allIdeas: IdeaItem[];
}

export const ChatbotView: React.FC<ChatbotViewProps> = ({
  currentIdeaContext,
  onSelectIdeaContext,
  allIdeas,
}) => {
  const [selectedRole, setSelectedRole] = useState<ChatRole>('system_architect');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      content:
        "Hello! I am your IdeaFactory Systems Architect assistant, powered by Gemini 3.8 Flash.\n\nI can help you:\n- Dissect difficult distributed systems protocols (Raft, Paxos, 2PC)\n- Design lock-free data structures, LSM-Trees, and zero-copy pipelines\n- Draft idiomatic Rust traits, Go channels, or Zig memory allocators\n- Simulate tough technical interview questions on your chosen project\n\nHow can we engineer your system today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = inputMessage) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          role: selectedRole,
          currentIdeaContext,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat request failed with status ${res.status}`);
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Error communicating with Gemini: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'model',
        content:
          "Conversation reset. I am ready to review architectures, inspect memory layouts, or draft code blueprints with you.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      },
    ]);
  };

  const rolesConfig: { id: ChatRole; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'system_architect',
      label: 'Systems Architect',
      desc: 'Distributed systems, protocols & performance tradeoffs',
      icon: <Layers className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'principal_engineer',
      label: 'Principal Engineer',
      desc: 'Idiomatic code, low-level memory, zero-alloc fast paths',
      icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'code_reviewer',
      label: 'Code Reviewer',
      desc: 'Concurreny race conditions, memory leaks & security audit',
      icon: <Shield className="w-3.5 h-3.5 text-rose-400" />,
    },
    {
      id: 'interview_coach',
      label: 'Interview Coach',
      desc: 'Staff systems engineering interview Q&A and defense',
      icon: <HelpCircle className="w-3.5 h-3.5 text-purple-400" />,
    },
  ];

  const suggestedPrompts = [
    currentIdeaContext
      ? `How do we handle crash recovery in ${currentIdeaContext.title}?`
      : 'Explain how to design an append-only Write-Ahead Log in Rust.',
    currentIdeaContext
      ? `Write the core ${currentIdeaContext.language} trait/interface for this.`
      : 'What are the main edge cases in distributed Raft leader election?',
    currentIdeaContext
      ? `What would a Staff engineer ask me about this in an interview?`
      : 'Compare LSM-Tree vs B+Tree write amplification tradeoffs.',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1.5 uppercase tracking-wider">
            <span>Conversational Intelligence</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Assistant</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <span>AI Architect & Co-Founder Chat</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            A dedicated multi-turn engineering conversational agent. Discuss systems trade-offs, draft structs and interfaces, stress-test concurrency, and rehearse architectural interviews.
          </p>
        </div>

        {/* Model Picker */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
          <span className="text-slate-400 text-[11px] font-mono pl-1">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (Default)</option>
            <option value="gemini-3.5-flash">gemini-3.5-flash (General)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex)</option>
          </select>
        </div>
      </div>

      {/* Role Switcher Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {rolesConfig.map((role) => {
          const isActive = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-800 text-slate-100 border-purple-500/50 shadow-sm'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200 mb-1">
                {role.icon}
                <span>{role.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{role.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Active Project Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Context Project:</span>
          {currentIdeaContext ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-400 font-mono">
                {currentIdeaContext.title}
              </span>
              <span className="text-slate-500">({currentIdeaContext.language})</span>
              <button
                onClick={() => onSelectIdeaContext(null)}
                className="text-[11px] text-slate-500 hover:text-slate-300 ml-1 underline"
              >
                Clear Context
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 italic">No specific project attached</span>
              {allIdeas.length > 0 && (
                <button
                  onClick={() => onSelectIdeaContext(allIdeas[0])}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                >
                  Attach "{allIdeas[0].title}"
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleResetChat}
          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Thread</span>
        </button>
      </div>

      {/* Chat Thread Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[580px]">
        {/* Messages Scrollable Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-2 ${
                    isUser
                      ? 'bg-purple-600 text-slate-100 rounded-tr-sm'
                      : 'bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono gap-4 pb-1 border-b border-white/10">
                    <span>{isUser ? 'You' : `AI Architect (${msg.modelUsed || selectedModel})`}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed selection:bg-purple-500/30">
                    {msg.content}
                  </div>

                  {!isUser && (
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 text-slate-400 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">Architect is reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] whitespace-nowrap mr-1">Suggested:</span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 text-[11px] rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask the AI Architect about memory models, race conditions, schema design, or code snippets..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
