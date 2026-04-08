"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { getTaskStatus, getTaskTimeInfo } from "@/lib/businessLogic";
import SkipModal from "./SkipModal";
import { triggerVibration } from "@/lib/notifications";

export default function TaskCard({ task }: { task: Task }) {
  const { markDone } = useTaskStore();
  const [showSkip, setShowSkip] = useState(false);
  const [timeInfo, setTimeInfo] = useState(() => getTaskTimeInfo(task));

  const status = getTaskStatus(task);

  // Live countdown update every 30s for active/overdue tasks
  useEffect(() => {
    if (status === "done" || status === "skipped" || status === "pending") return;

    const timer = setInterval(() => {
      setTimeInfo(getTaskTimeInfo(task));
    }, 30000);

    return () => clearInterval(timer);
  }, [task, status]);

  const handleDone = () => {
    triggerVibration("medium");
    markDone(task.id);
  };

  // Priority badge
  const priorityEmoji: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
  };

  // Growth emoji
  const growthEmoji: Record<string, string> = {
    technical: "🔧",
    music: "🎵",
    physical: "💪",
    social: "🤝",
    other: "✨",
  };

  return (
    <>
      <div
        className={`card status-${status}`}
        id={`task-${task.id}`}
        style={{
          opacity: status === "done" || status === "skipped" ? 0.6 : 1,
          animation: "slideDown 0.3s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              textDecoration: status === "done" ? "line-through" : undefined,
              flex: 1,
            }}
          >
            {task.title}
          </h3>
          <span style={{ fontSize: 12, flexShrink: 0 }}>
            {priorityEmoji[task.priority]} {growthEmoji[task.helps_in_growing]}
          </span>
        </div>

        {/* Time info */}
        <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
          <span>🕐 {task.startTime}</span>
          <span>⏱ {task.estimatedMinutes}min</span>
        </div>

        {/* Active countdown / Overdue warning */}
        {status === "active" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              background: "rgba(255, 191, 0, 0.1)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-warning)",
              marginBottom: 10,
            }}
          >
            ⏳ {timeInfo.minutesRemaining} min remaining
          </div>
        )}

        {status === "overdue" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              background: "rgba(255, 85, 69, 0.1)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-danger)",
              marginBottom: 10,
              animation: "shake 0.5s ease",
            }}
          >
            ⚠️ {timeInfo.minutesOverdue} min overdue
          </div>
        )}

        {/* Done / Skipped labels */}
        {status === "done" && (
          <div style={{ fontSize: 13, color: "var(--color-success)", fontWeight: 600, marginBottom: 4 }}>
            ✅ Completed
          </div>
        )}

        {status === "skipped" && (
          <div style={{ fontSize: 13, color: "var(--color-text-subtle)", fontWeight: 500 }}>
            Skipped: {task.skipCategory}
            {task.skipReason && <span style={{ display: "block", fontStyle: "italic", marginTop: 2 }}>"{task.skipReason}"</span>}
          </div>
        )}

        {/* Actions */}
        {status !== "done" && status !== "skipped" && (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn btn-success" style={{ flex: 1, padding: "10px" }} onClick={handleDone}>
              ✓ Done
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1, padding: "10px" }}
              onClick={() => setShowSkip(true)}
            >
              ✕ Skip
            </button>
          </div>
        )}
      </div>

      {showSkip && <SkipModal taskId={task.id} onClose={() => setShowSkip(false)} />}
    </>
  );
}