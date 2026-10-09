import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Download,
  Share2,
  FileCode2,
  MessageSquareCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Code2,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  IdeaItem,
  ProgrammingLanguage,
  ComplexityLevel,
  DomainCategory,
} from '../types/idea';
import { formatIdeaAsMarkdown, formatIdeaAsGitHubIssue, downloadFile } from '../utils/export';

interface GeneratorViewProps {
  currentIdea: IdeaItem | null;
  setCurrentIdea: (idea: IdeaItem) => void;
  onOpenInRefiner: (idea: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
  onToggleBookmark: (idea: IdeaItem) => void;
  isBookmarked: boolean;
}

const LANGUAGES: ProgrammingLanguage[] = [
  'Rust',
  'Go',
  'Python',
  'TypeScript',
  'C++',
  'Zig',
  'Elixir',
  'Kotlin',
  'Swift',
  'Haskell',
  'Any Language',
];

const COMPLEXITIES: ComplexityLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Staff / Distributed',
];

const DOMAINS: DomainCategory[] = [
  'Distributed Systems',
  'Database Engines',
  'AI Agents & MCP',
  'Networking Protocols',
  'CLI & DevTools',
  'Compilers & Interpreters',
  'Security & Cryptography',
  'Real-Time & Streaming',
  'Systems & OS / eBPF',
  'Full-Stack Architecture',
];

const COMMON_CONSTRAINTS = [
  'Zero external dependencies (pure stdlib)',
  'High throughput (<1ms p99 latency)',
  'Write-Ahead Log (WAL) crash durability',
  'Model Context Protocol (MCP) compliant',
  'Linux io_uring / non-blocking I/O',
  'Terminal TUI dashboard included',
  'Lock-free or message-passing concurrency',
];

