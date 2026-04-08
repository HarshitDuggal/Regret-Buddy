"use client";

import { useEffect, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { exportAllData, clearAllData } from "@/lib/db";
import { requestPermission } from "@/lib/notifications";

export default function SettingsPage() {
  const { prefs, updatePrefs, initialize } = useTaskStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regret-buddy-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleClear = async () => {
    await clearAllData();
    setConfirmClear(false);
    window.location.reload();
  };

  const toggleNotifications = async () => {
    if (!prefs.notificationsEnabled) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updatePrefs({ notificationsEnabled: !prefs.notificationsEnabled });
  };

  return (
    <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, paddingTop: "var(--space-sm)" }}>
        <h1 style={{ margin: "0 0 4px" }}>Settings</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: 0 }}>
          Configure your accountability.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Notifications */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>🔔 Notifications</h3>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Enable Reminders</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Get nagged when tasks are due
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              style={{
                width: 52,
                height: 30,
                borderRadius: 15,
                border: "none",
                background: prefs.notificationsEnabled
                  ? "var(--color-primary-container)"
                  : "var(--color-surface-container-highest)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              id="notifications-toggle"
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: 3,
                  left: prefs.notificationsEnabled ? 25 : 3,
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {prefs.notificationsEnabled && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>Reminder Interval</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-primary)",
                  }}
                >
                  {prefs.reminderIntervalMin} min
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={prefs.reminderIntervalMin}
                onChange={(e) => updatePrefs({ reminderIntervalMin: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--color-primary-container)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-subtle)" }}>
                <span>1 min</span>
                <span>30 min</span>
              </div>
            </div>
          )}
        </div>

        {/* Daily Reset */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>🌅 Daily Reset</h3>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>New Day Starts At</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-primary)",
                }}
              >
                {prefs.dailyResetHour}:00
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              value={prefs.dailyResetHour}
              onChange={(e) => updatePrefs({ dailyResetHour: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--color-primary-container)" }}
            />
            <p style={{ fontSize: 12, color: "var(--color-text-subtle)", margin: "6px 0 0" }}>
              Tasks created before this hour count as the previous day.
            </p>
          </div>
        </div>

        {/* Data */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>💾 Data</h3>

          <button
            className="btn btn-ghost btn-full"
            onClick={handleExport}
            style={{
              marginBottom: 10,
              border: "1px solid var(--color-outline-variant)",
              justifyContent: "flex-start",
            }}
          >
            📥 {exported ? "Downloaded!" : "Export All Data"}
          </button>

          {!confirmClear ? (
            <button
              className="btn btn-ghost btn-full"
              onClick={() => setConfirmClear(true)}
              style={{
                border: "1px solid var(--color-error-container)",
                color: "var(--color-danger)",
                justifyContent: "flex-start",
              }}
            >
              🗑️ Clear All Data
            </button>
          ) : (
            <div style={{ background: "var(--color-error-container)", borderRadius: "var(--radius-md)", padding: 16 }}>
              <p style={{ color: "var(--color-error)", fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>
                ⚠️ This will permanently delete all your tasks, stats, and streak. Are you sure?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClear}>
                  Yes, Delete Everything
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😈</div>
          <h3 style={{ margin: "0 0 4px" }}>Regret Buddy</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, margin: "0 0 4px" }}>
            v0.1.0
          </p>
          <p style={{ color: "var(--color-text-subtle)", fontSize: 12, fontStyle: "italic", margin: 0 }}>
            Made with regret.
          </p>
        </div>
      </div>
    </main>
  );
}
