import { NextResponse } from "next/server";

// In-memory subscription registry (for server side)
const subscribers: Array<{ email: string; fcmToken?: string; subscribedAt: string }> = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fcmToken } = body;

    if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }

    const existingIndex = subscribers.findIndex((s) => s.email.toLowerCase() === email.toLowerCase());
    if (existingIndex >= 0) {
      subscribers[existingIndex] = {
        ...subscribers[existingIndex],
        fcmToken: fcmToken || subscribers[existingIndex].fcmToken,
        subscribedAt: new Date().toISOString(),
      };
    } else {
      subscribers.push({
        email,
        fcmToken,
        subscribedAt: new Date().toISOString(),
      });
    }

    console.log("[RegretBuddy API] Newsletter subscriber registered:", { email, fcmToken, total: subscribers.length });

    return NextResponse.json({
      success: true,
      message: `Subscribed ${email} to weekly accountability newsletter!`,
      totalSubscribers: subscribers.length,
    });
  } catch (err) {
    console.error("[RegretBuddy API] Newsletter subscription error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    totalSubscribers: subscribers.length,
    subscribers: subscribers.map((s) => ({ email: s.email, fcmToken: !!s.fcmToken, subscribedAt: s.subscribedAt })),
  });
}
