/**
 * Zustand store — Day-partitioned, with undo support and computed state.
 * Only loads current day's tasks to avoid scaling issues.
 * Extended with Task Lists / Routines support.
 */
import { create } from "zustand";
import type {
  Task,
  DaySummary,
  UserPrefs,
  UndoEntry,
  TaskList,
  RoutineTask,
  ActiveRoutineConfig,
} from "@/types/task";
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
  getAllTaskLists,
  saveTaskList,
  deleteTaskListById,
  getRoutineTasksByList,
  saveRoutineTask,
  deleteRoutineTaskById,
  getActiveRoutineConfig,
  saveActiveRoutineConfig,
  batchUpdateTasks,
} from "@/lib/db";
import {
  getTodayKey,
  computeDaySummary,
  computeCurrentStreak,
  sortTasks,
  computeCompletionPercent,
  cloneRoutineTaskToTask,
  filterRoutineTasksForDay,
  getDayOfWeek,
} from "@/lib/businessLogic";
import { pickRageMessage } from "@/lib/rageMessages";
import { registerServiceWorker } from "@/lib/notifications";

type ToastType = "success" | "error" | "rage" | "info";

interface AppState {
  // ── Data ──
  tasks: Task[];
  daySummary: DaySummary | null;
  streak: number;
  prefs: UserPrefs;
  currentDayKey: string;

  // ── Routines (Feature 3.4) ──
  taskLists: TaskList[];
  activeRoutine: ActiveRoutineConfig | null;

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

  // ── Routine Actions (Feature 3.4) ──
  loadTaskLists: () => Promise<void>;
  createTaskList: (list: TaskList) => Promise<void>;
  updateTaskList: (list: TaskList) => Promise<void>;
  removeTaskList: (id: string) => Promise<void>;
  addRoutineTask: (task: RoutineTask) => Promise<void>;
  removeRoutineTask: (id: string, taskListId: string) => Promise<void>;
  fetchRoutineTasks: (taskListId: string) => Promise<RoutineTask[]>;
  applyRoutine: (taskListId: string) => Promise<void>;
  unapplyRoutine: () => Promise<void>;
  autoApplyActiveRoutine: () => Promise<void>;
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
    hasSeenV2ReleaseNotes: false,
    newsletterEmail: "",
  },
  currentDayKey: getTodayKey(),
  taskLists: [],
  activeRoutine: null,
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
      // Register service worker
      registerServiceWorker();

      // Run v1/v2 migration if needed
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

      // Load task lists
      const taskLists = await getAllTaskLists();

      // Load active routine config
      const activeRoutine = await getActiveRoutineConfig();

      set({
        tasks: sorted,
        daySummary,
        streak,
        prefs,
        currentDayKey: dayKey,
        taskLists,
        activeRoutine,
        isLoading: false,
        completionPercent: computeCompletionPercent(sorted),
        dailySkipCount: sorted.filter((t) => t.skipped).length,
      });

      // Auto-apply active routine if not yet applied today
      await get().autoApplyActiveRoutine();
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

  // ════════════════════════════════════════════
  // Routine Actions (Feature 3.4)
  // ════════════════════════════════════════════

  loadTaskLists: async () => {
    const taskLists = await getAllTaskLists();
    set({ taskLists });
  },

  createTaskList: async (list) => {
    await saveTaskList(list);
    const taskLists = await getAllTaskLists();
    set({ taskLists });
    get().showToast(`Routine "${list.name}" created!`, "success");
  },

  updateTaskList: async (list) => {
    await saveTaskList(list);
    const taskLists = await getAllTaskLists();
    set({ taskLists });
  },

  removeTaskList: async (id) => {
    // If this is the active routine, unapply it first
    const { activeRoutine } = get();
    if (activeRoutine?.activeTaskListId === id) {
      await get().unapplyRoutine();
    }

    await deleteTaskListById(id);
    const taskLists = await getAllTaskLists();
    set({ taskLists });
    get().showToast("Routine deleted.", "info");
  },

  addRoutineTask: async (task) => {
    await saveRoutineTask(task);
  },

  removeRoutineTask: async (id, _taskListId) => {
    await deleteRoutineTaskById(id);
  },

  fetchRoutineTasks: async (taskListId) => {
    return getRoutineTasksByList(taskListId);
  },

  // Apply a routine: clone its tasks for today (filtered by day of week)
  applyRoutine: async (taskListId) => {
    const { prefs, currentDayKey } = get();
    const dayKey = currentDayKey || getTodayKey(prefs.dailyResetHour);
    const today = getDayOfWeek();

    // Get routine tasks and filter for today's day of week
    const routineTasks = await getRoutineTasksByList(taskListId);
    const todayTasks = filterRoutineTasksForDay(routineTasks, today);

    if (todayTasks.length === 0) {
      get().showToast("No tasks scheduled for today in this routine.", "info");
    }

    // Check which routine tasks have already been cloned today
    const existingTasks = await getTasksByDay(dayKey);
    const alreadyCloned = new Set(
      existingTasks
        .filter((t) => t.sourceRoutineTaskId)
        .map((t) => t.sourceRoutineTaskId)
    );

    // Clone only tasks that haven't been cloned yet
    const newTasks: Task[] = [];
    for (const rt of todayTasks) {
      if (!alreadyCloned.has(rt.id)) {
        newTasks.push(cloneRoutineTaskToTask(rt, dayKey, taskListId));
      }
    }

    if (newTasks.length > 0) {
      await batchUpdateTasks(newTasks);
    }

    // Save active routine config
    const config: ActiveRoutineConfig = {
      id: "singleton",
      activeTaskListId: taskListId,
      appliedDayKey: dayKey,
    };
    await saveActiveRoutineConfig(config);

    // Refresh
    const tasks = await getTasksByDay(dayKey);
    const sorted = sortTasks(tasks);
    const daySummary = computeDaySummary(dayKey, sorted);
    await saveDaySummary(daySummary);

    // Get the list name for the toast
    const lists = await getAllTaskLists();
    const list = lists.find((l) => l.id === taskListId);

    set({
      tasks: sorted,
      daySummary,
      activeRoutine: config,
      completionPercent: computeCompletionPercent(sorted),
      dailySkipCount: sorted.filter((t) => t.skipped).length,
    });

    if (newTasks.length > 0) {
      get().showToast(
        `${list?.emoji || "📋"} "${list?.name}" applied — ${newTasks.length} tasks added!`,
        "success"
      );
    } else {
      get().showToast(
        `${list?.emoji || "📋"} "${list?.name}" is now active (all tasks already added).`,
        "info"
      );
    }
  },

  unapplyRoutine: async () => {
    const config: ActiveRoutineConfig = {
      id: "singleton",
      activeTaskListId: null,
      appliedDayKey: get().currentDayKey,
    };
    await saveActiveRoutineConfig(config);
    set({ activeRoutine: config });
    get().showToast("Routine deactivated. Back to General.", "info");
  },

  // Auto-apply the active routine if it hasn't been applied for today yet
  autoApplyActiveRoutine: async () => {
    const { activeRoutine, currentDayKey } = get();
    if (
      !activeRoutine ||
      !activeRoutine.activeTaskListId ||
      activeRoutine.appliedDayKey === currentDayKey
    ) {
      return; // No active routine, or already applied today
    }

    // Apply the routine for today
    await get().applyRoutine(activeRoutine.activeTaskListId);
  },
}));