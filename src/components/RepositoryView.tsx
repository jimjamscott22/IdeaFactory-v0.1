import React, { useState } from 'react';
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  FileCode2,
  MessageSquareCode,
  Sparkles,
  Trash2,
  Download,
  Share2,
  ExternalLink,
  Plus,
  LayoutGrid,
  List,
  Clock,
  Layers,
} from 'lucide-react';
import {
  IdeaItem,
  ProgrammingLanguage,
  ComplexityLevel,
  DomainCategory,
} from '../types/idea';
import { formatIdeaAsMarkdown, downloadFile } from '../utils/export';

interface RepositoryViewProps {
  ideas: IdeaItem[];
  onSelectIdea: (idea: IdeaItem) => void;
  onOpenInRefiner: (idea: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
  onToggleBookmark: (idea: IdeaItem) => void;
  onDeleteIdea: (id: string) => void;
  onAddNewManualIdea: (idea: IdeaItem) => void;
}

export const RepositoryView: React.FC<RepositoryViewProps> = ({
  ideas,
  onSelectIdea,
  onOpenInRefiner,
  onOpenInChat,
  onToggleBookmark,
  onDeleteIdea,
  onAddNewManualIdea,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('All');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showManualModal, setShowManualModal] = useState(false);

  // Filtered Ideas
  const filteredIdeas = ideas.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.language.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLang = selectedLanguage === 'All' || item.language === selectedLanguage;
    const matchesComp = selectedComplexity === 'All' || item.complexity === selectedComplexity;
    const matchesDomain = selectedDomain === 'All' || item.domain === selectedDomain;
    const matchesBookmarked = !onlyBookmarked || item.isBookmarked;

    return matchesSearch && matchesLang && matchesComp && matchesDomain && matchesBookmarked;
  });

  const languages = ['All', 'Rust', 'Go', 'Python', 'TypeScript', 'C++', 'Zig', 'Elixir'];
  const complexities = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Staff / Distributed'];

  const handleExportAll = () => {
    const jsonStr = JSON.stringify(filteredIdeas, null, 2);
    downloadFile(`ideafactory-export-${Date.now()}.json`, jsonStr, 'application/json');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1.5 uppercase tracking-wider">
            <span>The Repository</span>
            <span>·</span>
            <span>Relational Catalog</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Project Repository</span>
            <span className="text-xs font-mono font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
              {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            A persistent, searchable catalog of software development concepts. Query by language, domain, complexity, or custom architecture tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Catalog (JSON)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts by title, technology, domain, or tags (e.g. Raft, WAL, eBPF)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {/* View toggle & Bookmark toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyBookmarked(!onlyBookmarked)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                onlyBookmarked
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Starred</span>
            </button>

            <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Segment Bars */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 text-xs">Language:</span>
          <div className="flex flex-wrap gap-1">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-slate-800 mx-1 hidden sm:block" />

          <span className="text-slate-400 text-xs">Complexity:</span>
          <div className="flex flex-wrap gap-1">
            {complexities.map((comp) => (
              <button
                key={comp}
                onClick={() => setSelectedComplexity(comp)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedComplexity === comp
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2.5">
                {/* Unboxed Metadata with Typographic Separator */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold">{idea.language}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">{idea.domain}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-amber-400/90">{idea.complexity}</span>
                  </div>

                  <button
                    onClick={() => onToggleBookmark(idea)}
                    className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {idea.isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3
                    onClick={() => onSelectIdea(idea)}
                    className="text-base font-bold text-slate-100 group-hover:text-indigo-300 cursor-pointer transition-colors"
                  >
                    {idea.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {idea.tagline}
                  </p>
                </div>

                {/* Subsystem Flow Sneak Peek */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase block tracking-wider font-sans">
                    Architecture Highlights:
                  </span>
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">
                    {idea.coreArchitecture}
                  </p>
                </div>

                {/* Clean unboxed tags */}
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400 font-mono">
                  {idea.tags.slice(0, 4).map((tag, idx) => (
                    <span key={idx} className="hover:text-indigo-400 transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenInRefiner(idea)}
                    className="px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <FileCode2 className="w-3 h-3 text-cyan-400" />
                    <span>Refine Spec</span>
                  </button>
                  <button
                    onClick={() => onOpenInChat(idea)}
                    className="px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <MessageSquareCode className="w-3 h-3 text-purple-400" />
                    <span>Chat</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      downloadFile(
                        `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-spec.md`,
                        formatIdeaAsMarkdown(idea)
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded border border-transparent hover:border-slate-800"
                    title="Export Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteIdea(idea.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded border border-transparent hover:border-slate-800"
                    title="Delete Idea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Title & Concept</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Complexity</th>
                  <th className="py-3 px-4">Est. Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredIdeas.map((idea) => (
                  <tr key={idea.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{idea.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{idea.tagline}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{idea.language}</td>
                    <td className="py-3 px-4 text-slate-400">{idea.domain}</td>
                    <td className="py-3 px-4 text-amber-400/90 font-mono">{idea.complexity}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{idea.estimatedHours}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectIdea(idea)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onOpenInRefiner(idea)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px]"
                        >
                          Refine
                        </button>
                        <button
                          onClick={() => onDeleteIdea(idea.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredIdeas.length === 0 && (
        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm">No project ideas matched the current filter criteria.</p>
          <p className="text-xs text-slate-600 mt-1">Try clearing your search query or adjusting the language filter.</p>
        </div>
      )}
    </div>
  );
};
