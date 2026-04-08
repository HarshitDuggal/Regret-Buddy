"use client";

import { useState } from "react";
import type { SkipCategory } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { triggerVibration } from "@/lib/notifications";

const CATEGORIES: { value: SkipCategory; label: string; emoji: string }[] = [
  { value: "lazy", label: "Lazy", emoji: "😴" },
  { value: "genuine", label: "Genuine", emoji: "✅" },
  { value: "unexpected", label: "Unexpected", emoji: "⚡" },
  { value: "health", label: "Health", emoji: "🏥" },
  { value: "other", label: "Other", emoji: "❓" },
];

export default function SkipModal({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const { skipTask } = useTaskStore();
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<SkipCategory>("lazy");

  const handleSkip = () => {
    triggerVibration("heavy");
    skipTask(taskId, reason, category);
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />

        {/* Devil header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 8, animation: "pulseScale 1.5s ease-in-out infinite" }}>
            😈
          </div>
          <h2 style={{ margin: "0 0 4px", color: "var(--color-primary)" }}>
            Really? You&apos;re skipping this?
          </h2>
          <p style={{ color: "var(--color-danger)", fontStyle: "italic", fontSize: 14, margin: 0 }}>
            Nice. Future you is now slightly worse.
          </p>
        </div>

        {/* Category chips */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "block", marginBottom: 8 }}>
            Why are you doing this to yourself?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`chip ${category === cat.value ? "active" : ""}`}
                onClick={() => setCategory(cat.value)}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reason text */}
        <div style={{ marginBottom: 20 }}>
          <textarea
            className="input"
            placeholder="What's your excuse? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-danger btn-full" onClick={handleSkip}>
            Yes, I&apos;m Skipping 💀
          </button>
          <button className="btn btn-success btn-full" onClick={onClose}>
            No, I&apos;ll Do It 💪
          </button>
        </div>
      </div>
    </div>
  );
}