"use client";

import { useEffect, useState } from "react";
import { getAllDaySummaries } from "@/lib/db";
import type { DaySummary, SkipCategory, HelpingInGrowing } from "@/types/task";
import { computeCurrentStreak } from "@/lib/businessLogic";
import dayjs from "dayjs";

const GROWTH_COLORS: Record<HelpingInGrowing, string> = {
  technical: "#ffb4aa",
  music: "#ffe2ab",
  physical: "#53e16f",
  social: "#ffbf00",
  other: "#ad8883",
};

const GROWTH_EMOJI: Record<HelpingInGrowing, string> = {
  technical: "🔧",
  music: "🎵",
  physical: "💪",
  social: "🤝",
  other: "✨",
};

const SKIP_COLORS: Record<SkipCategory, string> = {
  lazy: "#ff5545",
  genuine: "#53e16f",
  unexpected: "#ffbf00",
  health: "#ffb4aa",
  other: "#ad8883",
};

export default function StatsPage() {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAllDaySummaries();
      setSummaries(data.sort((a, b) => a.dayKey.localeCompare(b.dayKey)));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", marginTop: 100 }}>
          Loading your truth...
        </p>
      </main>
    );
  }

  const streak = computeCurrentStreak(summaries);
  const last84Days = getLast84Days(summaries);

  // Aggregate growth
  const growthTotals: Record<HelpingInGrowing, number> = {
    technical: 0, music: 0, physical: 0, social: 0, other: 0,
  };
  const skipTotals: Record<SkipCategory, number> = {
    lazy: 0, genuine: 0, unexpected: 0, health: 0, other: 0,
  };
  let totalCompleted = 0;
  let totalSkipped = 0;

  for (const s of summaries) {
    totalCompleted += s.completed;
    totalSkipped += s.skipped;
    for (const [k, v] of Object.entries(s.growthBreakdown)) {
      growthTotals[k as HelpingInGrowing] += v;
    }
    for (const [k, v] of Object.entries(s.skippedReasons)) {
      skipTotals[k as SkipCategory] += v;
    }
  }

  const growthMax = Math.max(...Object.values(growthTotals), 1);

  return (
    <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, paddingTop: "var(--space-sm)" }}>
        <h1 style={{ margin: "0 0 4px" }}>Your Truth</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: 0 }}>
          Numbers don&apos;t lie.
        </p>
      </header>

      {summaries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h2 style={{ color: "var(--color-text-muted)", margin: 0 }}>No data yet</h2>
          <p style={{ color: "var(--color-text-subtle)", fontSize: 14 }}>
            Complete some tasks to see your stats.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Streak + overview cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {streak}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>🔥 Streak</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-success)", fontFamily: "var(--font-mono)" }}>
                {totalCompleted}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>✅ Done</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
                {totalSkipped}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>💀 Skipped</div>
            </div>
          </div>

          {/* Streak calendar */}
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Activity (12 weeks)</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gridTemplateRows: "repeat(7, 1fr)",
                gap: 3,
              }}
            >
              {last84Days.map((day, i) => (
                <div
                  key={i}
                  title={day.dayKey + (day.summary ? ` — ${day.summary.completed}/${day.summary.totalTasks}` : "")}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 3,
                    background: getDayColor(day.summary),
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--color-text-subtle)" }}>
              <span>12 weeks ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Growth areas */}
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Growth Areas</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.entries(growthTotals) as [HelpingInGrowing, number][])
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{GROWTH_EMOJI[key]} {key}</span>
                      <span style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>{value}</span>
                    </div>
                    <div style={{ height: 8, background: "var(--color-surface-container-highest)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(value / growthMax) * 100}%`,
                          background: GROWTH_COLORS[key],
                          borderRadius: 4,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              {Object.values(growthTotals).every((v) => v === 0) && (
                <p style={{ color: "var(--color-text-subtle)", fontSize: 13, textAlign: "center" }}>
                  No completed tasks yet.
                </p>
              )}
            </div>
          </div>

          {/* Skip reasons */}
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Skip Reasons</h3>
            {totalSkipped > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(Object.entries(skipTotals) as [SkipCategory, number][])
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: SKIP_COLORS[key],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, flex: 1, textTransform: "capitalize" }}>{key}</span>
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                        {value} ({Math.round((value / totalSkipped) * 100)}%)
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p style={{ color: "var(--color-text-subtle)", fontSize: 13, textAlign: "center" }}>
                No skips! Impressive. 🎉
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Helpers ──

type DayCell = { dayKey: string; summary: DaySummary | null };

function getLast84Days(summaries: DaySummary[]): DayCell[] {
  const map = new Map(summaries.map((s) => [s.dayKey, s]));
  const days: DayCell[] = [];

  for (let i = 83; i >= 0; i--) {
    const key = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    days.push({ dayKey: key, summary: map.get(key) ?? null });
  }

  return days;
}

function getDayColor(summary: DaySummary | null): string {
  if (!summary || summary.totalTasks === 0) return "var(--color-surface-container)";

  const rate = summary.completed / summary.totalTasks;

  if (rate >= 0.8) return "#2d8a4e"; // Strong green
  if (rate >= 0.5) return "#26a641"; // Medium green
  if (rate >= 0.2) return "#0e4429"; // Dim green
  if (summary.skipped > 0) return "#5c0002"; // Red for skip-heavy
  return "var(--color-surface-container-high)";
}
