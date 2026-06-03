"use client";

import type { TaskList } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { useState, useEffect } from "react";
import { getRoutineTaskCount } from "@/lib/db";

export default function RoutineCard({
  list,
  onEdit,
  onViewTasks,
}: {
  list: TaskList;
  onEdit: (list: TaskList) => void;
  onViewTasks: (list: TaskList) => void;
}) {
  const { applyRoutine, removeTaskList, activeRoutine } = useTaskStore();
  const [taskCount, setTaskCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = activeRoutine?.activeTaskListId === list.id;

  useEffect(() => {
    getRoutineTaskCount(list.id).then(setTaskCount);
  }, [list.id]);

  return (
    <div
      className="card"
      style={{
        borderColor: isActive ? "var(--color-primary-container)" : undefined,
        borderWidth: isActive ? 2 : undefined,
        position: "relative",
      }}
      id={`routine-${list.id}`}
    >
      {/* Active badge */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: 12,
            background: "var(--color-primary-container)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: "var(--radius-full)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Active
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          cursor: "pointer",
        }}
        onClick={() => onViewTasks(list)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{list.emoji}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{list.name}</h3>
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {list.description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-subtle)",
            margin: "0 0 12px",
          }}
        >
          {list.description}
        </p>
      )}

      {/* Actions */}
      {!list.isDefault && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {!isActive ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: "10px" }}
              onClick={() => applyRoutine(list.id)}
            >
              Apply ✓
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid var(--color-outline-variant)",
              }}
              onClick={() => useTaskStore.getState().unapplyRoutine()}
            >
              Unapply
            </button>
          )}
          <button
            className="btn btn-ghost"
            style={{ padding: "10px" }}
            onClick={() => onEdit(list)}
          >
            ✏️
          </button>
          {!confirmDelete ? (
            <button
              className="btn btn-ghost"
              style={{ padding: "10px", color: "var(--color-danger)" }}
              onClick={() => setConfirmDelete(true)}
            >
              🗑️
            </button>
          ) : (
            <button
              className="btn btn-danger"
              style={{ padding: "10px" }}
              onClick={() => {
                removeTaskList(list.id);
                setConfirmDelete(false);
              }}
            >
              Confirm
            </button>
          )}
        </div>
      )}

      {/* General list: just show view link */}
      {list.isDefault && (
        <button
          className="btn btn-ghost btn-full"
          style={{
            marginTop: 4,
            border: "1px solid var(--color-outline-variant)",
          }}
          onClick={() => onViewTasks(list)}
        >
          View Tasks →
        </button>
      )}
    </div>
  );
}
