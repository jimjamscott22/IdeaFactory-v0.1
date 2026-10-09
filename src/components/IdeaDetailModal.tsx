import React from 'react';
import {
  X,
  FileCode2,
  MessageSquareCode,
  Bookmark,
  BookmarkCheck,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  Layers,
  Terminal,
} from 'lucide-react';
import { IdeaItem } from '../types/idea';
import { formatIdeaAsMarkdown, formatIdeaAsGitHubIssue, downloadFile } from '../utils/export';

interface IdeaDetailModalProps {
  idea: IdeaItem | null;
  onClose: () => void;
  onOpenInRefiner: (idea: IdeaItem) => void;
  onOpenInChat: (idea: IdeaItem) => void;
  onToggleBookmark: (idea: IdeaItem) => void;
}

export const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({
  idea,
  onClose,
  onOpenInRefiner,
  onOpenInChat,
  onToggleBookmark,
}) => {
  if (!idea) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-emerald-400 font-semibold">{idea.language}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{idea.domain}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-400">{idea.complexity}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {idea.estimatedHours}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">{idea.title}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{idea.tagline}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggleBookmark(idea)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
            >
              {idea.isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: Problem & Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Problem Statement & Motivation
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs">{idea.problemStatement}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Core Architecture Design
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs">{idea.coreArchitecture}</p>
            </div>
          </div>

          {/* Section 2: Tech Stack */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technical Stack & Crates / Libraries
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Language</span>
                <span className="text-emerald-300 font-semibold">{idea.techStack.language}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Framework</span>
                <span className="text-cyan-300">{idea.techStack.framework || 'Standard Library'}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Protocols</span>
                <span className="text-indigo-300 truncate block">{idea.techStack.protocols.join(', ')}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Libraries</span>
                <span className="text-amber-300 truncate block">{idea.techStack.libraries.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Subsystem Flow */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Execution Lifecycle / Data Flow
            </h3>
            <div className="space-y-1.5">
              {idea.architectureFlow.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2.5"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-[10px] text-emerald-400 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Key Challenges */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hurdles & Mitigation Strategies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {idea.keyChallenges.map((c, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-200">{c.title}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{c.description}</p>
                  <div className="text-emerald-400/90 text-[11px] pt-1 border-t border-slate-900">
                    <span className="font-semibold">Mitigation: </span>
                    <span>{c.solutionHint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: MVP Phases */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              MVP Implementation Roadmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {idea.mvpPhases.map((phase, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-emerald-400">
                    <span>{phase.phase}</span>
                    <span className="text-slate-500">{phase.duration}</span>
                  </div>
                  <h4 className="font-semibold text-slate-200 text-xs">{phase.name}</h4>
                  <div className="space-y-0.5 pt-1">
                    {phase.deliverables.map((d, dIdx) => (
                      <div key={dIdx} className="text-[11px] text-slate-400 flex items-start gap-1">
                        <span className="text-slate-600">↳</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Interview talking points */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technical Interview Talking Points
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              {idea.interviewTalkingPoints.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300 text-xs">
                  <span className="text-purple-400 font-bold">#</span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Toolbar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenInRefiner(idea);
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open in Spec Refiner</span>
            </button>
            <button
              onClick={() => {
                onOpenInChat(idea);
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-purple-400" />
              <span>Discuss in AI Chat</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                downloadFile(
                  `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-spec.md`,
                  formatIdeaAsMarkdown(idea)
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </button>
            <button
              onClick={() =>
                downloadFile(
                  `${idea.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-issue.md`,
                  formatIdeaAsGitHubIssue(idea)
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1 transition-colors"
            >
              <span>GitHub Issue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
