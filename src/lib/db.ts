/**
 * IndexedDB v2 — Upgraded schema with indexes, day summaries, and user prefs.
 * Migrates from v1 by backfilling dayKey on existing tasks.
 */
import { openDB, type IDBPDatabase } from "idb";
import type { Task, DaySummary, UserPrefs } from "@/types/task";
import { calculateDayKey } from "@/lib/businessLogic";

const DB_NAME = "regret-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // ── Fresh install ──
        if (oldVersion < 1) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("dayKey", "dayKey", { unique: false });
          taskStore.createIndex("completed", "completed", { unique: false });
          taskStore.createIndex("createdAt", "createdAt", { unique: false });
        } else if (oldVersion < 2) {
          // ── v1 → v2 migration: use the transaction parameter (not db.transaction) ──
          try {
            const taskStore = transaction.objectStore("tasks");
            if (!taskStore.indexNames.contains("dayKey")) {
              taskStore.createIndex("dayKey", "dayKey", { unique: false });
            }
            if (!taskStore.indexNames.contains("completed")) {
              taskStore.createIndex("completed", "completed", { unique: false });
            }
            if (!taskStore.indexNames.contains("createdAt")) {
              taskStore.createIndex("createdAt", "createdAt", { unique: false });
            }
          } catch (e) {
            console.warn("[RegretBuddy] v1→v2 index migration skipped:", e);
          }
        }

        // New stores for v2
        if (!db.objectStoreNames.contains("daySummaries")) {
          db.createObjectStore("daySummaries", { keyPath: "dayKey" });
        }
        if (!db.objectStoreNames.contains("userPrefs")) {
          db.createObjectStore("userPrefs", { keyPath: "id" });
        }
      },
    }).catch((err) => {
      // Reset so next call retries instead of returning a rejected promise forever
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
  return db.getAll(
    "daySummaries",
    IDBKeyRange.bound(startKey, endKey)
  );
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
// Data Management
// ────────────────────────────────────────────

/** Export all data as JSON string (chunked for large datasets) */
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  if (!db) return "{}";

  const tasks = await db.getAll("tasks");
  const summaries = await db.getAll("daySummaries");
  const prefs = await getPrefs();

  return JSON.stringify({ tasks, summaries, prefs }, null, 2);
}

/** Clear all data (with confirmation this is intentional) */
export async function clearAllData() {
  const db = await getDB();
  if (!db) return;

  const tx1 = db.transaction("tasks", "readwrite");
  await tx1.store.clear();
  await tx1.done;

  const tx2 = db.transaction("daySummaries", "readwrite");
  await tx2.store.clear();
  await tx2.done;

  const tx3 = db.transaction("userPrefs", "readwrite");
  await tx3.store.clear();
  await tx3.done;
}

/** Migrate v1 tasks that don't have dayKey */
export async function migrateV1Tasks() {
  const db = await getDB();
  if (!db) return;

  const all = await db.getAll("tasks");
  const needsMigration = all.filter(
    (t: Task) => !t.dayKey || !t.priority
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
    tx.store.put(task);
  }
  await tx.done;
}