export const GeneratorView: React.FC<GeneratorViewProps> = ({
  currentIdea,
  setCurrentIdea,
  onOpenInRefiner,
  onOpenInChat,
  onToggleBookmark,
  isBookmarked,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('Rust');
  const [selectedComplexity, setSelectedComplexity] = useState<ComplexityLevel>('Advanced');
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>('Distributed Systems');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([
    'Write-Ahead Log (WAL) crash durability',
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'challenges' | 'roadmap' | 'interview'>('overview');
  const [copiedStatus, setCopiedStatus] = useState('');

  const toggleConstraint = (item: string) => {
    setSelectedConstraints((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleGenerate = async (presetSeed?: {
    lang: ProgrammingLanguage;
    comp: ComplexityLevel;
    dom: DomainCategory;
    prompt: string;
  }) => {
    setIsGenerating(true);
    setErrorMsg('');

    const lang = presetSeed ? presetSeed.lang : selectedLanguage;
    const comp = presetSeed ? presetSeed.comp : selectedComplexity;
    const dom = presetSeed ? presetSeed.dom : selectedDomain;
    const pmt = presetSeed ? presetSeed.prompt : customPrompt;

    if (presetSeed) {
      setSelectedLanguage(lang);
      setSelectedComplexity(comp);
      setSelectedDomain(dom);
      setCustomPrompt(pmt);
    }

    try {
      const res = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          complexity: comp,
          domain: dom,
          customPrompt: pmt,
          constraints: selectedConstraints,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Generation failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.idea) {
        setCurrentIdea(data.idea);
      }
    } catch (err: any) {
      console.error('Error generating idea:', err);
      setErrorMsg(err.message || 'Failed to generate idea. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!currentIdea) return;
    const md = formatIdeaAsMarkdown(currentIdea);
    navigator.clipboard.writeText(md);
    setCopiedStatus('Markdown Copied!');
    setTimeout(() => setCopiedStatus(''), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5 uppercase tracking-wider">
            <span>Intelligence Layer</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Engine</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Software Project Generator
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Synthesize authentic, architect-grade software engineering project concepts tailored to your chosen language, system domain, and technical complexity.
          </p>
        </div>

        {/* Quick Inspiration Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-xs mr-1 hidden lg:inline">Quick Ingest:</span>
          <button
            onClick={() =>
              handleGenerate({
                lang: 'Go',
                comp: 'Advanced',
                dom: 'Distributed Systems',
                prompt: 'Distributed Raft Consensus KV store with snapshots and gRPC',
              })
            }
            className="px-2.5 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Go Raft Cluster
          </button>
          <button
            onClick={() =>
              handleGenerate({
                lang: 'Rust',
                comp: 'Staff / Distributed',
                dom: 'Database Engines',
                prompt: 'LSM-Tree storage engine with Bloom filters and WAL compaction',
              })
            }
            className="px-2.5 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Rust LSM-Tree
          </button>
          <button
            onClick={() =>
              handleGenerate({
                lang: 'Python',
                comp: 'Intermediate',
                dom: 'AI Agents & MCP',
                prompt: 'Model Context Protocol (MCP) server for AST parsing and test execution',
              })
            }
            className="px-2.5 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Python MCP Agent
          </button>
          <button
            onClick={() =>
              handleGenerate({
                lang: 'Zig',
                comp: 'Advanced',
                dom: 'Networking Protocols',
                prompt: 'Zero-allocation HTTP/2 and WebSocket reverse proxy with io_uring',
              })
            }
            className="px-2.5 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Zig Edge Proxy
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) & Active Spec Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Parameter Configuration Workbench */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Generation Parameters
            </h2>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex)</option>
              </select>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Primary Programming Language
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    selectedLanguage === lang
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Complexity Level */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Technical Complexity Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMPLEXITIES.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedComplexity(lvl)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                    selectedComplexity === lvl
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold">{lvl}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {lvl === 'Beginner' && 'Idiomatic stdlib & clean syntax'}
                    {lvl === 'Intermediate' && 'Production-ready architecture'}
                    {lvl === 'Advanced' && 'Concurrency, protocols & memory'}
                    {lvl === 'Staff / Distributed' && 'Consensus, kernels & zero-copy'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Domain Category */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Technical Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value as DomainCategory)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Seed Vision */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Specific Angle or Subsystem Focus</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Include zero-copy ring buffers, distributed snapshots, Jepsen fault-injection, or a custom bytecode VM..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none font-mono"
            />
          </div>

          {/* Architectural Constraints */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Architectural Constraints & Requirements
            </label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {COMMON_CONSTRAINTS.map((constraint) => {
                const active = selectedConstraints.includes(constraint);
                return (
                  <button
                    key={constraint}
                    type="button"
                    onClick={() => toggleConstraint(constraint)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-left transition-colors border ${
                      active
                        ? 'bg-slate-800/90 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:text-slate-300 hover:border-slate-800'
                    }`}
                  >
                    <span className="truncate pr-2">{constraint}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                        active ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700'
                      }`}
                    >
                      {active ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wide uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Architecture Spec...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Project Specification</span>
                </>
              )}
            </button>
            {errorMsg && (
              <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Generated Specification Blueprint */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm min-h-[640px] flex flex-col justify-between">
          {currentIdea ? (
            <div className="space-y-6">
              {/* Card Header & Unboxed Metadata per Zero-Pill Rules */}
              <div className="space-y-3 pb-5 border-b border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-emerald-400 font-semibold">{currentIdea.language}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>{currentIdea.domain}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-amber-400/90">{currentIdea.complexity}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {currentIdea.estimatedHours}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleBookmark(currentIdea)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isBookmarked
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark Idea'}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCopyMarkdown}
                      className="p-1.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 text-xs transition-colors"
                      title="Copy Markdown"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        downloadFile(
                          `${currentIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-spec.md`,
                          formatIdeaAsMarkdown(currentIdea)
                        )
                      }
                      className="p-1.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 text-xs transition-colors"
                      title="Download Markdown Spec"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                    {currentIdea.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed font-normal">
                    {currentIdea.tagline}
                  </p>
                </div>

                {copiedStatus && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{copiedStatus}</span>
                  </div>
                )}
              </div>

              {/* Spec Breakdown Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
                {[
                  { id: 'overview', label: 'Architecture & Stack' },
                  { id: 'flow', label: 'Data Flow' },
                  { id: 'challenges', label: 'Key Challenges' },
                  { id: 'roadmap', label: 'MVP Roadmap' },
                  { id: 'interview', label: 'Portfolio & Interview' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="space-y-4 min-h-[300px]">
                {/* 1. Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Problem Statement & Value
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        {currentIdea.problemStatement}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Core Architecture Blueprint
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        {currentIdea.coreArchitecture}
                      </p>
                    </div>

                    {/* Tech Stack Component Breakdown */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Technical Stack Blueprint
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                          <span className="text-slate-400 text-[11px] block">Primary Language</span>
                          <span className="text-emerald-300 font-semibold">{currentIdea.techStack.language}</span>
                        </div>
                        {currentIdea.techStack.framework && (
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <span className="text-slate-400 text-[11px] block">Framework / Runtime</span>
                            <span className="text-cyan-300 font-semibold">{currentIdea.techStack.framework}</span>
                          </div>
                        )}
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                          <span className="text-slate-400 text-[11px] block">Protocols</span>
                          <span className="text-indigo-300">{currentIdea.techStack.protocols.join(', ')}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                          <span className="text-slate-400 text-[11px] block">Key Crates / Libraries</span>
                          <span className="text-amber-300">{currentIdea.techStack.libraries.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Architecture Data Flow */}
                {activeTab === 'flow' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      End-to-End Execution Lifecycle
                    </h3>
                    <div className="space-y-2">
                      {currentIdea.architectureFlow.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-[11px] text-emerald-400 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-slate-300 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Key Challenges */}
                {activeTab === 'challenges' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Technical Hurdles & Mitigation Strategies
                    </h3>
                    <div className="space-y-2.5">
                      {currentIdea.keyChallenges.map((challenge, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>{challenge.title}</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {challenge.description}
                          </p>
                          <div className="pt-1.5 border-t border-slate-900 flex items-start gap-1.5 text-emerald-300/90 text-[11px]">
                            <span className="font-semibold text-emerald-400">Mitigation:</span>
                            <span>{challenge.solutionHint}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. MVP Roadmap */}
                {activeTab === 'roadmap' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Phased Implementation Plan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {currentIdea.mvpPhases.map((phase, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                              <span>{phase.phase}</span>
                              <span className="text-slate-400">{phase.duration}</span>
                            </div>
                            <h4 className="font-semibold text-slate-200 text-xs mt-0.5">
                              {phase.name}
                            </h4>
                            <div className="mt-2 space-y-1">
                              <span className="text-[10px] uppercase font-mono text-slate-400">Deliverables:</span>
                              {phase.deliverables.map((del, dIdx) => (
                                <div key={dIdx} className="text-[11px] text-slate-300 flex items-start gap-1">
                                  <span className="text-slate-600">↳</span>
                                  <span>{del}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Interview & Portfolio */}
                {activeTab === 'interview' && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Technical Interview Talking Points
                      </h3>
                      <div className="space-y-2">
                        {currentIdea.interviewTalkingPoints.map((pt, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 leading-relaxed flex items-start gap-2"
                          >
                            <span className="text-purple-400 font-bold">#</span>
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Core Computer Science Competencies Mastered
                      </h3>
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                        {currentIdea.learningOutcomes.map((lo, idx) => (
                          <div key={idx} className="text-slate-300 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{lo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Call to Actions: Push into Refiner or Chat */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenInRefiner(currentIdea)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deep Dive in Spec Refiner</span>
                  </button>
                  <button
                    onClick={() => onOpenInChat(currentIdea)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    <MessageSquareCode className="w-3.5 h-3.5 text-purple-400" />
                    <span>Discuss with AI Architect</span>
                  </button>
                </div>

                <button
                  onClick={() =>
                    downloadFile(
                      `${currentIdea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-issue.md`,
                      formatIdeaAsGitHubIssue(currentIdea)
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  <span>Export GitHub Issue Template</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-slate-300">
                Ready to Brainstorm Your Next System
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select your language, complexity, and domain on the left, then click{' '}
                <span className="text-emerald-400">Generate Project Specification</span> to synthesize an architect-grade blueprint using Gemini 3.8 Flash.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
