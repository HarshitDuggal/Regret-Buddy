"use client";

import { useEffect, useRef } from "react";
import { useTaskStore } from "@/store/taskStore";
import dayjs from "dayjs";
import { sendNotification } from "@/lib/notifications";
import { getTaskStatus } from "@/lib/businessLogic";

/**
 * Smart reminder engine with escalating intervals:
 * - First reminder: at start time
 * - Then: +5min, +15min, +30min, +60min
 * - Respects notifiedCount to avoid spam
 * - Only checks current-day uncompleted tasks
 */
export default function useReminderEngine() {
  const { tasks, prefs } = useTaskStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!prefs.notificationsEnabled) return;

    const checkTasks = () => {
      const now = dayjs();

      for (const task of tasks) {
        if (task.completed || task.skipped) continue;

        const status = getTaskStatus(task);
        if (status === "pending") continue;

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