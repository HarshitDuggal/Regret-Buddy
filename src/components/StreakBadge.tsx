"use client";

interface StreakBadgeProps {
  count: number;
}

export default function StreakBadge({ count }: StreakBadgeProps) {
  if (count === 0) {
    return (
      <div
        className="streak-badge"
        style={{
          background: "var(--color-surface-container-high)",
          color: "var(--color-text-muted)",
        }}
        id="streak-badge"
      >
        <span>💀</span>
        <span>No streak</span>
      </div>
    );
  }

  return (
    <div className="streak-badge" id="streak-badge">
      <span className="streak-fire">🔥</span>
      <span>
        {count} day{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
