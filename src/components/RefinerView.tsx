import React, { useState } from 'react';
import {
  FileCode2,
  Database,
  AlertOctagon,
  CalendarCheck,
  Award,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Send,
  Download,
  Share2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { IdeaItem } from '../types/idea';
import { downloadFile } from '../utils/export';

interface RefinerViewProps {
  idea: IdeaItem | null;
  onUpdateIdea: (updated: IdeaItem) => void;
  allIdeas: IdeaItem[];
  onSelectIdea: (selected: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
}

type RefinementMode =
  | 'sql_schema'
  | 'pitfalls_edge_cases'
  | 'starter_code'
  | 'implementation_roadmap'
  | 'interview_defense'
  | 'custom_query';

export const RefinerView: React.FC<RefinerViewProps> = ({
  idea,
  onUpdateIdea,
  allIdeas,
  onSelectIdea,
  onOpenInChat,
}) => {
  const [activeMode, setActiveMode] = useState<RefinementMode>('starter_code');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementResult, setRefinementResult] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [copied, setCopied] = useState(false);

  // Pre-seed some default refinement content if not yet generated
  const handleRefine = async (mode: RefinementMode = activeMode, customQ = customQuestion) => {
    if (!idea) return;
    setIsRefining(true);
    setRefinementResult('');

    try {
      const res = await fetch('/api/refine-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          refinementType: mode,
          customQuestion: customQ,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Refinement failed with status ${res.status}`);
      }

      const data = await res.json();
      setRefinementResult(data.content || 'Refinement complete.');
    } catch (err: any) {
      console.error('Refinement error:', err);
      setRefinementResult(`Error during refinement: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (!refinementResult) return;
    navigator.clipboard.writeText(refinementResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modeButtons: { id: RefinementMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'starter_code',
      label: 'Starter Code & Boilerplate',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      desc: 'Idiomatic struct, trait/interface, and main runtime loop',
    },
    {
      id: 'sql_schema',
      label: 'PostgreSQL Relational DDL',
      icon: <Database className="w-4 h-4 text-cyan-400" />,
      desc: 'Tables, foreign keys, indexes, and persistence migrations',
    },
    {
      id: 'pitfalls_edge_cases',
      label: 'Staff Failure Mode Analysis',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
      desc: 'Deadlocks, split-brain, memory leaks, and silent corruptions',
    },
    {
      id: 'implementation_roadmap',
      label: 'Day-by-Day Engineering Plan',
      icon: <CalendarCheck className="w-4 h-4 text-amber-400" />,
      desc: '3-week structured milestones with acceptance tests',
    },
    {
      id: 'interview_defense',
      label: 'Interview Defense & Q&A',
      icon: <Award className="w-4 h-4 text-purple-400" />,
      desc: 'Elevator pitch, trade-off defense, and metric targets',
    },
  ];

  if (!idea) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
          <FileCode2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-200">No Project Selected for Refinement</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Select an existing project from the repository or generate a new concept to perform deep-dive architectural refinement.
        </p>
        {allIdeas.length > 0 && (
          <div className="pt-4 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {allIdeas.slice(0, 4).map((i) => (
              <button
                key={i.id}
                onClick={() => onSelectIdea(i)}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                {i.title}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">
            <span>The Refiner Pipeline</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Prompt Pipeline</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Technical Spec Refiner</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Stress-test your architectural ideas, generate idiomatic starter boilerplate, define PostgreSQL database schemas, and pinpoint elusive production failure modes.
          </p>
        </div>

        {/* Target Idea Selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Project:</span>
          <select
            value={idea.id}
            onChange={(e) => {
              const match = allIdeas.find((i) => i.id === e.target.value);
              if (match) {
                onSelectIdea(match);
                setRefinementResult('');
              }
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 max-w-xs font-mono truncate"
          >
            {allIdeas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title} ({i.language})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Spec Header summary */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-mono mb-1">
            <span className="text-emerald-400 font-semibold">{idea.language}</span>
            <span>·</span>
            <span>{idea.domain}</span>
            <span>·</span>
            <span className="text-amber-400">{idea.complexity}</span>
          </div>
          <h2 className="text-base font-bold text-slate-100">{idea.title}</h2>
          <p className="text-slate-400 mt-0.5 line-clamp-1">{idea.tagline}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onOpenInChat(idea)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            Chat with AI Architect
          </button>
        </div>
      </div>

      {/* Refinement Pipeline Modes */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {modeButtons.map((btn) => {
          const isActive = activeMode === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => {
                setActiveMode(btn.id);
                handleRefine(btn.id);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-800/90 text-slate-100 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/40 hover:text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs text-slate-200">
                  {btn.icon}
                  <span>{btn.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{btn.desc}</p>
              </div>
              <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <span>Execute Pipeline</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Refinement Prompt Bar */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Custom Architecture Inquiry / Specific Subsystem Deep-Dive</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Powered by Gemini 3.8 Flash
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="e.g. How do we prevent torn writes in the WAL when the OS panics? Or write the lock-free queue in Zig..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setActiveMode('custom_query');
                handleRefine('custom_query', customQuestion);
              }
            }}
          />
          <button
            onClick={() => {
              setActiveMode('custom_query');
              handleRefine('custom_query', customQuestion);
            }}
            disabled={isRefining}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRefining ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Analyze</span>
          </button>
        </div>
      </div>

      {/* Refinement Specification Output Console */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-slate-800" />
            <div className="w-3 h-3 rounded-full bg-slate-800" />
            <div className="w-3 h-3 rounded-full bg-slate-800" />
            <span className="ml-2 text-xs font-mono text-slate-400">
              spec-refiner://{idea.language.toLowerCase()}/{idea.id}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {refinementResult && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded border border-slate-800 hover:bg-slate-900 flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() =>
                    downloadFile(
                      `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-refined-${activeMode}.md`,
                      refinementResult
                    )
                  }
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded border border-slate-800 hover:bg-slate-900 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Console Body */}
        <div className="p-6 min-h-[420px] max-h-[700px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed space-y-4">
          {isRefining ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">
                Refining technical specification with Gemini 3.8 Flash pipeline...
              </p>
            </div>
          ) : refinementResult ? (
            <div className="whitespace-pre-wrap selection:bg-cyan-500/30">
              {refinementResult}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <p>No active refinement output yet.</p>
              <p className="text-[11px] text-slate-600">
                Click any of the 5 pipeline buttons above to generate code boilerplate, PostgreSQL schema, failure modes, or day-by-day roadmap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
