"use client";

import { useEffect, useState, useCallback } from "react";
import { useTaskStore } from "@/store/taskStore";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";
import DailySummary from "@/components/DailySummary";
import ProgressRing from "@/components/ProgressRing";
import StreakBadge from "@/components/StreakBadge";
import useReminderEngine from "@/hooks/useReminderEngine";
import { requestPermission } from "@/lib/notifications";
import { getDailyQuote } from "@/lib/rageMessages";
import { getTaskStatus } from "@/lib/businessLogic";
import type { Task, TaskStatus } from "@/types/task";
import VersionReleaseModal from "@/components/VersionReleaseModal";

export default function Home() {
  const {
    tasks,
    streak,
    completionPercent,
    isLoading,
    initialize,
    activeRoutine,
    taskLists,
    prefs,
  } = useTaskStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [showV2Modal, setShowV2Modal] = useState(false);

  useReminderEngine();

  // Handle deep link query params (Feature 3.1)
  const handleQueryAction = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;

    switch (action) {
      case "add":
        setShowAdd(true);
        break;
      case "overdue":
        setFilterOverdue(true);
        break;
      case "today":
        setFilterOverdue(false);
        break;
      case "skip-all-overdue":
        setFilterOverdue(true);
        break;
    }

    // Strip query param to prevent re-triggering on refresh
    window.history.replaceState({}, "", "/");
  }, []);

  useEffect(() => {
    initialize();
    requestPermission();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading) {
      handleQueryAction();
    }
  }, [isLoading, handleQueryAction]);

  useEffect(() => {
    if (!isLoading && !prefs.hasSeenV2ReleaseNotes) {
      setShowV2Modal(true);
    }
  }, [isLoading, prefs.hasSeenV2ReleaseNotes]);

  if (isLoading) {
    return (
      <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60dvh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: "pulseScale 1.5s ease-in-out infinite" }}>
              😈
            </div>
            <p style={{ color: "var(--color-text-muted)" }}>Loading your obligations...</p>
          </div>
        </div>
      </main>
    );
  }

  const quote = getDailyQuote();

  // Find active routine list info
  const activeList =
    activeRoutine?.activeTaskListId
      ? taskLists.find((l) => l.id === activeRoutine.activeTaskListId)
      : null;

  // ── Filter: only General + active routine tasks visible on home ──
  const activeListId = activeRoutine?.activeTaskListId || null;
  const visibleTasks = tasks.filter((t) => {
    const listId = t.taskListId || "general";
    return listId === "general" || listId === activeListId;
  });

  // ── Group visible tasks by taskListId ──
  const tasksByList = new Map<string, Task[]>();
  for (const task of visibleTasks) {
    const listId = task.taskListId || "general";
    if (!tasksByList.has(listId)) {
      tasksByList.set(listId, []);
    }
    tasksByList.get(listId)!.push(task);
  }

  // Build ordered list groups: General first, then active routine
  const listGroups: { listId: string; listName: string; emoji: string; tasks: Task[] }[] = [];

  // General first
  const generalTasks = tasksByList.get("general") || [];
  const generalList = taskLists.find((l) => l.id === "general");
  listGroups.push({
    listId: "general",
    listName: generalList?.name || "General",
    emoji: generalList?.emoji || "📋",
    tasks: generalTasks,
  });

  // Then active routine only
  if (activeListId && activeList) {
    const activeListTasks = tasksByList.get(activeListId) || [];
    if (activeListTasks.length > 0) {
      listGroups.push({
        listId: activeListId,
        listName: activeList.name,
        emoji: activeList.emoji,
        tasks: activeListTasks,
      });
    }
  }

  // If filtering to overdue only
  const allOverdue = visibleTasks.filter((t) => getTaskStatus(t) === "overdue");
  const showOverdueOnly = filterOverdue && allOverdue.length > 0;

  return (
    <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          paddingTop: "var(--space-sm)",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>Regret Buddy</h1>
          <p
            style={{
              color: "var(--color-danger)",
              fontStyle: "italic",
              fontSize: 13,
              margin: 0,
              maxWidth: 200,
            }}
          >
            {quote}
          </p>

          {/* Active routine badge (Feature 3.4) */}
          {activeList && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
                padding: "4px 10px",
                background: "var(--color-surface-container-high)",
                borderRadius: "var(--radius-full)",
                fontSize: 12,
                color: "var(--color-primary)",
                fontWeight: 600,
              }}
            >
              {activeList.emoji} {activeList.name}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <StreakBadge count={streak} />
          <ProgressRing percent={completionPercent} size={64} strokeWidth={5} />
        </div>
      </header>

      {/* Daily summary bar */}
      <div style={{ marginBottom: 16 }}>
        <DailySummary tasks={visibleTasks} />
      </div>

      {/* Overdue filter toggle */}
      {filterOverdue && (
        <div style={{ marginBottom: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setFilterOverdue(false)}
            style={{
              fontSize: 13,
              border: "1px solid var(--color-outline-variant)",
              color: "var(--color-primary)",
            }}
          >
            ✕ Clear overdue filter — Show all tasks
          </button>
        </div>
      )}

      {/* Task sections */}
      {visibleTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h2 style={{ color: "var(--color-text-muted)", margin: 0 }}>No tasks yet</h2>
          <p style={{ color: "var(--color-text-subtle)", fontSize: 14, margin: 0 }}>
            Future you is disappointed already.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 8 }}>
            + Add Your First Task
          </button>
        </div>
      ) : showOverdueOnly ? (
        /* Overdue-only view */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚠️ Overdue ({allOverdue.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allOverdue.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* Normal view: tasks grouped by list, then by status within each group */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {listGroups.map((group) => {
            if (group.tasks.length === 0) return null;

            // Group this list's tasks by status
            const statusGroups: { status: TaskStatus; label: string; color: string; icon: string; items: Task[] }[] = [
              { status: "overdue", label: "Overdue", color: "var(--color-danger)", icon: "⚠️", items: [] },
              { status: "active", label: "In Progress", color: "var(--color-warning)", icon: "🟡", items: [] },
              { status: "pending", label: "Upcoming", color: "var(--color-text-muted)", icon: "", items: [] },
              { status: "done", label: "Done", color: "var(--color-success)", icon: "✅", items: [] },
              { status: "skipped", label: "Skipped", color: "var(--color-text-subtle)", icon: "💀", items: [] },
            ];

            for (const task of group.tasks) {
              const status = getTaskStatus(task);
              const sg = statusGroups.find((s) => s.status === status);
              if (sg) sg.items.push(task);
            }

            return (
              <section key={group.listId}>
                {/* List header — only show if there are multiple lists with tasks */}
                {listGroups.filter((g) => g.tasks.length > 0).length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--color-outline-variant)",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{group.emoji}</span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{group.listName}</h3>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-subtle)",
                        fontFamily: "var(--font-mono)",
                        marginLeft: "auto",
                      }}
                    >
                      {group.tasks.filter((t) => t.completed).length}/{group.tasks.length}
                    </span>
                  </div>
                )}

                {/* Status sub-groups */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {statusGroups.map((sg) => {
                    if (sg.items.length === 0) return null;
                    return (
                      <div key={sg.status}>
                        <h4 style={{
                          margin: "0 0 6px",
                          fontSize: 12,
                          color: sg.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}>
                          {sg.icon} {sg.label} ({sg.items.length})
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {sg.items.map((t) => (
                            <TaskCard key={t.id} task={t} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)} id="add-task-fab" aria-label="Add task">
        +
      </button>

      {/* Add task modal */}
      {showAdd && <AddTaskModal close={() => setShowAdd(false)} />}

      {/* V2 Release Notes Modal */}
      {showV2Modal && <VersionReleaseModal onClose={() => setShowV2Modal(false)} />}
    </main>
  );
}