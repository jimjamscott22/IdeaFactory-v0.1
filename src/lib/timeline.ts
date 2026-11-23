import { IdeaItem, MvpPhase } from '../types/idea';

export type TimelineUnit = 'Week' | 'Day' | 'Hour';

export type PhaseStatus = 'completed' | 'in_progress' | 'pending';

export interface TimelineMilestone {
  key: string;
  index: number;
  label: string;
  completed: boolean;
  /** Percentage position inside the parent phase bar (10..90) */
  barPositionPercent: number;
}

export interface TimelinePhase {
  index: number;
  phase: string;
  name: string;
  rawDuration: string;
  startUnit: number;
  durationUnits: number;
  endUnit: number;
  startPercent: number;
  widthPercent: number;
  goals: string[];
  deliverables: string[];
  milestones: TimelineMilestone[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  status: PhaseStatus;
}

export interface AxisTick {
  value: number;
  label: string;
  percent: number;
}

export interface TimelineSchedule {
  unit: TimelineUnit;
  totalDuration: number;
  axisTicks: AxisTick[];
  phases: TimelinePhase[];
  completedMilestones: number;
  totalMilestones: number;
  progressPercent: number;
}

export function getMilestoneKey(phaseIndex: number, deliverableIndex: number): string {
  return `${phaseIndex}:${deliverableIndex}`;
}

export function parseDurationString(raw?: string): { value: number; unit: TimelineUnit } {
  if (!raw || typeof raw !== 'string') {
    return { value: 1, unit: 'Week' };
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return { value: 1, unit: 'Week' };
  }

  let unit: TimelineUnit = 'Week';
  let multiplier = 1;

  if (/\b(hour|hours|hr|hrs)\b/.test(normalized)) {
    unit = 'Hour';
  } else if (/\b(day|days|d)\b/.test(normalized)) {
    unit = 'Day';
  } else if (/\b(month|months|mo)\b/.test(normalized)) {
    unit = 'Week';
    multiplier = 4;
  } else {
    unit = 'Week';
  }

  // Match ranges like "1-2", "2 – 3", "10 to 15" or single values like "2", "1.5"
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && high >= low) {
      const value = Math.max(0.5, high * multiplier);
      return { value, unit };
    }
  }

  const singleMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    if (Number.isFinite(num) && num > 0) {
      return { value: Math.max(0.5, num * multiplier), unit };
    }
  }

  return { value: 1, unit };
}

function convertDurationToTargetUnit(
  value: number,
  fromUnit: TimelineUnit,
  targetUnit: TimelineUnit
): number {
  if (fromUnit === targetUnit) return value;

  if (targetUnit === 'Week') {
    if (fromUnit === 'Day') return Math.max(0.5, Math.round((value / 5) * 2) / 2);
    if (fromUnit === 'Hour') return Math.max(0.5, Math.round((value / 15) * 2) / 2);
  }

  if (targetUnit === 'Day') {
    if (fromUnit === 'Week') return value * 5;
    if (fromUnit === 'Hour') return Math.max(0.5, Math.round((value / 4) * 2) / 2);
  }

  if (targetUnit === 'Hour') {
    if (fromUnit === 'Week') return value * 15;
    if (fromUnit === 'Day') return value * 4;
  }

  return value;
}

function resolveAxisUnit(parsedDurations: Array<{ value: number; unit: TimelineUnit }>): TimelineUnit {
  if (parsedDurations.some((d) => d.unit === 'Week')) return 'Week';
  if (parsedDurations.some((d) => d.unit === 'Day')) return 'Day';
  return 'Hour';
}

function buildAxisTicks(totalDuration: number, unit: TimelineUnit): AxisTick[] {
  const safeTotal = Math.max(1, totalDuration);
  const roundedTotal = Math.ceil(safeTotal);
  const maxTickLabels = 12;
  const step = roundedTotal > maxTickLabels ? Math.ceil(roundedTotal / maxTickLabels) : 1;

  const ticks: AxisTick[] = [];
  for (let v = 1; v <= roundedTotal; v += step) {
    ticks.push({
      value: v,
      label: `${unit} ${v}`,
      percent: ((v - 1) / safeTotal) * 100,
    });
  }

  if (ticks.length === 0) {
    ticks.push({ value: 1, label: `${unit} 1`, percent: 0 });
  }

  return ticks;
}

