"use client";

import { useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { triggerVibration } from "@/lib/notifications";

export default function VersionReleaseModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { updatePrefs, showToast } = useTaskStore();
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (emailStr: string) => {
    return /\S+@\S+\.\S+/.test(emailStr);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setIsSubscribed(true);
    triggerVibration("light");
    showToast("Joined newsletter successfully! Weekly accountability is coming.", "success");
    // Update preferences with the email
    updatePrefs({ newsletterEmail: email });
  };

  const handleDismiss = () => {
    triggerVibration("medium");
    updatePrefs({ hasSeenV2ReleaseNotes: true });
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={handleDismiss}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: "95dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="bottom-sheet-handle" />

        {/* Devil Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              fontSize: 56,
              marginBottom: 8,
              animation: "pulseScale 1.5s ease-in-out infinite",
            }}
          >
            😈
          </div>
          <h2 style={{ margin: "0 0 4px", color: "var(--color-primary)" }}>
            Regret Buddy 2.0
          </h2>
          <p
            style={{
              color: "var(--color-danger)",
              fontStyle: "italic",
              fontSize: 14,
              margin: 0,
            }}
          >
            The Routine & Strict Accountability Update
          </p>
        </div>

        {/* Release Notes */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            paddingRight: 4,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "var(--color-surface-container-high)",
              padding: 12,
              borderRadius: "var(--radius-md)",
              borderLeft: "4px solid var(--color-primary)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              📋 Weekday Routines & Templates
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
              Create task lists and templates that auto-apply to specific days of the week (e.g., Gym on Mon/Wed/Fri). Keep your routines consistent!
            </div>
          </div>

          <div
            style={{
              background: "var(--color-surface-container-high)",
              padding: 12,
              borderRadius: "var(--radius-md)",
              borderLeft: "4px solid var(--color-warning)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              🔔 Smart Escalating Alerts
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
              Escalating reminder engine triggers at start time, then at 5, 15, 30, and 60 minutes. It won&apos;t stop nagging until you finish.
            </div>
          </div>

          <div
            style={{
              background: "var(--color-surface-container-high)",
              padding: 12,
              borderRadius: "var(--radius-md)",
              borderLeft: "4px solid var(--color-error)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              💀 Strict 80% Streak Rule
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
              Streaks will only advance if you complete at least 80% of your day&apos;s tasks. Skip too much and suffer a reset.
            </div>
          </div>

          <div
            style={{
              background: "var(--color-surface-container-high)",
              padding: 12,
              borderRadius: "var(--radius-md)",
              borderLeft: "4px solid var(--color-success)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              📱 Lockscreen Widget & Actions
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
              Interactive PWA widget notifications pop up on overdue tasks. Complete or Skip directly from your lock screen.
            </div>
          </div>
        </div>

        {/* Newsletter Subscription Card */}
        <div
          style={{
            background: "var(--color-surface-container-low)",
            border: "1px solid var(--color-outline-variant)",
            padding: 16,
            borderRadius: "var(--radius-md)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📩 Stay Accountable Weekly
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              margin: "0 0 12px 0",
              lineHeight: "1.4",
            }}
          >
            Subscribe to our newsletter for weekly feature updates, accountability advice, and reminders to not procrastinate.
          </p>

          {!isSubscribed ? (
            <form
              onSubmit={handleSubscribe}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    padding: "8px 12px",
                    fontSize: 14,
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }}
                >
                  Join
                </button>
              </div>
              {error && (
                <div style={{ color: "var(--color-danger)", fontSize: 11 }}>
                  {error}
                </div>
              )}
            </form>
          ) : (
            <div
              style={{
                background: "var(--color-surface-container-high)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-success)",
                fontSize: 13,
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              ✓ Subscribed as {email}!
            </div>
          )}
        </div>

        {/* Action Button */}
        <button className="btn btn-success btn-full" onClick={handleDismiss}>
          Confront My Obligations 😈
        </button>
      </div>
    </div>
  );
}
