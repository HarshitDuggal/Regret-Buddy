"use client";

import { useState, useEffect } from "react";
import type {
  RoutineTask,
  Task,
  Priority,
  HelpingInGrowing,
  DayOfWeek,
} from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { v4 as uuid } from "uuid";
import { getTodayKey } from "@/lib/businessLogic";
import TaskCard from "@/components/TaskCard";

const PRIORITY_EMOJI: Record<Priority, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

const GROWTH_EMOJI: Record<HelpingInGrowing, string> = {
  technical: "🔧",
  music: "🎵",
  physical: "💪",
  social: "🤝",
  other: "✨",
};

const DAY_LABELS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🔵 Low" },
];

const GROWTH_OPTIONS: { value: HelpingInGrowing; label: string }[] = [
  { value: "technical", label: "🔧 Technical" },
  { value: "music", label: "🎵 Music" },
  { value: "physical", label: "💪 Physical" },
  { value: "social", label: "🤝 Social" },
  { value: "other", label: "✨ Other" },
];

const NOTIFY_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5m" },
  { value: 10, label: "10m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1h" },
];

export default function RoutineTaskList({
  taskListId,
  listName,
  onBack,
}: {
  taskListId: string;
  listName: string;
  onBack: () => void;
}) {
  const {
    addRoutineTask,
    removeRoutineTask,
    fetchRoutineTasks,
    tasks: allTodayTasks,
    createTask,
    prefs,
  } = useTaskStore();

  const [templateTasks, setTemplateTasks] = useState<RoutineTask[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<"template" | "today" | null>(null);

  // Add form state
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [regret, setRegret] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [growth, setGrowth] = useState<HelpingInGrowing>("technical");
  const [notifyBefore, setNotifyBefore] = useState(0);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [error, setError] = useState("");

  // Today's live tasks that belong to this list
  const todayListTasks = allTodayTasks.filter(
    (t) => (t.taskListId || "general") === taskListId
  );

  const loadTemplateTasks = async () => {
    setLoading(true);
    const result = await fetchRoutineTasks(taskListId);
    setTemplateTasks(result);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplateTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskListId]);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const resetForm = () => {
    setTitle("");
    setRegret("");
    setStartTime("09:00");
    setDuration(30);
    setPriority("medium");
    setGrowth("technical");
    setNotifyBefore(0);
    setDays([]);
    setShowAdd(false);
    setAddMode(null);
    setError("");
  };

  const handleAddTemplate = async () => {
    if (!title.trim()) {
      setError("Name the task. Even a bad plan is better than no plan.");
      return;
    }

    const newTask: RoutineTask = {
      id: uuid(),
      taskListId,
      title: title.trim(),
      startTime,
      estimatedMinutes: duration,
      regretMessage: regret.trim(),
      mandatory: priority === "critical" || priority === "high",
      priority,
      helps_in_growing: growth,
      notifyBeforeMin: notifyBefore,
      order: templateTasks.length,
      days,
    };

    await addRoutineTask(newTask);
    await loadTemplateTasks();
    resetForm();
  };

  const handleAddForToday = async () => {
    if (!title.trim()) {
      setError("Name the task. Even a bad plan is better than no plan.");
      return;
    }

    const liveTask: Task = {
      id: uuid(),
      title: title.trim(),
      startTime,
      estimatedMinutes: duration,
      deadline: startTime,
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
      notifyBeforeMin: notifyBefore,
      preNotified: false,
      taskListId,
    };

    await createTask(liveTask);
    resetForm();
  };

  const handleRemoveTemplate = async (id: string) => {
    await removeRoutineTask(id, taskListId);
    await loadTemplateTasks();
  };

  const formatDuration = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  const isGeneralList = taskListId === "general";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={onBack}
          style={{ padding: "8px" }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{listName}</h2>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TODAY'S LIVE TASKS for this list            */}
      {/* ═══════════════════════════════════════════ */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: 14,
            color: "var(--color-warning)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          📅 Today&apos;s Tasks ({todayListTasks.length})
        </h3>
        {todayListTasks.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--color-text-subtle)",
              fontSize: 13,
            }}
          >
            No tasks for today in this list.
            {!isGeneralList && " Apply this routine or add a task."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayListTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TEMPLATE TASKS (recurring schedule)         */}
      {/* Only show for non-General lists             */}
      {/* ═══════════════════════════════════════════ */}
      {!isGeneralList && (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 14,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            🔁 Recurring Template ({templateTasks.length})
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-text-subtle)", margin: "0 0 10px" }}>
            These tasks are auto-added when this routine is applied.
          </p>

          {loading ? (
            <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>
              Loading...
            </p>
          ) : templateTasks.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "20px",
                color: "var(--color-text-subtle)",
                fontSize: 13,
              }}
            >
              No recurring tasks defined yet.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {templateTasks.map((task) => (
                <div
                  key={task.id}
                  className="card"
                  style={{ padding: "12px 14px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 12 }}>
                          {PRIORITY_EMOJI[task.priority]}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          {task.title}
                        </span>
                        <span style={{ fontSize: 12 }}>
                          {GROWTH_EMOJI[task.helps_in_growing]}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <span>🕐 {task.startTime}</span>
                        <span>⏱ {formatDuration(task.estimatedMinutes)}</span>
                        {task.notifyBeforeMin > 0 && (
                          <span>🔔 -{task.notifyBeforeMin}m</span>
                        )}
                      </div>
                      {task.days.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {task.days.map((d) => (
                            <span
                              key={d}
                              style={{
                                fontSize: 10,
                                background: "var(--color-surface-container-highest)",
                                padding: "2px 6px",
                                borderRadius: "var(--radius-full)",
                                color: "var(--color-text-muted)",
                                textTransform: "uppercase",
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--color-text-subtle)",
                            marginTop: 4,
                          }}
                        >
                          Every day
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 10px",
                        fontSize: 14,
                        color: "var(--color-danger)",
                      }}
                      onClick={() => handleRemoveTemplate(task.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ADD TASK BUTTON + FORM                     */}
      {/* ═══════════════════════════════════════════ */}
      {!showAdd ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              setShowAdd(true);
              setAddMode("today");
            }}
          >
            + Add Task for Today
          </button>
          {!isGeneralList && (
            <button
              className="btn btn-ghost btn-full"
              onClick={() => {
                setShowAdd(true);
                setAddMode("template");
              }}
              style={{ border: "1px solid var(--color-outline-variant)" }}
            >
              + Add Recurring Template
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 8 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>
            {addMode === "template" ? "New Recurring Task" : "New Task for Today"}
          </h3>
          <p style={{ fontSize: 11, color: "var(--color-text-subtle)", margin: "0 0 14px" }}>
            {addMode === "template"
              ? "This will be added automatically when the routine is applied."
              : "This task will appear on today's home screen."}
          </p>

          {/* Title */}
          <input
            className="input"
            placeholder="Task name"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            autoFocus
            style={{ marginBottom: 12 }}
          />

          {/* Time + Duration */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Start Time
              </label>
              <input
                type="time"
                className="input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Duration
              </label>
              <select
                className="input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[15, 30, 45, 60, 90, 120, 180, 240].map((d) => (
                  <option key={d} value={d}>
                    {formatDuration(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Days of week — only for templates */}
          {addMode === "template" && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Which days? (empty = every day)
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                {DAY_LABELS.map((d) => (
                  <button
                    key={d.value}
                    className={`chip ${days.includes(d.value) ? "active" : ""}`}
                    onClick={() => toggleDay(d.value)}
                    style={{ padding: "6px 10px", fontSize: 12, flex: 1 }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priority + Growth */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Priority
              </label>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Growth Area
              </label>
              <select
                className="input"
                value={growth}
                onChange={(e) =>
                  setGrowth(e.target.value as HelpingInGrowing)
                }
              >
                {GROWTH_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notify Before */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              🔔 Notify Before
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {NOTIFY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`chip ${notifyBefore === opt.value ? "active" : ""}`}
                  onClick={() => setNotifyBefore(opt.value)}
                  style={{ padding: "6px 10px", fontSize: 12, flex: 1 }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regret Message */}
          <textarea
            className="input"
            placeholder="Why will you regret skipping this?"
            value={regret}
            onChange={(e) => setRegret(e.target.value)}
            style={{ marginBottom: 12, minHeight: 60 }}
          />

          {/* Error */}
          {error && (
            <p
              style={{
                color: "var(--color-danger)",
                fontSize: 13,
                margin: "0 0 12px",
                fontWeight: 500,
              }}
            >
              {error}
            </p>
          )}

          {/* Form actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              onClick={addMode === "template" ? handleAddTemplate : handleAddForToday}
            >
              {addMode === "template" ? "Add Template ✓" : "Add for Today ✓"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
