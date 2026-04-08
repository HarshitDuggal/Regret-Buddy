/**
 * Three-tier rage message system — escalates based on daily skip count.
 * Tier 1 (skips 1-2): Mild disappointment
 * Tier 2 (skips 3-5): Harsh reality check
 * Tier 3 (skips 6+):  Nuclear truth bombs
 */

const mildMessages = [
  "Nice. Future you is now slightly worse.",
  "Great job delaying your own success.",
  "Another step away from your goals.",
  "You just traded discipline for comfort.",
  "Tomorrow-you won't thank you for this.",
  "One more skip won't kill you. But it'll sting later.",
  "Your potential just filed a complaint.",
  "Comfortable? Good. Growth isn't.",
  "The gap between you and your goals just got wider.",
  "Even your excuses are getting tired.",
];

const harshMessages = [
  "At this rate, you'll be the same person next year.",
  "Consistency is what separates dreamers from doers. Guess which one you are.",
  "You're not 'taking a break,' you're building a habit of quitting.",
  "Your future self is watching you right now. And they're embarrassed.",
  "You said you wanted to change. Actions say otherwise.",
  "Every skip is a vote for the person you don't want to be.",
  "This is why most people never improve.",
  "You're training your brain to give up. It's learning fast.",
  "Imagine explaining this skip to someone you admire.",
  "The pain of discipline weighs ounces. The pain of regret weighs tons.",
];

const nuclearMessages = [
  "Six tasks skipped today. At this point, why even open the app?",
  "You're not procrastinating. You're choosing mediocrity.",
  "Your goals are just decoration at this point.",
  "You have all the tools. You just refuse to use them.",
  "The only thing consistent about you today is quitting.",
  "You're proving everyone right who doubted you.",
  "Your comfort zone isn't protecting you. It's a cage.",
  "You're not tired. You're uninspired. And that's worse.",
  "Delete your goals if you're not going to chase them.",
  "Rock bottom has a basement, and you're renovating it.",
];

/** Pick a rage message based on how many tasks have been skipped today */
export function pickRageMessage(dailySkipCount: number): string {
  let pool: string[];

  if (dailySkipCount <= 2) {
    pool = mildMessages;
  } else if (dailySkipCount <= 5) {
    pool = harshMessages;
  } else {
    pool = nuclearMessages;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get a motivational quote for the dashboard (rotates daily) */
export function getDailyQuote(): string {
  const quotes = [
    "Future you is judging you.",
    "Discipline is just choosing between what you want now and what you want most.",
    "The best time to start was yesterday. The second best is right now.",
    "You don't rise to the level of your goals. You fall to the level of your habits.",
    "Hard choices, easy life. Easy choices, hard life.",
    "Your only competition is who you were yesterday.",
    "Motivation gets you started. Discipline keeps you going.",
  ];

  const today = new Date();
  const index = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % quotes.length;
  return quotes[index];
}