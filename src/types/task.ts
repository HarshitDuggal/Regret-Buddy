export type SkipCategory =
  | "genuine"
  | "lazy"
  | "unexpected"
  | "health"
  | "other";

export type HelpingInGrowing =
  | "technical"
  | "music"
  | "physical"
  | "social"
  | "other";

export type Priority = "critical" | "high" | "medium" | "low";

export type TaskStatus = "pending" | "active" | "overdue" | "done" | "skipped";

export type Task = {
  id: string;
  title: string;
  description?: string;

  startTime: string; // HH:mm
  estimatedMinutes: number;
  deadline: string; // HH:mm

  regretMessage: string;

  mandatory: boolean;
  priority: Priority;

  completed: boolean;
  completedAt?: string; // ISO timestamp
  skipped: boolean;
  skippedAt?: string; // ISO timestamp

  skipReason: string;
  skipCategory: SkipCategory;
  helps_in_growing: HelpingInGrowing;

  createdAt: string; // ISO timestamp
  dayKey: string; // 'YYYY-MM-DD' for daily bucketing

  notifiedCount: number; // how many times we nagged
};

/** Persisted daily summary record */
export type DaySummary = {
  dayKey: string; // primary key 'YYYY-MM-DD'
  totalTasks: number;
  completed: number;
  skipped: number;
  skippedReasons: Record<SkipCategory, number>;
  growthBreakdown: Record<HelpingInGrowing, number>;
  streakDay: boolean; // did user complete ≥80%?
};

/** User preferences — singleton record */
export type UserPrefs = {
  id: "singleton";
  notificationsEnabled: boolean;
  reminderIntervalMin: number; // default 5
  dailyResetHour: number; // default 4 (4 AM)
  theme: "dark" | "light"; // dark default
};

/** History entry for undo support */
export type UndoEntry = {
  taskId: string;
  field: "completed" | "skipped";
  previousValue: boolean;
  timestamp: number;
};