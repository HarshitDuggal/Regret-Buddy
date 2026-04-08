"use client";

import { useEffect, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";
import DailySummary from "@/components/DailySummary";
import ProgressRing from "@/components/ProgressRing";
import StreakBadge from "@/components/StreakBadge";
import useReminderEngine from "@/hooks/useReminderEngine";
import { requestPermission } from "@/lib/notifications";
import { getDailyQuote } from "@/lib/rageMessages";
import { groupTasksByStatus } from "@/lib/businessLogic";

export default function Home() {
  const { tasks, streak, completionPercent, isLoading, initialize } =
    useTaskStore();
  const [showAdd, setShowAdd] = useState(false);

  useReminderEngine();

  useEffect(() => {
    initialize();
    requestPermission();
  }, [initialize]);

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

  const grouped = groupTasksByStatus(tasks);
  const quote = getDailyQuote();

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
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <StreakBadge count={streak} />
          <ProgressRing percent={completionPercent} size={64} strokeWidth={5} />
        </div>
      </header>

      {/* Daily summary bar */}
      <div style={{ marginBottom: 16 }}>
        <DailySummary tasks={tasks} />
      </div>

      {/* Task sections */}
      {tasks.length === 0 ? (
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Overdue section */}
          {grouped.overdue.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ⚠️ Overdue ({grouped.overdue.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped.overdue.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Active section */}
          {grouped.active.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-warning)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🟡 In Progress ({grouped.active.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped.active.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Pending section */}
          {grouped.pending.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Upcoming ({grouped.pending.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped.pending.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Completed section */}
          {grouped.done.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-success)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✅ Done ({grouped.done.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped.done.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Skipped section */}
          {grouped.skipped.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                💀 Skipped ({grouped.skipped.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped.skipped.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)} id="add-task-fab" aria-label="Add task">
        +
      </button>

      {/* Add task modal */}
      {showAdd && <AddTaskModal close={() => setShowAdd(false)} />}
    </main>
  );
}