# Regret Buddy 😈

A guilt-powered productivity Progressive Web App (PWA) designed to stop procrastination by holding your future self accountable. Regret Buddy tracks your daily tasks, calculates your streak based on >80% completion, and gives you a harsh reality check if you choose to skip your commitments.

## Features

- **Local-First Privacy**: 100% of your data lives on your device in IndexedDB. No external tracking, no backend required.
- **Smart Reminders**: Escalating notifications (5, 15, 30, 60 minutes) ensure you don't forget your active tasks.
- **Harsh Accountability**: A 3-tiered escalating rage message system calls you out when you skip tasks. Skip too much, and the app will let you know you are choosing mediocrity.
- **Daily Persistence**: A day-partitioned data store ensures the app remains fast and responsive, whether you have 10 tasks or 10,000 tasks.
- **Streak Tracking**: Complete at least 80% of your day's tasks to maintain your streak.
- **Optimized PWA**: Installable on iOS/Android as a standalone application. Includes "Add Task" app shortcuts and mobile vibration APIs. 

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Design System**: Auto-generated via Google Stitch MCP ("Obsidian Velocity" theme)
- **Styling**: Vanilla CSS custom properties matching Material Dynamic Color tokens.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: [IndexedDB v2](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via the `idb` wrapper.
- **PWA Capabilities**: `next-pwa`

## Getting Started

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Open the App**
   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment to Vercel

Regret Buddy is **100% production-ready** and safe to deploy immediately to Vercel. 

Because the entire application relies purely on Client Components (`"use client"`) and local IndexedDB storage, it operates as a static Single Page Application containing heavy Client-Side JavaScript. 

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your repository. Vercel will automatically detect `Next.js`.
4. Click **Deploy**. That's it!

> **Note on Environment Variables**: There are no required Environment Variables for the production app. The `STITCH_API_KEY` is completely optional and strictly meant for developers re-running the design generation scripts `stitch_setup.mjs`.

## Data Management

All your tasks, streaks, and preferences are saved locally on your device. However, you can go to the **Settings** tab to quickly download a `.json` backup of your entire history at any time.

---
*Made with regret. Don't be the same person you were yesterday.*
