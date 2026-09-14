/**
 * IndexedDB v3 — Extended with TaskLists, RoutineTasks, and ActiveRoutine stores.
 * v2 → v3 migration backfills tasks with taskListId, notifyBeforeMin, preNotified
 * and seeds the default "General" task list.
 */
import { openDB, type IDBPDatabase } from "idb";
import type {
  Task,
  DaySummary,
  UserPrefs,
  TaskList,
  RoutineTask,
  ActiveRoutineConfig,
} from "@/types/task";
import { calculateDayKey } from "@/lib/businessLogic";

const DB_NAME = "regret-db";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // ── Fresh install (from 0) ──
        if (oldVersion < 1) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("dayKey", "dayKey", { unique: false });
          taskStore.createIndex("completed", "completed", { unique: false });
          taskStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // ── v1 → v2 migration ──
        if (oldVersion >= 1 && oldVersion < 2) {
          try {
            const taskStore = transaction.objectStore("tasks");
            if (!taskStore.indexNames.contains("dayKey")) {
              taskStore.createIndex("dayKey", "dayKey", { unique: false });
            }
            if (!taskStore.indexNames.contains("completed")) {
              taskStore.createIndex("completed", "completed", {
                unique: false,
              });
            }
            if (!taskStore.indexNames.contains("createdAt")) {
              taskStore.createIndex("createdAt", "createdAt", {
                unique: false,
              });
            }
          } catch (e) {
            console.warn("[RegretBuddy] v1→v2 index migration skipped:", e);
          }
        }

        // Ensure v2 stores exist (for fresh + upgrade paths)
        if (!db.objectStoreNames.contains("daySummaries")) {
          db.createObjectStore("daySummaries", { keyPath: "dayKey" });
        }
        if (!db.objectStoreNames.contains("userPrefs")) {
          db.createObjectStore("userPrefs", { keyPath: "id" });
        }

        // ── v2 → v3 migration: Routines system ──
        if (oldVersion < 3) {
          // Add taskListId index to tasks
          try {
            const taskStore = transaction.objectStore("tasks");
            if (!taskStore.indexNames.contains("taskListId")) {
              taskStore.createIndex("taskListId", "taskListId", {
                unique: false,
              });
            }
          } catch (e) {
            console.warn(
              "[RegretBuddy] v2→v3 taskListId index migration skipped:",
              e
            );
          }

          // Create taskLists store
          if (!db.objectStoreNames.contains("taskLists")) {
            const listStore = db.createObjectStore("taskLists", {
              keyPath: "id",
            });
            listStore.createIndex("isDefault", "isDefault", { unique: false });
          }

          // Create routineTasks store
          if (!db.objectStoreNames.contains("routineTasks")) {
            const rtStore = db.createObjectStore("routineTasks", {
              keyPath: "id",
            });
            rtStore.createIndex("taskListId", "taskListId", { unique: false });
          }

          // Create activeRoutine store
          if (!db.objectStoreNames.contains("activeRoutine")) {
            db.createObjectStore("activeRoutine", { keyPath: "id" });
          }
        }
      },
    }).catch((err) => {
      console.error("[RegretBuddy] DB open failed:", err);
      dbPromise = null;
      return null as unknown as IDBPDatabase;
    });
  }

  return dbPromise;
}

// ────────────────────────────────────────────
// Tasks CRUD
// ────────────────────────────────────────────

export async function addTask(task: Task) {
  const db = await getDB();
  if (!db) return;
  return db.put("tasks", task);
}

/** Get all tasks — use sparingly, prefer getTasksByDay */
export async function getTasks(): Promise<Task[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("tasks");
}

/** Get tasks for a specific day — the primary query method */
export async function getTasksByDay(dayKey: string): Promise<Task[]> {
  const db = await getDB();
  if (!db) return [];

  try {
    return await db.getAllFromIndex("tasks", "dayKey", dayKey);
  } catch {
    // Fallback if index doesn't exist yet (pre-migration)
    const all = await db.getAll("tasks");
    return all.filter((t: Task) => t.dayKey === dayKey);
  }
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDB();
  if (!db) return null;
  return db.get("tasks", id);
}

