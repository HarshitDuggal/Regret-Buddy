/**
 * Zustand store — Day-partitioned, with undo support and computed state.
 * Only loads current day's tasks to avoid scaling issues.
 */
import { create } from "zustand";
import type { Task, DaySummary, UserPrefs, UndoEntry } from "@/types/task";
import {
  addTask,
  getTasksByDay,
  getDB,
  saveDaySummary,
  getDaySummary as fetchDaySummary,
  getAllDaySummaries,
  getPrefs,
  savePrefs,
  migrateV1Tasks,
} from "@/lib/db";
import {
  getTodayKey,
  computeDaySummary,
  computeCurrentStreak,
  sortTasks,
  computeCompletionPercent,
} from "@/lib/businessLogic";
import { pickRageMessage } from "@/lib/rageMessages";

type ToastType = "success" | "error" | "rage" | "info";

interface AppState {
  // ── Data ──
  tasks: Task[];
  daySummary: DaySummary | null;
  streak: number;
  prefs: UserPrefs;
  currentDayKey: string;

  // ── UI ──
  isLoading: boolean;
  toast: { message: string; type: ToastType; undoId?: string } | null;
  undoStack: UndoEntry[];

  // ── Derived (computed on state change) ──
  completionPercent: number;
  dailySkipCount: number;

