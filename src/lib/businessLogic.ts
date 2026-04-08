/**
 * Pure business logic functions — no side effects, easily testable.
 * These never touch the DOM, IDB, or any external state.
 */
import dayjs from "dayjs";
import type {
  Task,
  TaskStatus,
  DaySummary,
  SkipCategory,
  HelpingInGrowing,
  Priority,
} from "@/types/task";

// ────────────────────────────────────────────
// Day bucketing
// ────────────────────────────────────────────

/** Returns the dayKey (YYYY-MM-DD) for a given date, accounting for the daily reset hour. */
export function calculateDayKey(
  date: Date = new Date(),
  resetHour: number = 4
): string {
  const d = dayjs(date);
  // If it's before the reset hour, it still counts as "yesterday"
  if (d.hour() < resetHour) {
    return d.subtract(1, "day").format("YYYY-MM-DD");
  }
  return d.format("YYYY-MM-DD");
}

/** Get today's dayKey based on current time and reset hour */
export function getTodayKey(resetHour: number = 4): string {
  return calculateDayKey(new Date(), resetHour);
}

// ────────────────────────────────────────────
// Task status
// ────────────────────────────────────────────

/** Determine real-time status of a task based on current time */
export function getTaskStatus(task: Task): TaskStatus {
  if (task.completed) return "done";
  if (task.skipped) return "skipped";

  const now = dayjs();
  const [startH, startM] = task.startTime.split(":").map(Number);
  const start = now.hour(startH).minute(startM).second(0);
  const end = start.add(task.estimatedMinutes, "minute");

  if (now.isBefore(start)) return "pending";
  if (now.isAfter(end)) return "overdue";
  return "active";
}

/** Get minutes remaining for an active task, or minutes overdue */
export function getTaskTimeInfo(task: Task): {
  minutesRemaining: number;
  minutesOverdue: number;
  isOverdue: boolean;
} {
  const now = dayjs();
  const [startH, startM] = task.startTime.split(":").map(Number);
  const start = now.hour(startH).minute(startM).second(0);
  const end = start.add(task.estimatedMinutes, "minute");

  if (now.isAfter(end)) {
    return {
      minutesRemaining: 0,
      minutesOverdue: now.diff(end, "minute"),
      isOverdue: true,
    };
  }

  return {
    minutesRemaining: end.diff(now, "minute"),
    minutesOverdue: 0,
    isOverdue: false,
  };
}

// ────────────────────────────────────────────
// Sorting
// ────────────────────────────────────────────

const STATUS_ORDER: Record<TaskStatus, number> = {
  overdue: 0,
  active: 1,
  pending: 2,
  done: 3,
  skipped: 4,
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Sort tasks: overdue first, then by priority, then by start time */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusA = STATUS_ORDER[getTaskStatus(a)];
    const statusB = STATUS_ORDER[getTaskStatus(b)];
    if (statusA !== statusB) return statusA - statusB;

    const prioA = PRIORITY_ORDER[a.priority];
    const prioB = PRIORITY_ORDER[b.priority];
    if (prioA !== prioB) return prioA - prioB;

    return a.startTime.localeCompare(b.startTime);
  });
}

// ────────────────────────────────────────────
// Day summary computation
// ────────────────────────────────────────────

const EMPTY_SKIP_REASONS: Record<SkipCategory, number> = {
  genuine: 0,
  lazy: 0,
  unexpected: 0,
  health: 0,
  other: 0,
};

const EMPTY_GROWTH: Record<HelpingInGrowing, number> = {
  technical: 0,
  music: 0,
  physical: 0,
  social: 0,
  other: 0,
};

/** Compute aggregate summary for a set of tasks from one day */
export function computeDaySummary(
  dayKey: string,
  tasks: Task[]
): DaySummary {
  const completed = tasks.filter((t) => t.completed).length;
  const skipped = tasks.filter((t) => t.skipped).length;
  const total = tasks.length;

  const skippedReasons = { ...EMPTY_SKIP_REASONS };
  const growthBreakdown = { ...EMPTY_GROWTH };

  for (const t of tasks) {
    if (t.skipped) {
      skippedReasons[t.skipCategory] =
        (skippedReasons[t.skipCategory] || 0) + 1;
    }
    if (t.completed) {
      growthBreakdown[t.helps_in_growing] =
        (growthBreakdown[t.helps_in_growing] || 0) + 1;
    }
  }

  const completionRate = total > 0 ? completed / total : 0;

  return {
    dayKey,
    totalTasks: total,
    completed,
    skipped,
    skippedReasons,
    growthBreakdown,
    streakDay: completionRate >= 0.8, // 80% completion = streak day
  };
}

/** Check if a day summary qualifies as a streak day */
export function isStreakDay(summary: DaySummary): boolean {
  return summary.streakDay;
}

/** Compute current streak length from an array of day summaries (newest first) */
export function computeCurrentStreak(summaries: DaySummary[]): number {
  // Sort by dayKey descending
  const sorted = [...summaries].sort((a, b) =>
    b.dayKey.localeCompare(a.dayKey)
  );

  let streak = 0;
  let expectedDate = dayjs();

  for (const summary of sorted) {
    const summaryDate = dayjs(summary.dayKey);
    const diff = expectedDate.diff(summaryDate, "day");

    // Allow gap of 1 day (today might not be over yet)
    if (diff > 1) break;

    if (summary.streakDay) {
      streak++;
      expectedDate = summaryDate.subtract(1, "day");
    } else if (diff === 0) {
      // Today isn't over, skip it
      continue;
    } else {
      break;
    }
  }

  return streak;
}

// ────────────────────────────────────────────
// Progress
// ────────────────────────────────────────────

/** Calculate daily completion percentage (0-100) */
export function computeCompletionPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.completed).length;
  return Math.round((done / tasks.length) * 100);
}

/** Group tasks by their current status */
export function groupTasksByStatus(
  tasks: Task[]
): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    overdue: [],
    active: [],
    pending: [],
    done: [],
    skipped: [],
  };

  for (const task of tasks) {
    groups[getTaskStatus(task)].push(task);
  }

  return groups;
}
