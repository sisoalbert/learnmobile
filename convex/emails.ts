"use node";

import { Resend } from "resend";
import { v } from "convex/values";

import { internalAction } from "./_generated/server";

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
  },
  handler: async (_ctx, { email }): Promise<{ id: string }> => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);
    const recipient = process.env.RESEND_TEST_RECIPIENT ?? email;
    const from =
      process.env.WELCOME_EMAIL_FROM ??
      "Learn Expo <onboarding@updates.learnexpo.online>";
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: "Welcome to Learn Expo!",
      html: `
        <div style="font-family: Arial, sans-serif; color: #4b4b4b; line-height: 1.6;">
          <h1 style="color: #1cb0f6;">Welcome to Learn Expo!</h1>
          <p>Your account is ready.</p>
          <p>We’re excited to help you build your React Native and Expo skills, one lesson at a time.</p>
          <p>Happy learning!</p>
        </div>
      `,
      text: [
        "Welcome to Learn Expo!",
        "",
        "Your account is ready.",
        "We’re excited to help you build your React Native and Expo skills, one lesson at a time.",
        "",
        "Happy learning!",
      ].join("\n"),
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Resend did not return an email ID");
    }

    return { id: data.id };
  },
});
