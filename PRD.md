# Product Requirement Document (PRD): Regret Buddy

**Version:** 2.0  
**Status:** Live / Incremental Development  
**Author:** Antigravity AI  
**Date:** June 3, 2026

---

## 1. Executive Summary
**Regret Buddy** is a guilt-powered productivity Progressive Web App (PWA) designed to eliminate procrastination through harsh accountability and smart persistence. Unlike traditional to-do apps that gently remind you, Regret Buddy uses escalating notifications, "rage messages," and streak-based consequences to ensure your future self follows through on commitments.

---

## 2. Problem Statement
Most productivity tools fail because they are too "nice." Users ignore notifications, snooze tasks indefinitely, and feel no immediate consequence for failing their goals. Procrastination thrives in the absence of friction and social/internal pressure.

---

## 3. Goals & Objectives
- **Accountability:** Force users to confront their failures using "Regret Messages."
- **Persistence:** Ensure tasks are not forgotten via an escalating reminder engine.
- **Privacy:** Provide a 100% local-first experience where data never leaves the device.
- **Consistency:** Encourage daily habits through a strict 80% completion-based streak system.

---

## 4. Feature Set

### 4.1 Core Task Management
- **Status States:** Pending, Active, Overdue, Done, and Skipped.
- **Smart Sorting:** Tasks are automatically ordered by urgency (Overdue > Active > Pending) and priority (Critical > High > Medium > Low).
- **Day Partitioning:** Data is organized by `dayKey` (YYYY-MM-DD) with a configurable "Daily Reset Hour" (default 4:00 AM) to accommodate night owls.

### 4.2 Guilt & Accountability System
- **Regret Messages:** Users define a specific "consequence" or "shame message" when creating a task (e.g., "You're choosing to be mediocre").
- **Rage Messages:** A 3-tiered system that delivers increasingly harsh feedback based on the number of skipped tasks.
- **80% Streak Rule:** Streaks only advance if >80% of the day's tasks are completed. Failing this resets the streak.

### 4.3 Smart Notification Engine (Feature 3.2 & 3.3)
- **Escalating Reminders:** Notifications fire at the start time, then at 5, 15, 30, 60, and 120-minute intervals if the task remains uncompleted.
- **Pre-Notification:** Users can set a "Notify Before" interval (e.g., 10 mins before) to prepare for a task.
- **Procrastination Widget:** A rich PWA notification that appears when tasks are overdue, providing quick actions to "Complete" or "Skip" directly from the lock screen.

### 4.4 Routine & Multi-List System (Feature 3.4)
- **Task Lists:** Categorize tasks into multiple lists (e.g., General, Fitness, Deep Work).
- **Sticky Routines:** Define "Routine Tasks" as templates. These are automatically cloned into the active day's task list based on the day of the week (e.g., "Gym" every Mon, Wed, Fri).
- **Active Routine Config:** Switch between different routines or disable them as needed.

### 4.5 Technical Excellence
- **Local-First:** Built on IndexedDB (v3) for high-performance, offline-ready storage.
- **PWA Capabilities:** Installable on iOS/Android, offline support, background sync for notifications, and app shortcuts.
- **Modern UI:** "Obsidian Velocity" theme using Material Dynamic Color tokens and vanilla CSS custom properties.

---

## 5. Technology Stack
- **Frontend Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand
- **Database:** IndexedDB (via `idb` library)
- **Notifications:** Web Notifications API & Service Workers
- **Styling:** Vanilla CSS (Custom Properties)
- **Date Handling:** Day.js

---

## 6. Current Implementation Status

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **PWA Foundation** | ✅ Complete | Installable, Manifest, Service Worker |
| **Task CRUD** | ✅ Complete | Add, Edit, Delete, Status Toggle |
| **DB Migration** | ✅ Complete | v2 to v3 (Routines/Lists support) |
| **Reminder Engine** | ✅ Complete | Escalating intervals & Pre-notify |
| **Procrastination Widget**| ✅ Complete | Rich notifications with actions |
| **Routine System** | ✅ Complete | Templates & Day-of-week logic |
| **Streak Tracking** | ✅ Complete | 80% logic & Persistence |
| **Data Export/Import** | ✅ Complete | JSON backup/restore |

---

## 7. Future Roadmap
- **Social Regret:** Optional "Public Shame" mode (integrating with social APIs).
- **Visual Analytics:** Detailed breakdown of skip categories (Lazy vs. Genuine).
- **Hardware Integration:** Mobile vibration patterns for critical overdue tasks.
- **Cloud Sync:** Optional E2EE sync for multi-device support.
