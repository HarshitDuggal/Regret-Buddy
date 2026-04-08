"use client";

import { useTaskStore } from "@/store/taskStore";

export default function Toast() {
  const { toast, undoAction, clearToast } = useTaskStore();

  if (!toast) return null;

  const typeClass = `toast toast-${toast.type}`;

  return (
    <div className={typeClass} id="toast" role="alert">
      <span>{toast.message}</span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {toast.undoId && (
          <button
            onClick={() => undoAction(toast.undoId!)}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Undo
          </button>
        )}
        <button
          onClick={clearToast}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: 18,
            cursor: "pointer",
            padding: "0 4px",
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