  // ── Actions ──
  initialize: () => Promise<void>;
  loadDay: (dayKey?: string) => Promise<void>;
  createTask: (task: Task) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  skipTask: (id: string, reason: string, category: Task["skipCategory"]) => Promise<void>;
  undoAction: (taskId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updatePrefs: (partial: Partial<UserPrefs>) => Promise<void>;
  showToast: (message: string, type: ToastType, undoId?: string) => void;
  clearToast: () => void;
}

export const useTaskStore = create<AppState>((set, get) => ({
  // ── Initial state ──
  tasks: [],
  daySummary: null,
  streak: 0,
  prefs: {
    id: "singleton",
    notificationsEnabled: true,
    reminderIntervalMin: 5,
    dailyResetHour: 4,
    theme: "dark",
  },
  currentDayKey: getTodayKey(),
  isLoading: true,
  toast: null,
  undoStack: [],
  completionPercent: 0,
  dailySkipCount: 0,

  // ── Initialize app (call once on mount) ──
  initialize: async () => {
    // Guard against double-init
    if (!get().isLoading) return;

    try {
      // Run v1 migration if needed
      await migrateV1Tasks();

      // Load prefs
      const prefs = await getPrefs();
      const dayKey = getTodayKey(prefs.dailyResetHour);

      // Load today's tasks
      const tasks = await getTasksByDay(dayKey);
      const sorted = sortTasks(tasks);

      // Load or compute day summary
      let daySummary = await fetchDaySummary(dayKey);
      if (!daySummary && tasks.length > 0) {
        daySummary = computeDaySummary(dayKey, tasks);
        await saveDaySummary(daySummary);
      }

      // Compute streak
      const allSummaries = await getAllDaySummaries();
      const streak = computeCurrentStreak(allSummaries);

      set({
        tasks: sorted,
        daySummary,
        streak,
        prefs,
        currentDayKey: dayKey,
        isLoading: false,
        completionPercent: computeCompletionPercent(sorted),
        dailySkipCount: sorted.filter((t) => t.skipped).length,
      });
    } catch (err) {
      console.error("[RegretBuddy] Initialize failed:", err);
      // Still mark loading as done so the app renders (empty state)
      set({ isLoading: false });
    }
  },

  // ── Load tasks for a specific day ──
  loadDay: async (dayKey?: string) => {
    const { prefs } = get();
    const key = dayKey ?? getTodayKey(prefs.dailyResetHour);
    const tasks = await getTasksByDay(key);
    const sorted = sortTasks(tasks);
    const daySummary = computeDaySummary(key, sorted);

    set({
      tasks: sorted,
      daySummary,
      currentDayKey: key,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: sorted.filter((t) => t.skipped).length,
    });
  },

  // ── Create a new task ──
  createTask: async (task) => {
    await addTask(task);
    const { currentDayKey } = get();

    // If the task belongs to current day, refresh
    if (task.dayKey === currentDayKey) {
      const tasks = await getTasksByDay(currentDayKey);
      const sorted = sortTasks(tasks);
      const daySummary = computeDaySummary(currentDayKey, sorted);
      await saveDaySummary(daySummary);

      set({
        tasks: sorted,
        daySummary,
        completionPercent: computeCompletionPercent(sorted),
      });
    }

    get().showToast("Task created. Now go do it.", "success");
  },

  // ── Mark task as done ──
  markDone: async (id) => {
    const db = await getDB();
    if (!db) return;

    const task = await db.get("tasks", id);
    if (!task || task.completed) return;

    // Save undo entry
    const undoEntry: UndoEntry = {
      taskId: id,
      field: "completed",
      previousValue: false,
      timestamp: Date.now(),
    };

    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.skipped = false; // Un-skip if was skipped
    await db.put("tasks", task);

    const { currentDayKey, undoStack } = get();
    const tasks = await getTasksByDay(currentDayKey);
    const sorted = sortTasks(tasks);
    const daySummary = computeDaySummary(currentDayKey, sorted);
    await saveDaySummary(daySummary);

    // Recompute streak
    const allSummaries = await getAllDaySummaries();
    const streak = computeCurrentStreak(allSummaries);

    set({
      tasks: sorted,
      daySummary,
      streak,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: sorted.filter((t) => t.skipped).length,
      undoStack: [...undoStack, undoEntry],
    });

    get().showToast("Done! Future you says thanks. 💪", "success", id);
  },

  // ── Skip a task ──
  skipTask: async (id, reason, category) => {
    const db = await getDB();
    if (!db) return;

    const task = await db.get("tasks", id);
    if (!task || task.skipped) return;

    const undoEntry: UndoEntry = {
      taskId: id,
      field: "skipped",
      previousValue: false,
      timestamp: Date.now(),
    };

    task.skipped = true;
    task.skippedAt = new Date().toISOString();
    task.skipReason = reason;
    task.skipCategory = category;
    task.completed = false;
    await db.put("tasks", task);

    const { currentDayKey, undoStack } = get();
    const tasks = await getTasksByDay(currentDayKey);
    const sorted = sortTasks(tasks);
    const skipCount = sorted.filter((t) => t.skipped).length;
    const daySummary = computeDaySummary(currentDayKey, sorted);
    await saveDaySummary(daySummary);

    const allSummaries = await getAllDaySummaries();
    const streak = computeCurrentStreak(allSummaries);

    set({
      tasks: sorted,
      daySummary,
      streak,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: skipCount,
      undoStack: [...undoStack, undoEntry],
    });

    // Show rage message
    const rageMsg = pickRageMessage(skipCount);
    get().showToast(rageMsg, "rage", id);
  },

  // ── Undo last action on a task (within 10s) ──
  undoAction: async (taskId) => {
    const { undoStack, currentDayKey } = get();
    const entry = undoStack.find(
      (e) => e.taskId === taskId && Date.now() - e.timestamp < 10000
    );
    if (!entry) return;

    const db = await getDB();
    if (!db) return;

    const task = await db.get("tasks", taskId);
    if (!task) return;

    // Revert the field
    if (entry.field === "completed") {
      task.completed = entry.previousValue;
      task.completedAt = undefined;
    } else {
      task.skipped = entry.previousValue;
      task.skippedAt = undefined;
      task.skipReason = "";
    }

    await db.put("tasks", task);

    // Remove from undo stack
    const newStack = undoStack.filter((e) => e !== entry);

    const tasks = await getTasksByDay(currentDayKey);
    const sorted = sortTasks(tasks);
    const daySummary = computeDaySummary(currentDayKey, sorted);
    await saveDaySummary(daySummary);

    set({
      tasks: sorted,
      daySummary,
      undoStack: newStack,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: sorted.filter((t) => t.skipped).length,
      toast: null,
    });
  },

  // ── Delete a task ──
  deleteTask: async (id) => {
    const db = await getDB();
    if (!db) return;
    await db.delete("tasks", id);

    const { currentDayKey } = get();
    const tasks = await getTasksByDay(currentDayKey);
    const sorted = sortTasks(tasks);
    const daySummary = computeDaySummary(currentDayKey, sorted);
    await saveDaySummary(daySummary);

    set({
      tasks: sorted,
      daySummary,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: sorted.filter((t) => t.skipped).length,
    });
  },

  // ── Update preferences ──
  updatePrefs: async (partial) => {
    const current = get().prefs;
    const merged = { ...current, ...partial, id: "singleton" as const };

    // Optimistic update for fast slider/toggle interaction
    set({ prefs: merged });

    try {
      await savePrefs(merged);
    } catch (e) {
      console.error("[RegretBuddy] Could not save preferences to DB:", e);
      // We could revert state here if DB strictly required, but for prefs it's fine.
    }
  },

  // ── Toast management ──
  showToast: (message, type, undoId) => {
    set({ toast: { message, type, undoId } });
    // Auto-clear after 5s (or 10s for rage messages with undo)
    const duration = undoId ? 10000 : 5000;
    setTimeout(() => {
      const current = get().toast;
      if (current?.message === message) {
        set({ toast: null });
      }
    }, duration);
  },

  clearToast: () => set({ toast: null }),
}));