export async function updateTask(task: Task) {
  const db = await getDB();
  if (!db) return;
  return db.put("tasks", task);
}

export async function deleteTask(id: string) {
  const db = await getDB();
  if (!db) return;
  return db.delete("tasks", id);
}

/** Batch update multiple tasks in a single transaction */
export async function batchUpdateTasks(tasks: Task[]) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction("tasks", "readwrite");
  for (const task of tasks) {
    tx.store.put(task);
  }
  await tx.done;
}

// ────────────────────────────────────────────
// Day Summaries
// ────────────────────────────────────────────

export async function saveDaySummary(summary: DaySummary) {
  const db = await getDB();
  if (!db) return;
  return db.put("daySummaries", summary);
}

export async function getDaySummary(
  dayKey: string
): Promise<DaySummary | null> {
  const db = await getDB();
  if (!db) return null;
  return db.get("daySummaries", dayKey) ?? null;
}

/** Get all day summaries (for streak calc & stats) */
export async function getAllDaySummaries(): Promise<DaySummary[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("daySummaries");
}

/** Get summaries for a date range */
export async function getDaySummariesInRange(
  startKey: string,
  endKey: string
): Promise<DaySummary[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("daySummaries", IDBKeyRange.bound(startKey, endKey));
}

// ────────────────────────────────────────────
// User Preferences
// ────────────────────────────────────────────

const DEFAULT_PREFS: UserPrefs = {
  id: "singleton",
  notificationsEnabled: true,
  reminderIntervalMin: 5,
  dailyResetHour: 4,
  theme: "dark",
  hasSeenV2ReleaseNotes: false,
  newsletterEmail: "",
  fcmToken: "",
  fcmEnabled: false,
};

export async function getPrefs(): Promise<UserPrefs> {
  const db = await getDB();
  if (!db) return DEFAULT_PREFS;
  const prefs = await db.get("userPrefs", "singleton");
  return prefs ?? DEFAULT_PREFS;
}

export async function savePrefs(prefs: Partial<UserPrefs>) {
  const db = await getDB();
  if (!db) return;
  const current = await getPrefs();
  const merged = { ...current, ...prefs, id: "singleton" as const };
  return db.put("userPrefs", merged);
}

// ────────────────────────────────────────────
// Task Lists (Routines)
// ────────────────────────────────────────────

const DEFAULT_TASK_LIST: TaskList = {
  id: "general",
  name: "General",
  description: "Default task list for ad-hoc tasks",
  emoji: "📋",
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function ensureDefaultTaskList(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const existing = await db.get("taskLists", "general");
  if (!existing) {
    await db.put("taskLists", DEFAULT_TASK_LIST);
  }
}

export async function getAllTaskLists(): Promise<TaskList[]> {
  const db = await getDB();
  if (!db) return [DEFAULT_TASK_LIST];
  const lists = await db.getAll("taskLists");
  if (lists.length === 0) {
    // Seed default
    await db.put("taskLists", DEFAULT_TASK_LIST);
    return [DEFAULT_TASK_LIST];
  }
  // Sort: default first, then by name
  return lists.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function saveTaskList(list: TaskList): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put("taskLists", list);
}

export async function deleteTaskListById(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // Don't allow deleting the default list
  if (id === "general") return;
  await db.delete("taskLists", id);

  // Also delete all routine tasks belonging to this list
  const routineTasks = await getRoutineTasksByList(id);
  const tx = db.transaction("routineTasks", "readwrite");
  for (const rt of routineTasks) {
    tx.store.delete(rt.id);
  }
  await tx.done;
}

// ────────────────────────────────────────────
// Routine Tasks (Templates)
// ────────────────────────────────────────────

export async function getRoutineTasksByList(
  taskListId: string
): Promise<RoutineTask[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const tasks = await db.getAllFromIndex(
      "routineTasks",
      "taskListId",
      taskListId
    );
    return tasks.sort(
      (a: RoutineTask, b: RoutineTask) => a.order - b.order
    );
  } catch {
    const all = await db.getAll("routineTasks");
    return all
      .filter((t: RoutineTask) => t.taskListId === taskListId)
      .sort((a: RoutineTask, b: RoutineTask) => a.order - b.order);
  }
}

