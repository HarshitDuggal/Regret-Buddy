"use client";

import type { Task } from "@/types/task";

export default function DailySummary({ tasks }: { tasks: Task[] }) {
  const skipped = tasks.filter((t) => t.skipped);
  const done = tasks.filter((t) => t.completed);
  const total = tasks.length;
  const pending = total - done.length - skipped.length;

  if (total === 0) return null;

  return (
    <div
      className="card"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12,
        textAlign: "center",
      }}
      id="daily-summary"
    >
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-success)", fontFamily: "var(--font-mono)" }}>
          {done.length}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
          Done
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-warning)", fontFamily: "var(--font-mono)" }}>
          {pending}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
          Remaining
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
          {skipped.length}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
          Skipped
        </div>
      </div>
    </div>
  );
}