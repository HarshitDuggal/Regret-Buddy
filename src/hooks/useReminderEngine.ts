"use client";

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import dayjs from "dayjs";
import {
  sendNotification,
  sendRichNotification,
  buildProcrastinationPayload,
} from "@/lib/notifications";
import { getTaskStatus, shouldPreNotify } from "@/lib/businessLogic";
import { updateTask } from "@/lib/db";

/**
 * Smart reminder engine with escalating intervals:
 * - Pre-task notification: fires N minutes before start (Feature 3.3)
 * - First reminder: at start time
 * - Then: +5min, +15min, +30min, +60min (escalation)
 * - Procrastination widget: rich notification with action buttons (Feature 3.2)
 * - Respects notifiedCount to avoid spam
 * - Only checks current-day uncompleted tasks
 */
export default function useReminderEngine() {
  const { tasks, prefs } = useTaskStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcrastinationRef = useRef<number>(0);

  useEffect(() => {
    if (!prefs.notificationsEnabled) return;

    const checkTasks = () => {
      const now = dayjs();
      const overdueTasks: typeof tasks = [];

      for (const task of tasks) {
        if (task.completed || task.skipped) continue;

        // ── Feature 3.3: Pre-notification ("Notify Before") ──
        if (shouldPreNotify(task)) {
          const minutesBefore = task.notifyBeforeMin;
          sendNotification(
            `⏰ Starting soon: ${task.title}`,
            `Starts in ${minutesBefore} minutes. Get ready.`,
            { urgent: false }
          );

          // Mark as pre-notified (side effect via DB)
          task.preNotified = true;
          updateTask(task).catch(() => {});
          continue; // Don't also send start-time notification in the same tick
        }

        const status = getTaskStatus(task);
        if (status === "pending") continue;

        // Collect overdue tasks for the procrastination widget
        if (status === "overdue") {
          overdueTasks.push(task);
        }

        const [startH, startM] = task.startTime.split(":").map(Number);
        const start = now.hour(startH).minute(startM).second(0);
        const minutesPast = now.diff(start, "minute");

        // Determine if we should send a notification based on escalating intervals
        const escalationPoints = [0, 5, 15, 30, 60, 120];
        const shouldNotify = escalationPoints.some(
          (point) =>
            minutesPast >= point && task.notifiedCount <= escalationPoints.indexOf(point)
        );

        if (shouldNotify && task.notifiedCount < escalationPoints.length) {
          const isOverdue = status === "overdue";
          const isUrgent = minutesPast > 30;

          sendNotification(
            isOverdue
              ? "⚠️ Overdue: " + task.title
              : "⏰ Time to start: " + task.title,
            task.regretMessage || "You committed to this. Don't let yourself down.",
            {
              urgent: isUrgent,
              badge: tasks.filter(
                (t) => !t.completed && !t.skipped && getTaskStatus(t) === "overdue"
              ).length,
            }
          );

          // Increment notified count (side effect via DB, but minimal)
          task.notifiedCount = (task.notifiedCount || 0) + 1;
        }
      }

      // ── Feature 3.2: Procrastination Widget ──
      // Send the rich procrastination notification if there are overdue tasks
      // Rate-limit to once every 10 minutes
      if (overdueTasks.length > 0) {
        const timeSinceLast = Date.now() - lastProcrastinationRef.current;
        if (timeSinceLast > 10 * 60 * 1000) {
          const firstRegret =
            overdueTasks[0].regretMessage || "You said you'd do this.";
          const payload = buildProcrastinationPayload(
            overdueTasks.length,
            firstRegret
          );
          sendRichNotification(payload);
          lastProcrastinationRef.current = Date.now();
        }
      }
    };

    // Check every minute (aligned to minute boundary for accuracy)
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;

    const alignedStart = setTimeout(() => {
      checkTasks();
      timerRef.current = setInterval(checkTasks, 60000) as unknown as ReturnType<typeof setTimeout>;
    }, msToNextMinute);

    return () => {
      clearTimeout(alignedStart);
      if (timerRef.current) clearInterval(timerRef.current as unknown as ReturnType<typeof setInterval>);
    };
  }, [tasks, prefs.notificationsEnabled]);
}