import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Download,
  FileCode2,
  GitBranch,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Target,
  UploadCloud,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { IdeaItem } from '../types/idea';
import {
  buildIdeaTimeline,
  formatPhaseWindow,
  setPhaseMilestonesCompleted,
  toggleMilestoneProgress,
} from '../lib/timeline';
import { downloadFile, formatTimelineAsMarkdown, slugifyFilename } from '../utils/export';
import { SaveToDriveModal } from './SaveToDriveModal';
import { ActiveTab } from './Navbar';

interface ProjectTimelineViewProps {
  ideas: IdeaItem[];
  currentIdea: IdeaItem | null;
  onSelectIdea: (idea: IdeaItem) => void;
  onUpdateIdea: (updated: IdeaItem) => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  user: User | null;
  token: string | null;
  onAuthChange: (user: User | null, token: string | null) => void;
}

export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({
  ideas,
  currentIdea,
  onSelectIdea,
  onUpdateIdea,
  onNavigateTab,
  user,
  token,
  onAuthChange,
}) => {
  const selectedIdea = currentIdea || ideas[0] || null;

  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [focusedMilestoneKey, setFocusedMilestoneKey] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Reset phase selection when switching to another idea
  useEffect(() => {
    setSelectedPhaseIndex(0);
    setFocusedMilestoneKey(null);
  }, [selectedIdea?.id]);

  const schedule = useMemo(() => buildIdeaTimeline(selectedIdea), [selectedIdea]);

  // Clamp selectedPhaseIndex safely if phases length shrinks
  const safePhaseIndex =
    schedule.phases.length > 0 ? Math.min(selectedPhaseIndex, schedule.phases.length - 1) : 0;
  const activePhase = schedule.phases[safePhaseIndex] || null;

  const expandedIdeas = useMemo(
    () => ideas.filter((item) => Array.isArray(item.mvpPhases) && item.mvpPhases.length > 0),
    [ideas]
  );

  const handleSelectById = (id: string) => {
    const match = ideas.find((i) => i.id === id);
    if (match) {
      onSelectIdea(match);
    }
  };

  const handleToggleDeliverable = (phaseIndex: number, deliverableIndex: number) => {
    if (!selectedIdea) return;
    const nextProgress = toggleMilestoneProgress(selectedIdea, phaseIndex, deliverableIndex);
    onUpdateIdea({
      ...selectedIdea,
      milestoneProgress: nextProgress,
    });
  };

  const handleToggleEntirePhase = (phaseIndex: number, markCompleted: boolean) => {
    if (!selectedIdea) return;
    const nextProgress = setPhaseMilestonesCompleted(selectedIdea, phaseIndex, markCompleted);
    onUpdateIdea({
      ...selectedIdea,
      milestoneProgress: nextProgress,
    });
  };

  const handleResetAllProgress = () => {
    if (!selectedIdea) return;
    onUpdateIdea({
      ...selectedIdea,
      milestoneProgress: {},
    });
  };

  const handleExportMarkdown = () => {
    if (!selectedIdea || schedule.phases.length === 0) return;
    const content = formatTimelineAsMarkdown(selectedIdea, schedule);
    const filename = `${slugifyFilename(selectedIdea.title)}-timeline.md`;
    downloadFile(filename, content, 'text/markdown');
  };

  const timelineMarkdown = useMemo(() => {
    if (!selectedIdea || schedule.phases.length === 0) return '';
    return formatTimelineAsMarkdown(selectedIdea, schedule);
  }, [selectedIdea, schedule]);

  // Empty state: no ideas at all
  if (!selectedIdea) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
          <CalendarRange className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-slate-100">No Specification Selected</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate or select a project specification to visualize its phased implementation roadmap and track milestone deliverables.
          </p>
        </div>
        {onNavigateTab && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('generator')}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Open Spec Generator</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 sm:max-w-sm w-full">
            <label htmlFor="timeline-idea-select" className="sr-only">
              Select project specification
            </label>
            <select
              id="timeline-idea-select"
              value={selectedIdea.id}
              onChange={(e) => handleSelectById(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/70 truncate"
            >
              {ideas.map((item) => {
                const hasPhases = Array.isArray(item.mvpPhases) && item.mvpPhases.length > 0;
                return (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {!hasPhases ? ' (Draft — No Phases)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Unboxed typographic metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span className="text-slate-200 font-medium">{selectedIdea.language}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedIdea.domain}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedIdea.complexity}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">{selectedIdea.estimatedHours}</span>
          </div>
        </div>

        {/* Single-line Timeline Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {schedule.completedMilestones > 0 && (
            <button
              type="button"
              onClick={handleResetAllProgress}
              className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              title="Clear all milestone checkmarks for this specification"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Progress</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={schedule.phases.length === 0}
            className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Markdown</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDriveModalOpen(true)}
            disabled={schedule.phases.length === 0}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Save to Drive</span>
          </button>
        </div>
      </div>

      {/* Draft / No-Phases Empty State */}
      {schedule.phases.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-base font-semibold text-slate-100">
                No MVP Phases Defined for "{selectedIdea.title}"
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This concept is currently an unexpanded draft without phased deliverables. Expand it into a full technical specification or pick an expanded specification below to view its Gantt roadmap.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(selectedIdea.isDraft ? 'ideas' : 'generator')}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 self-start"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{selectedIdea.isDraft ? 'Expand in Ideas Tab' : 'Generate Phases'}</span>
              </button>
            )}
          </div>

          {expandedIdeas.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <p className="text-xs font-medium text-slate-400">
                Switch to an expanded specification with an implementation roadmap:
              </p>
              <div className="flex flex-wrap gap-2">
                {expandedIdeas.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectIdea(item)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Summary Metrics Strip (Single-elevation flat bar with hairline dividers) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-slate-900/70 border border-slate-800 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            <div className="p-4 sm:px-5 space-y-1">
              <div className="text-xs text-slate-400">Implementation Phases</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
                {schedule.phases.length} Phases
              </div>
            </div>

            <div className="p-4 sm:px-5 space-y-1">
              <div className="text-xs text-slate-400">Estimated Roadmap Span</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
                {schedule.totalDuration} {schedule.unit}
                {schedule.totalDuration === 1 ? '' : 's'}
              </div>
            </div>

            <div className="p-4 sm:px-5 space-y-1">
              <div className="text-xs text-slate-400">Milestones Completed</div>
              <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
                {schedule.completedMilestones} / {schedule.totalMilestones}
              </div>
            </div>

            <div className="p-4 sm:px-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Overall Completion</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  {schedule.progressPercent}%
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={schedule.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Overall roadmap completion"
              >
                <div
                  className="h-full bg-emerald-500 transition-opacity duration-200"
                  style={{ width: `${schedule.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Horizontal Gantt Roadmap Canvas */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Horizontal Gantt Roadmap
                </h2>
                <p className="text-xs text-slate-400">
                  Click any phase bar or milestone node to inspect goals and track deliverables.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Completed</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>In Progress</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Circle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pending</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                {/* Calibrated Time Axis Header */}
                <div className="flex items-center border-b border-slate-800 bg-slate-950/60">
                  <div className="w-72 shrink-0 px-5 py-2.5 text-xs font-medium text-slate-400 border-r border-slate-800">
                    Phase & Duration
                  </div>
                  <div className="flex-1 relative h-9">
                    {schedule.axisTicks.map((tick) => (
                      <div
                        key={tick.value}
                        className="absolute top-0 bottom-0 border-l border-slate-800/80 pl-2 flex items-center"
                        style={{ left: `${tick.percent}%` }}
                      >
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                          {tick.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phase Tracks */}
                <div className="divide-y divide-slate-800/80">
                  {schedule.phases.map((phase) => {
                    const isSelected = phase.index === safePhaseIndex;
                    const windowLabel = formatPhaseWindow(phase, schedule.unit);

                    const barClasses =
                      phase.status === 'completed'
                        ? isSelected
                          ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/40'
                          : 'bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-400/80'
                        : isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                          : 'bg-slate-800/70 border-slate-700 hover:border-slate-500';

                    const fillClasses =
                      phase.status === 'completed' ? 'bg-emerald-500/25' : 'bg-amber-500/20';

                    return (
                      <div
                        key={`${phase.phase}-${phase.index}`}
                        className={`flex items-stretch transition-colors ${
                          isSelected ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                        }`}
                      >
                        {/* Left Phase Label Cell */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhaseIndex(phase.index);
                            setFocusedMilestoneKey(null);
                          }}
                          className="w-72 shrink-0 px-5 py-3.5 text-left border-r border-slate-800 flex flex-col justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono tabular-nums text-amber-400 font-semibold">
                              {phase.phase}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              {phase.completedCount}/{phase.totalCount} done
                            </span>
                          </div>
                          <div
                            className="text-xs font-semibold text-slate-100 truncate"
                            title={phase.name}
                          >
                            {phase.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {windowLabel} · {phase.rawDuration}
                          </div>
                        </button>

                        {/* Right Proportional Gantt Track */}
                        <div className="flex-1 relative py-3.5 px-0 min-h-[76px] flex items-center">
                          {/* Background Vertical Gridlines */}
                          {schedule.axisTicks.map((tick) => (
                            <div
                              key={tick.value}
                              aria-hidden="true"
                              className="absolute top-0 bottom-0 border-l border-slate-800/50 pointer-events-none"
                              style={{ left: `${tick.percent}%` }}
                            />
                          ))}

                          {/* Proportional Phase Duration Bar */}
                          <div
                            onClick={() => {
                              setSelectedPhaseIndex(phase.index);
                              setFocusedMilestoneKey(null);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPhaseIndex(phase.index);
                                setFocusedMilestoneKey(null);
                              }
                            }}
                            aria-label={`${phase.phase}: ${phase.name}, ${windowLabel}, ${phase.completedCount} of ${phase.totalCount} milestones completed`}
                            className={`absolute h-10 rounded-lg border cursor-pointer transition-colors flex items-center overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${barClasses}`}
                            style={{
                              left: `${phase.startPercent}%`,
                              width: `calc(${phase.widthPercent}% - 4px)`,
                              marginLeft: '2px',
                            }}
                          >
                            {/* Completion Progress Fill */}
                            <div
                              className={`absolute inset-y-0 left-0 rounded-l-lg pointer-events-none ${fillClasses}`}
                              style={{ width: `${phase.progressPercent}%` }}
                            />

                            {/* Inline Bar Label */}
                            <div className="relative z-10 px-2.5 flex items-center justify-between w-full gap-2 pointer-events-none">
                              <span className="text-[11px] font-medium text-slate-200 truncate">
                                {phase.rawDuration}
                              </span>
                              <span className="text-[11px] font-mono tabular-nums text-slate-300 shrink-0">
                                {phase.progressPercent}%
                              </span>
                            </div>

                            {/* Interactive Milestone Nodes along Phase Bar */}
                            {phase.milestones.map((milestone) => {
                              const isFocused = focusedMilestoneKey === milestone.key;
                              return (
                                <button
                                  key={milestone.key}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPhaseIndex(phase.index);
                                    setFocusedMilestoneKey(milestone.key);
                                  }}
                                  title={`${milestone.label} (${milestone.completed ? 'Completed' : 'Pending'})`}
                                  aria-label={`Inspect milestone ${milestone.label}`}
                                  style={{ left: `${milestone.barPositionPercent}%` }}
                                  className={`absolute -bottom-2.5 -translate-x-1/2 z-20 w-5 h-5 rounded-full border flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                                    milestone.completed
                                      ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                                      : isFocused
                                        ? 'bg-amber-400 border-amber-100 text-slate-950'
                                        : 'bg-slate-900 border-slate-500 text-slate-300 hover:border-amber-400'
                                  }`}
                                >
                                  {milestone.completed ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Phase & Milestone Inspector */}
          {activePhase && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Primary Milestone Checklist & Phase Goals */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                      <span className="text-amber-400 font-semibold">{activePhase.phase}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatPhaseWindow(activePhase, schedule.unit)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activePhase.rawDuration}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {activePhase.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${
                        activePhase.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : activePhase.status === 'in_progress'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {activePhase.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : activePhase.status === 'in_progress' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {activePhase.status === 'completed'
                          ? 'Completed'
                          : activePhase.status === 'in_progress'
                            ? 'In Progress'
                            : 'Pending'}
                      </span>
                    </span>

                    {activePhase.milestones.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleEntirePhase(
                            activePhase.index,
                            activePhase.status !== 'completed'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        {activePhase.status === 'completed'
                          ? 'Reopen Phase'
                          : 'Complete Phase'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Deliverables Interactive Checklist */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Milestones & Deliverables
                    </h4>
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      {activePhase.completedCount} / {activePhase.totalCount} completed
                    </span>
                  </div>

                  {activePhase.milestones.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      No deliverables listed for this phase.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activePhase.milestones.map((milestone) => {
                        const isFocused = focusedMilestoneKey === milestone.key;
                        return (
                          <button
                            key={milestone.key}
                            type="button"
                            onClick={() => {
                              setFocusedMilestoneKey(milestone.key);
                              handleToggleDeliverable(activePhase.index, milestone.index);
                            }}
                            aria-pressed={milestone.completed}
                            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                              milestone.completed
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-100'
                                : isFocused
                                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  milestone.completed
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                    : 'bg-slate-900 border-slate-700 text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                              <span
                                className={`text-xs leading-snug ${
                                  milestone.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-200'
                                }`}
                              >
                                {milestone.label}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                              M{activePhase.index + 1}.{milestone.index + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Phase Goals */}
                {activePhase.goals.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>Phase Engineering Goals</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {activePhase.goals.map((goal, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="font-mono tabular-nums text-slate-500 shrink-0">
                            0{idx + 1}.
                          </span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Phase Stepper Footer */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={safePhaseIndex === 0}
                    onClick={() => {
                      setSelectedPhaseIndex(Math.max(0, safePhaseIndex - 1));
                      setFocusedMilestoneKey(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous Phase</span>
                  </button>

                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    Phase {safePhaseIndex + 1} of {schedule.phases.length}
                  </span>

                  <button
                    type="button"
                    disabled={safePhaseIndex >= schedule.phases.length - 1}
                    onClick={() => {
                      setSelectedPhaseIndex(
                        Math.min(schedule.phases.length - 1, safePhaseIndex + 1)
                      );
                      setFocusedMilestoneKey(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Next Phase</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Spec Architecture & Risk Context Panel */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
                {selectedIdea.architectureFlow && selectedIdea.architectureFlow.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                      <span>System Architecture Flow</span>
                    </h4>
                    <ol className="space-y-2">
                      {selectedIdea.architectureFlow.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                        >
                          <span className="font-mono tabular-nums text-cyan-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedIdea.keyChallenges && selectedIdea.keyChallenges.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Key Technical Risks</span>
                    </h4>
                    <div className="divide-y divide-slate-800/80">
                      {selectedIdea.keyChallenges.slice(0, 3).map((challenge, idx) => (
                        <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                          <div className="text-xs font-semibold text-slate-200">
                            {challenge.title}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {challenge.solutionHint}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isDriveModalOpen && selectedIdea && (
        <SaveToDriveModal
          key={`${selectedIdea.id}-timeline`}
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          title={`${selectedIdea.title} Timeline`}
          defaultFilename={`${slugifyFilename(selectedIdea.title)}-timeline.md`}
          content={timelineMarkdown}
          mimeType="text/markdown"
          description={`Project timeline and milestone roadmap for ${selectedIdea.title}`}
          user={user}
          token={token}
          onAuthChange={onAuthChange}
        />
      )}
    </div>
  );
};
