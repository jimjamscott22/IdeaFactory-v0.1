import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Bookmark, Check, Clock } from 'lucide-react';
import { IdeaSketch } from '../types/idea';

interface SketchCardProps {
  sketch: IdeaSketch;
  isSaved: boolean;
  onSave: (sketch: IdeaSketch) => Promise<void>;
  onExpand: (sketch: IdeaSketch) => Promise<void>;
}

type CardAction = 'save' | 'expand';

export const SketchCard: React.FC<SketchCardProps> = ({ sketch, isSaved, onSave, onExpand }) => {
  const [busy, setBusy] = useState<CardAction | null>(null);
  const [error, setError] = useState('');

  const run = async (action: CardAction, handler: (sketch: IdeaSketch) => Promise<void>) => {
    setBusy(action);
    setError('');
    try {
      await handler(sketch);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} this idea.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-emerald-400 font-semibold">{sketch.language}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="truncate">{sketch.domain}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            {sketch.estimatedHours}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-100">{sketch.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{sketch.pitch}</p>

        {sketch.whyItFits && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-amber-400/90 font-semibold">{sketch.goal}:</span> {sketch.whyItFits}
          </p>
        )}

        {sketch.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400 font-mono">
            {sketch.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {error && (
          <p role="alert" className="text-[11px] text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => run('save', onSave)}
            disabled={isSaved || busy !== null}
            className="px-3 py-1.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 hover:text-slate-100 hover:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : busy === 'save' ? (
              <span>Saving…</span>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => run('expand', onExpand)}
            disabled={busy !== null}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {busy === 'expand' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Expanding…</span>
              </>
            ) : (
              <>
                <span>Expand to spec</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
