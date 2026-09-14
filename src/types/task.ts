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

/** Days of the week for routine task scheduling */
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

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

  // ── New: Notify Before (Feature 3.3) ──
  notifyBeforeMin: number; // 0 = off, otherwise minutes before startTime
  preNotified: boolean; // whether the "before" notification has already fired

  // ── New: Task Lists & Routines (Feature 3.4) ──
  taskListId: string; // which list this belongs to ("general" by default)
  sourceRoutineTaskId?: string; // if cloned from a routine template, reference the source
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
  hasSeenV2ReleaseNotes?: boolean;
  newsletterEmail?: string;
  fcmToken?: string;
  fcmEnabled?: boolean;
};

/** History entry for undo support */
export type UndoEntry = {
  taskId: string;
  field: "completed" | "skipped";
  previousValue: boolean;
  timestamp: number;
};

// ════════════════════════════════════════════
// New types for Task Lists & Routines (Feature 3.4)
// ════════════════════════════════════════════

/** A named task list / routine template */
export type TaskList = {
  id: string;
  name: string; // e.g. "Vacation Mode", "Normal Week"
  description?: string;
  emoji: string; // visual identifier, e.g. "🏖️"
  isDefault: boolean; // true only for the "General" list
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

/** A template task within a routine (not a live task) */
export type RoutineTask = {
  id: string;
  taskListId: string; // FK to TaskList.id
  title: string;
  description?: string;
  startTime: string; // HH:mm
  estimatedMinutes: number;
  regretMessage: string;
  mandatory: boolean;
  priority: Priority;
  helps_in_growing: HelpingInGrowing;
  notifyBeforeMin: number;
  order: number; // for manual sorting within the list
  days: DayOfWeek[]; // which days of the week this task should appear on
};

/** Singleton: tracks which routine is currently active */
export type ActiveRoutineConfig = {
  id: "singleton";
  activeTaskListId: string | null; // null = General only, string = a custom routine ID
  appliedDayKey: string; // dayKey when tasks were last cloned from this routine
};