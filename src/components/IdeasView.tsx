import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import {
  ComplexityLevel,
  DomainChoice,
  IdeaCount,
  IdeaItem,
  IdeaSketch,
  ProgrammingLanguage,
  ProjectGoal,
} from '../types/idea';
import {
  COMPLEXITY_OPTIONS,
  COUNT_OPTIONS,
  DEFAULT_IDEAS_REQUEST,
  DEFAULT_SKETCH_MODEL,
  DOMAIN_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  sketchToDraftIdea,
} from '../lib/sketches';
import { expandToSpec, requestIdeas, saveDraft } from '../lib/ideasApi';
import { SketchCard } from './SketchCard';

export interface IdeasOptions {
  language: ProgrammingLanguage;
  complexity: ComplexityLevel;
  domain: DomainChoice;
  goal: ProjectGoal;
  count: IdeaCount;
  model: string;
}

export interface SketchBatch {
  sketches: IdeaSketch[];
  isMock: boolean;
  savedDraftIds: Record<string, string>; // sketch id -> saved draft id
}

export const DEFAULT_IDEAS_OPTIONS: IdeasOptions = {
  language: DEFAULT_IDEAS_REQUEST.language,
  complexity: DEFAULT_IDEAS_REQUEST.complexity,
  domain: DEFAULT_IDEAS_REQUEST.domain,
  goal: DEFAULT_IDEAS_REQUEST.goal,
  count: DEFAULT_IDEAS_REQUEST.count,
  model: DEFAULT_SKETCH_MODEL,
};

export const EMPTY_SKETCH_BATCH: SketchBatch = { sketches: [], isMock: false, savedDraftIds: {} };

const MODEL_OPTIONS = [
  { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Fastest)' },
  { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash' },
  { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (Slow)' },
];

interface ChipRowProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}

function ChipRow<T extends string | number>({ label, options, value, onChange, format = String }: ChipRowProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="w-20 flex-shrink-0 pt-1.5 text-xs font-medium text-slate-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                selected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface IdeasViewProps {
  options: IdeasOptions;
  setOptions: (options: IdeasOptions) => void;
  batch: SketchBatch;
  setBatch: React.Dispatch<React.SetStateAction<SketchBatch>>;
  onSaveDraft: (draft: IdeaItem) => void;
  onExpanded: (idea: IdeaItem, draftId?: string) => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({
  options,
  setOptions,
  batch,
  setBatch,
  onSaveDraft,
  onExpanded,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasBatch = batch.sketches.length > 0;

  // Changing any option cancels an in-flight request so a stale batch never lands.
  const updateOptions = (patch: Partial<IdeasOptions>) => {
    abortRef.current?.abort();
    setOptions({ ...options, ...patch });
  };

  const runGenerate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setError('');

    try {
      const { model, ...params } = options;
      const result = await requestIdeas(
        { ...params, avoidTitles: batch.sketches.map((sketch) => sketch.title), model },
        controller.signal
      );
      setBatch({ sketches: result.sketches, isMock: result.isMock, savedDraftIds: {} });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to generate ideas. Please try again.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const handleSave = async (sketch: IdeaSketch) => {
    const draft = await saveDraft(sketchToDraftIdea(sketch));
    onSaveDraft(draft);
    setBatch((prev) => ({ ...prev, savedDraftIds: { ...prev.savedDraftIds, [sketch.id]: draft.id } }));
  };

  const handleExpand = async (sketch: IdeaSketch) => {
    const idea = await expandToSpec(sketch, options.model);
    onExpanded(idea, batch.savedDraftIds[sketch.id]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5 uppercase tracking-wider">
            <span>Idea Lab</span>
            {batch.isMock && (
              <>
                <span>·</span>
                <span className="text-amber-400">Demo mode</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Quick Idea Generator</h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Pick a few options and generate a batch of project ideas. Save the ones you like, or expand one into a full specification.
          </p>
        </div>
        <label className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <span>Model:</span>
          <select
            value={options.model}
            onChange={(e) => updateOptions({ model: e.target.value })}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Parameter chips */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <ChipRow
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={options.language}
          onChange={(language) => updateOptions({ language })}
          format={(language) => (language === 'Any Language' ? 'Any' : language)}
        />
        <ChipRow
          label="Level"
          options={COMPLEXITY_OPTIONS}
          value={options.complexity}
          onChange={(complexity) => updateOptions({ complexity })}
        />
        <ChipRow
          label="Domain"
          options={DOMAIN_OPTIONS}
          value={options.domain}
          onChange={(domain) => updateOptions({ domain })}
          format={(domain) => (domain === 'Any Domain' ? 'Any' : domain)}
        />
        <ChipRow label="Goal" options={GOAL_OPTIONS} value={options.goal} onChange={(goal) => updateOptions({ goal })} />
        <ChipRow label="Ideas" options={COUNT_OPTIONS} value={options.count} onChange={(count) => updateOptions({ count })} />

        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {error ? (
            <p role="alert" className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={runGenerate}
                className="ml-1 inline-flex items-center gap-1 text-rose-300 underline hover:text-rose-200"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            </p>
          ) : (
            <span className="text-[11px] text-slate-500">
              {hasBatch ? 'Generate again for a fresh batch.' : 'The defaults work fine. Just press Generate.'}
            </span>
          )}
          <button
            type="button"
            onClick={runGenerate}
            disabled={isGenerating}
            className="sm:w-56 py-3 px-4 rounded-xl font-semibold text-xs tracking-wide uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{hasBatch ? 'Generate new ideas' : 'Generate ideas'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {isGenerating ? (
        <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: options.count }, (_, index) => (
            <div key={index} className="h-56 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          ))}
        </div>
      ) : hasBatch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {batch.sketches.map((sketch) => (
            <SketchCard
              key={sketch.id}
              sketch={sketch}
              isSaved={!!batch.savedDraftIds[sketch.id]}
              onSave={handleSave}
              onExpand={handleExpand}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 text-slate-500 space-y-3 border border-dashed border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-slate-300">No ideas yet</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Choose your options above, then click <span className="text-emerald-400">Generate ideas</span> to get a batch of project ideas.
          </p>
        </div>
      )}
    </div>
  );
};
