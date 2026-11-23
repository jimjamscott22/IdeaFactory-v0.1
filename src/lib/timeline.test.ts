import { describe, it, expect } from 'vitest';
import {
  buildIdeaTimeline,
  getMilestoneKey,
  parseDurationString,
  setPhaseMilestonesCompleted,
  toggleMilestoneProgress,
  formatPhaseWindow,
} from './timeline';
import { formatTimelineAsMarkdown } from '../utils/export';
import { SEED_IDEAS } from '../data/seedIdeas';
import { IdeaItem } from '../types/idea';

describe('parseDurationString', () => {
  it('parses week ranges using conservative upper bound', () => {
    expect(parseDurationString('1-2 Weeks')).toEqual({ value: 2, unit: 'Week' });
    expect(parseDurationString('2-3 Weeks')).toEqual({ value: 3, unit: 'Week' });
    expect(parseDurationString('2 – 4 weeks')).toEqual({ value: 4, unit: 'Week' });
  });

  it('parses days, hours, and months', () => {
    expect(parseDurationString('3-5 Days')).toEqual({ value: 5, unit: 'Day' });
    expect(parseDurationString('10-15 hours')).toEqual({ value: 15, unit: 'Hour' });
    expect(parseDurationString('1 month')).toEqual({ value: 4, unit: 'Week' });
  });

  it('falls back safely when duration is missing or malformed', () => {
    expect(parseDurationString(undefined)).toEqual({ value: 1, unit: 'Week' });
    expect(parseDurationString('')).toEqual({ value: 1, unit: 'Week' });
    expect(parseDurationString('TBD')).toEqual({ value: 1, unit: 'Week' });
  });
});

describe('buildIdeaTimeline', () => {
  it('computes cumulative proportional phase bars for RaftSync seed idea', () => {
    const raft = SEED_IDEAS[0];
    const schedule = buildIdeaTimeline(raft);

    expect(schedule.unit).toBe('Week');
    expect(schedule.totalDuration).toBe(7); // 2 + 3 + 2
    expect(schedule.phases).toHaveLength(3);

    expect(schedule.phases[0].startUnit).toBe(0);
    expect(schedule.phases[0].endUnit).toBe(2);
    expect(schedule.phases[1].startUnit).toBe(2);
    expect(schedule.phases[1].endUnit).toBe(5);
    expect(schedule.phases[2].startUnit).toBe(5);
    expect(schedule.phases[2].endUnit).toBe(7);

    const totalWidth = schedule.phases.reduce((sum, p) => sum + p.widthPercent, 0);
    expect(Math.round(totalWidth)).toBe(100);
    expect(schedule.axisTicks.map((t) => t.label)).toEqual([
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
      'Week 5',
      'Week 6',
      'Week 7',
    ]);
  });

  it('normalizes mixed day and week durations onto a common Week axis', () => {
    const mixedIdea: IdeaItem = {
      ...SEED_IDEAS[0],
      mvpPhases: [
        {
          phase: 'Phase 1',
          name: 'Setup',
          duration: '2-3 Days',
          goals: ['Boot'],
          deliverables: ['Repo'],
        },
        {
          phase: 'Phase 2',
          name: 'Core',
          duration: '2 Weeks',
          goals: ['Build'],
          deliverables: ['Engine'],
        },
      ],
    };

    const schedule = buildIdeaTimeline(mixedIdea);
    expect(schedule.unit).toBe('Week');
    expect(schedule.phases[0].durationUnits).toBe(0.5);
    expect(schedule.phases[1].durationUnits).toBe(2);
    expect(schedule.totalDuration).toBe(2.5);
  });

  it('tracks completed milestones and phase status accurately', () => {
    const idea: IdeaItem = {
      ...SEED_IDEAS[0],
      milestoneProgress: {
        [getMilestoneKey(0, 0)]: true,
        [getMilestoneKey(0, 1)]: true,
        [getMilestoneKey(0, 2)]: true,
        [getMilestoneKey(1, 0)]: true,
      },
    };

    const schedule = buildIdeaTimeline(idea);
    expect(schedule.phases[0].status).toBe('completed');
    expect(schedule.phases[0].progressPercent).toBe(100);
    expect(schedule.phases[1].status).toBe('in_progress');
    expect(schedule.phases[1].completedCount).toBe(1);
    expect(schedule.phases[2].status).toBe('pending');
    expect(schedule.completedMilestones).toBe(4);
    expect(schedule.totalMilestones).toBe(8);
    expect(schedule.progressPercent).toBe(50);
  });

  it('handles empty or draft ideas without phases gracefully', () => {
    const draftIdea: IdeaItem = {
      ...SEED_IDEAS[0],
      isDraft: true,
      mvpPhases: [],
    };
    const schedule = buildIdeaTimeline(draftIdea);
    expect(schedule.phases).toHaveLength(0);
    expect(schedule.totalDuration).toBe(0);
    expect(schedule.progressPercent).toBe(0);
  });
});

describe('milestone progress mutations and Markdown export', () => {
  it('toggles single milestone and toggles entire phase cleanly', () => {
    const base = { ...SEED_IDEAS[0], milestoneProgress: undefined };

    const afterToggleOn = toggleMilestoneProgress(base, 0, 1);
    expect(afterToggleOn['0:1']).toBe(true);

    const afterToggleOff = toggleMilestoneProgress(
      { ...base, milestoneProgress: afterToggleOn },
      0,
      1
    );
    expect(afterToggleOff['0:1']).toBeUndefined();

    const afterPhaseDone = setPhaseMilestonesCompleted(base, 0, true);
    expect(afterPhaseDone).toEqual({ '0:0': true, '0:1': true, '0:2': true });

    const afterPhaseReset = setPhaseMilestonesCompleted(
      { ...base, milestoneProgress: afterPhaseDone },
      0,
      false
    );
    expect(afterPhaseReset).toEqual({});
  });

  it('formats phase windows and exports Markdown checklist reflecting completion state', () => {
    const idea: IdeaItem = {
      ...SEED_IDEAS[0],
      milestoneProgress: { '0:0': true },
    };
    const schedule = buildIdeaTimeline(idea);
    expect(formatPhaseWindow(schedule.phases[0], schedule.unit)).toBe('Weeks 1–2');
    expect(formatPhaseWindow(schedule.phases[1], schedule.unit)).toBe('Weeks 3–5');

    const md = formatTimelineAsMarkdown(idea, schedule);
    expect(md).toContain(`# ${idea.title} — Project Timeline & Milestones`);
    expect(md).toContain('Total Roadmap Span:** 7 Weeks');
    expect(md).toContain('- [x] Binary write-ahead log file');
    expect(md).toContain('- [ ] In-memory SkipList or B-Tree');
  });
});
