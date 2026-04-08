"use client";

import { useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { v4 as uuid } from "uuid";
import type { HelpingInGrowing, Priority } from "@/types/task";
import { getTodayKey } from "@/lib/businessLogic";

const STEPS = [
  "What are you supposed to do?",
  "When will you start?",
  "How long should it take?",
  "Why will you regret skipping?",
  "What does this improve?",
];

const GROWTH_OPTIONS: { value: HelpingInGrowing; label: string; emoji: string }[] = [
  { value: "technical", label: "Technical", emoji: "🔧" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "physical", label: "Physical", emoji: "💪" },
  { value: "social", label: "Social", emoji: "🤝" },
  { value: "other", label: "Other", emoji: "✨" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string }[] = [
  { value: "critical", label: "Critical", emoji: "🔴" },
  { value: "high", label: "High", emoji: "🟠" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "low", label: "Low", emoji: "🔵" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240];

export default function AddTaskModal({ close }: { close: () => void }) {
  const { createTask, prefs } = useTaskStore();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [regret, setRegret] = useState("");
  const [growth, setGrowth] = useState<HelpingInGrowing>("technical");
  const [priority, setPriority] = useState<Priority>("medium");
  const [error, setError] = useState("");

  const isLastStep = step === STEPS.length - 1;

  const validate = (): boolean => {
    if (step === 0 && !title.trim()) {
      setError("You can't even name the task?");
      return false;
    }
    if (step === 1 && !startTime) {
      setError("Pick a time. Commitment starts with a number.");
      return false;
    }
    setError("");
    return true;
  };

  const next = () => {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await createTask({
      id: uuid(),
      title: title.trim(),
      startTime,
      estimatedMinutes: duration,
      deadline: startTime, // Same as start for now
      regretMessage: regret.trim(),
      mandatory: priority === "critical" || priority === "high",
      priority,
      completed: false,
      skipped: false,
      createdAt: new Date().toISOString(),
      dayKey: getTodayKey(prefs.dailyResetHour),
      skipReason: "",
      skipCategory: "other",
      helps_in_growing: growth,
      notifiedCount: 0,
    });

    close();
  };

  const formatDuration = (mins: number): string => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="bottom-sheet-overlay" onClick={close}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: "var(--radius-full)",
                background: i <= step ? "var(--color-primary-container)" : "var(--color-surface-container-highest)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Step title */}
        <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>{STEPS[step]}</h2>

        {/* Step content */}
        <div style={{ minHeight: 120, marginBottom: 16 }}>
          {step === 0 && (
            <>
              <input
                className="input"
                placeholder="e.g. Practice guitar for 30 minutes"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(""); }}
                autoFocus
                id="task-name-input"
              />
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "block", marginBottom: 8 }}>
                  Priority
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      className={`chip ${priority === p.value ? "active" : ""}`}
                      onClick={() => setPriority(p.value)}
                    >
                      <span>{p.emoji}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setError(""); }}
              autoFocus
              id="start-time-input"
            />
          )}

          {step === 2 && (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    className={`chip ${duration === d ? "active" : ""}`}
                    onClick={() => setDuration(d)}
                  >
                    {formatDuration(d)}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
                  Custom: {formatDuration(duration)}
                </label>
                <input
                  type="range"
                  min={5}
                  max={480}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--color-primary-container)" }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <textarea
              className="input"
              placeholder="Write a message to your future self... Why will you regret skipping this?"
              value={regret}
              onChange={(e) => setRegret(e.target.value)}
              autoFocus
              id="regret-message-input"
            />
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {GROWTH_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  className={`chip ${growth === g.value ? "active" : ""}`}
                  onClick={() => setGrowth(g.value)}
                  style={{ flex: "1 1 calc(50% - 4px)", justifyContent: "center" }}
                >
                  <span style={{ fontSize: 20 }}>{g.emoji}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: 13, margin: "0 0 12px", fontWeight: 500 }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button className="btn btn-ghost" onClick={prev} style={{ flex: "0 0 auto" }}>
              ← Back
            </button>
          )}
          {!isLastStep ? (
            <button className="btn btn-primary btn-full" onClick={next}>
              Next →
            </button>
          ) : (
            <button className="btn btn-success btn-full" onClick={handleSubmit}>
              Create Task ✓
            </button>
          )}
        </div>

        <button
          onClick={close}
          className="btn btn-ghost btn-full"
          style={{ marginTop: 8, fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}