export async function saveRoutineTask(task: RoutineTask): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put("routineTasks", task);
}

export async function deleteRoutineTaskById(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete("routineTasks", id);
}

export async function getRoutineTaskCount(
  taskListId: string
): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  try {
    const tasks = await db.getAllFromIndex(
      "routineTasks",
      "taskListId",
      taskListId
    );
    return tasks.length;
  } catch {
    const all = await db.getAll("routineTasks");
    return all.filter((t: RoutineTask) => t.taskListId === taskListId).length;
  }
}

// ────────────────────────────────────────────
// Active Routine Config
// ────────────────────────────────────────────

export async function getActiveRoutineConfig(): Promise<ActiveRoutineConfig | null> {
  const db = await getDB();
  if (!db) return null;
  return (await db.get("activeRoutine", "singleton")) ?? null;
}

export async function saveActiveRoutineConfig(
  config: ActiveRoutineConfig
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put("activeRoutine", config);
}

// ────────────────────────────────────────────
// Data Management
// ────────────────────────────────────────────

/** Export all data as JSON string (chunked for large datasets) */
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  if (!db) return "{}";

  const tasks = await db.getAll("tasks");
  const summaries = await db.getAll("daySummaries");
  const prefs = await getPrefs();
  const taskLists = await db.getAll("taskLists");
  const routineTasks = await db.getAll("routineTasks");
  const activeRoutine = await getActiveRoutineConfig();

  return JSON.stringify(
    { tasks, summaries, prefs, taskLists, routineTasks, activeRoutine },
    null,
    2
  );
}

/** Clear all data (with confirmation this is intentional) */
export async function clearAllData() {
  const db = await getDB();
  if (!db) return;

  const storeNames = [
    "tasks",
    "daySummaries",
    "userPrefs",
    "taskLists",
    "routineTasks",
    "activeRoutine",
  ];

  for (const storeName of storeNames) {
    try {
      const tx = db.transaction(storeName, "readwrite");
      await tx.store.clear();
      await tx.done;
    } catch {
      // Store may not exist in older schemas
    }
  }
}

/** Migrate v1/v2 tasks that don't have new fields */
export async function migrateV1Tasks() {
  const db = await getDB();
  if (!db) return;

  // Ensure default task list exists
  await ensureDefaultTaskList();

  const all = await db.getAll("tasks");
  const needsMigration = all.filter(
    (t: Task) =>
      !t.dayKey ||
      !t.priority ||
      t.taskListId === undefined ||
      t.notifyBeforeMin === undefined ||
      t.preNotified === undefined
  );

  if (needsMigration.length === 0) return;

  const tx = db.transaction("tasks", "readwrite");
  for (const task of needsMigration) {
    if (!task.dayKey) {
      task.dayKey = calculateDayKey(new Date(task.createdAt));
    }
    if (!task.priority) {
      task.priority = task.mandatory ? "high" : "medium";
    }
    if (task.notifiedCount === undefined) {
      task.notifiedCount = 0;
    }
    // v3 fields
    if (task.taskListId === undefined) {
      task.taskListId = "general";
    }
    if (task.notifyBeforeMin === undefined) {
      task.notifyBeforeMin = 0;
    }
    if (task.preNotified === undefined) {
      task.preNotified = false;
    }
    tx.store.put(task);
  }
  await tx.done;
}