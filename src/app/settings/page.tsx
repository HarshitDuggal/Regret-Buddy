"use client";

import { useEffect, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { exportAllData, clearAllData } from "@/lib/db";
import { requestPermission } from "@/lib/notifications";

export default function SettingsPage() {
  const { prefs, updatePrefs, initialize, showToast, registerFcmToken } = useTaskStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [exported, setExported] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isRegisteringFcm, setIsRegisteringFcm] = useState(false);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  useEffect(() => {
    if (prefs.newsletterEmail) {
      setEmailInput(prefs.newsletterEmail);
    } else {
      setEmailInput("");
    }
  }, [prefs.newsletterEmail]);

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
                style={{ width: "100%", accentColor: "var(--color-primary-container)", marginBottom: 12 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-subtle)", marginBottom: 16 }}>
                <span>1 min</span>
                <span>30 min</span>
              </div>

              {/* Firebase Cloud Push Control */}
              <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-outline-variant)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>🔥 Firebase Cloud Push</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      {prefs.fcmToken ? "Remote push active for background nagging" : "Enable push when browser is closed"}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    disabled={isRegisteringFcm}
                    onClick={async () => {
                      setIsRegisteringFcm(true);
                      const token = await registerFcmToken();
                      setIsRegisteringFcm(false);
                      if (token) {
                        showToast("Firebase Push Notifications active!", "success");
                      } else {
                        showToast("Failed to register FCM push token. Check browser permissions.", "error");
                      }
                    }}
                    style={{
                      fontSize: 12,
                      minHeight: 36,
                      padding: "4px 12px",
                      border: "1px solid var(--color-outline-variant)",
                      color: prefs.fcmToken ? "var(--color-success)" : "var(--color-primary)",
                    }}
                  >
                    {isRegisteringFcm ? "Registering..." : prefs.fcmToken ? "✓ FCM Active" : "Enable Push"}
                  </button>
                </div>
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

        {/* Newsletter Subscription Card */}
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>📩 Newsletter</h3>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 12px 0", lineHeight: "1.4" }}>
            Join the weekly accountability letter for feature updates, tips, and direct reality checks.
          </p>

          {prefs.newsletterEmail ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: "var(--color-text)" }}>
                  Subscribed as: <strong style={{ color: "var(--color-success)" }}>{prefs.newsletterEmail}</strong>
                </span>
                <span style={{ fontSize: 12, color: "var(--color-success)" }}>✓ Active</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  className="input"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  style={{ flex: 1, minHeight: 40, padding: "8px 12px", fontSize: 14 }}
                />
                {emailInput !== prefs.newsletterEmail && (
                  <button
                    className="btn btn-primary"
                    disabled={submittingNewsletter}
                    onClick={async () => {
                      const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);
                      if (!validateEmail(emailInput)) {
                        setErrorMsg("Invalid email address.");
                        return;
                      }
                      setSubmittingNewsletter(true);
                      try {
                        await fetch("/api/newsletter/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: emailInput, fcmToken: prefs.fcmToken }),
                        });
                        await updatePrefs({ newsletterEmail: emailInput });
                        showToast("Subscription email updated!", "success");
                      } catch {
                        showToast("Failed to sync newsletter subscription.", "error");
                      } finally {
                        setSubmittingNewsletter(false);
                      }
                    }}
                    style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }}
                  >
                    {submittingNewsletter ? "..." : "Update"}
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    updatePrefs({ newsletterEmail: "" });
                    setEmailInput("");
                    showToast("Unsubscribed from newsletter.", "info");
                  }}
                  style={{
                    minHeight: 40,
                    padding: "0 16px",
                    fontSize: 14,
                    border: "1px solid var(--color-outline-variant)",
                    color: "var(--color-danger)",
                  }}
                >
                  Unsubscribe
                </button>
              </div>
              {errorMsg && (
                <div style={{ color: "var(--color-danger)", fontSize: 11, marginTop: 4 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!emailInput) {
                  setErrorMsg("Email is required.");
                  return;
                }
                const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);
                if (!validateEmail(emailInput)) {
                  setErrorMsg("Please enter a valid email address.");
                  return;
                }
                setErrorMsg("");
                setSubmittingNewsletter(true);
                try {
                  await fetch("/api/newsletter/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailInput, fcmToken: prefs.fcmToken }),
                  });
                  await updatePrefs({ newsletterEmail: emailInput });
                  showToast("Subscribed to weekly updates!", "success");
                } catch {
                  showToast("Subscription saved locally.", "info");
                } finally {
                  setSubmittingNewsletter(false);
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Enter email to subscribe"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  style={{ flex: 1, minHeight: 40, padding: "8px 12px", fontSize: 14 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingNewsletter}
                  style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }}
                >
                  {submittingNewsletter ? "..." : "Subscribe"}
                </button>
              </div>
              {errorMsg && (
                <div style={{ color: "var(--color-danger)", fontSize: 11 }}>
                  {errorMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {/* About */}
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😈</div>
          <h3 style={{ margin: "0 0 4px" }}>Regret Buddy</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, margin: "0 0 4px" }}>
            v2.0.0
          </p>
          <p style={{ color: "var(--color-text-subtle)", fontSize: 12, fontStyle: "italic", margin: 0 }}>
            Made with regret.
          </p>
        </div>
      </div>
    </main>
  );
}