export function formatPhaseWindow(
  phase: Pick<TimelinePhase, 'startUnit' | 'endUnit'>,
  unit: TimelineUnit
): string {
  const startLabel = Math.floor(phase.startUnit) + 1;
  const endLabel = Math.max(startLabel, Math.ceil(phase.endUnit));
  if (startLabel === endLabel) {
    return `${unit} ${startLabel}`;
  }
  return `${unit}s ${startLabel}–${endLabel}`;
}

export function buildIdeaTimeline(idea: IdeaItem | null | undefined): TimelineSchedule {
  const rawPhases: MvpPhase[] = Array.isArray(idea?.mvpPhases) ? idea!.mvpPhases : [];
  const progressMap = idea?.milestoneProgress || {};

  if (rawPhases.length === 0) {
    return {
      unit: 'Week',
      totalDuration: 0,
      axisTicks: [],
      phases: [],
      completedMilestones: 0,
      totalMilestones: 0,
      progressPercent: 0,
    };
  }

  const parsed = rawPhases.map((p) => parseDurationString(p.duration));
  const unit = resolveAxisUnit(parsed);
  const normalizedDurations = parsed.map((d) => convertDurationToTargetUnit(d.value, d.unit, unit));
  const totalDuration = normalizedDurations.reduce((acc, d) => acc + d, 0) || 1;

  let cursor = 0;
  let totalMilestones = 0;
  let completedMilestones = 0;

  const phases: TimelinePhase[] = rawPhases.map((rawPhase, phaseIndex) => {
    const durationUnits = normalizedDurations[phaseIndex];
    const startUnit = cursor;
    const endUnit = startUnit + durationUnits;
    cursor = endUnit;

    const deliverables = Array.isArray(rawPhase.deliverables) ? rawPhase.deliverables : [];
    const goals = Array.isArray(rawPhase.goals) ? rawPhase.goals : [];

    const milestones: TimelineMilestone[] = deliverables.map((label, deliverableIndex) => {
      const key = getMilestoneKey(phaseIndex, deliverableIndex);
      const completed = Boolean(progressMap[key]);
      const barPositionPercent =
        deliverables.length === 1
          ? 50
          : 15 + (deliverableIndex / (deliverables.length - 1)) * 70;

      return {
        key,
        index: deliverableIndex,
        label,
        completed,
        barPositionPercent,
      };
    });

    const totalCount = milestones.length;
    const completedCount = milestones.filter((m) => m.completed).length;
    totalMilestones += totalCount;
    completedMilestones += completedCount;

    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    let status: PhaseStatus = 'pending';
    if (totalCount > 0 && completedCount === totalCount) {
      status = 'completed';
    } else if (completedCount > 0) {
      status = 'in_progress';
    }

    return {
      index: phaseIndex,
      phase: rawPhase.phase || `Phase ${phaseIndex + 1}`,
      name: rawPhase.name || `Milestone Phase ${phaseIndex + 1}`,
      rawDuration: rawPhase.duration || `${durationUnits} ${unit}${durationUnits === 1 ? '' : 's'}`,
      startUnit,
      durationUnits,
      endUnit,
      startPercent: (startUnit / totalDuration) * 100,
      widthPercent: (durationUnits / totalDuration) * 100,
      goals,
      deliverables,
      milestones,
      completedCount,
      totalCount,
      progressPercent,
      status,
    };
  });

  const overallProgressPercent =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    unit,
    totalDuration,
    axisTicks: buildAxisTicks(totalDuration, unit),
    phases,
    completedMilestones,
    totalMilestones,
    progressPercent: overallProgressPercent,
  };
}

export function toggleMilestoneProgress(
  idea: IdeaItem,
  phaseIndex: number,
  deliverableIndex: number
): Record<string, boolean> {
  const next = { ...(idea.milestoneProgress || {}) };
  const key = getMilestoneKey(phaseIndex, deliverableIndex);
  if (next[key]) {
    delete next[key];
  } else {
    next[key] = true;
  }
  return next;
}

export function setPhaseMilestonesCompleted(
  idea: IdeaItem,
  phaseIndex: number,
  completed: boolean
): Record<string, boolean> {
  const next = { ...(idea.milestoneProgress || {}) };
  const deliverables = idea.mvpPhases?.[phaseIndex]?.deliverables || [];

  deliverables.forEach((_, deliverableIndex) => {
    const key = getMilestoneKey(phaseIndex, deliverableIndex);
    if (completed) {
      next[key] = true;
    } else {
      delete next[key];
    }
  });

  return next;
}
