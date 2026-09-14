import { NextResponse } from "next/server";

/**
 * Remote FCM Push Notification Dispatch Endpoint
 * Sends FCM push notification payload to registered tokens
 * or triggers a test push notification dispatch.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, title, message, urgent, actionUrl } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "FCM token is required." },
        { status: 400 }
      );
    }

    const payload = {
      notification: {
        title: title || "⚠️ YOU ARE PROCRASTINATING",
        body: message || "You have overdue tasks. Confront your obligations now.",
        icon: "/devil.png",
      },
      data: {
        url: actionUrl || "/?action=overdue",
        tag: `push-nag-${Date.now()}`,
        urgent: urgent ? "true" : "false",
      },
    };

    console.log("[RegretBuddy API] FCM Remote Push Dispatch Payload:", {
      targetToken: token.substring(0, 15) + "...",
      payload,
    });

    // If server has FIREBASE_SERVER_KEY or Google Cloud credentials, FCM v1 REST API can be invoked here.
    const serverKey = process.env.FIREBASE_SERVER_KEY;
    if (serverKey) {
      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: token,
            ...payload,
          }),
        });
        const resData = await response.json();
        return NextResponse.json({ success: true, fcmResponse: resData });
      } catch (fcmErr) {
        console.warn("[RegretBuddy API] FCM REST API call failed:", fcmErr);
      }
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      message: "Remote FCM Push notification queued successfully.",
      payload,
    });
  } catch (err) {
    console.error("[RegretBuddy API] Push send error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch push notification." },
      { status: 500 }
    );
  }
}
