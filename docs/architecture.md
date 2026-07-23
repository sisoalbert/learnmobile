# Technical Architecture & Specification: Learn Expo

**Stack:** React Native (Expo) + Convex Backend

**Document Version:** 1.0

**Target:** Full-stack implementation for interactive learning application.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              React Native / Expo Client                 │
│  (UI Components, Audio Recording/Playback, Navigation) │
└────────────┬──────────────────────────────┬─────────────┘
             │ React Hooks / Websocket      │ HTTP / File Upload
             ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                     Convex Backend                      │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│ │  Queries &   │  │  Storage &   │  │ Actions / Agent │ │
│ │  Mutations   │  │  Vector Search│  │ (AI Streaming)  │ │
│ └──────────────┘  └──────────────┘  └─────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                 Convex Database                     │ │
│ └─────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ Scheduled Jobs / HTTP API
                           ▼
             ┌───────────────────────────┐
             │ External AI APIs / FCM    │
             └───────────────────────────┘
```

---

## 2. Tech Stack & Dependencies

* **Frontend:** React Native (Expo SDK), React Navigation / Expo Router, Expo Audio / AV (`expo-audio`).
* **Backend:** Convex (`convex/react`, `convex/server`).
* **Authentication:** Convex Auth or Clerk integration.
* **File Storage:** Convex Native File Storage (for audio clips).
* **AI Engine:** Convex Actions calling LLM APIs (e.g., OpenAI / Anthropic) with streaming.

---

## 3. Database Schema (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users and Gamification Profile
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(), // Auth identifier
    dailyGoalMinutes: v.number(), // e.g., 5, 10, 15, 20
    streakCount: v.number(),
    hearts: v.number(), // Max 5
    lastActiveDate: v.string(), // ISO String YYYY-MM-DD
  }).index("by_token", ["tokenIdentifier"]),

  // Courses and Structure
  courses: defineTable({
    title: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    order: v.number(),
  }),

  units: defineTable({
    courseId: v.id("courses"),
    unitNumber: v.number(),
    title: v.string(),
    overview: v.string(),
    keyConcepts: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
      })
    ),
    keywords: v.array(v.string()),
  }).index("by_course", ["courseId"]),

  lessons: defineTable({
    unitId: v.id("units"),
    title: v.string(),
    estimatedTimeMinutes: v.number(),
    order: v.number(),
  }).index("by_unit", ["unitId"]),

  // Exercises
  exercises: defineTable({
    lessonId: v.id("lessons"),
    type: v.union(
      v.literal("multiple_choice"),
      v.literal("word_arrangement"),
      v.literal("fill_in_the_blank"),
      v.literal("typing"),
      v.literal("matching"),
      v.literal("listening"),
      v.literal("speaking"),
      v.literal("reading")
    ),
    questionPrompt: v.string(),
    payload: v.any(), // Flexible payload according to type
    correctAnswer: v.any(),
    audioFileId: v.optional(v.id("_storage")),
    order: v.number(),
  }).index("by_lesson", ["lessonId"]),

  // User Progress Tracking
  userProgress: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    completed: v.boolean(),
    score: v.number(),
    completedAt: v.number(), // Timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_and_lesson", ["userId", "lessonId"]),

  // AI Chat History (Conversation Exercise)
  chatMessages: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_user_and_lesson", ["userId", "lessonId"]),
});
```

---

## 4. Backend Specifications & Functions

### 4.1 Gamification Engine (`convex/gamification.ts`)

Handling answer validation, heart deduction, and streak tracking in ACID transactions.

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const validateAnswer = mutation({
  args: {
    userId: v.id("users"),
    exerciseId: v.id("exercises"),
    userAnswer: v.any(),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    const user = await ctx.db.get(args.userId);

    if (!exercise || !user) throw new Error("Invalid entity");

    const isCorrect = JSON.stringify(exercise.correctAnswer) === JSON.stringify(args.userAnswer);

    if (!isCorrect) {
      const newHearts = Math.max(0, user.hearts - 1);
      await ctx.db.patch(args.userId, { hearts: newHearts });
      return { success: false, heartsRemaining: newHearts };
    }

    return { success: true, heartsRemaining: user.hearts };
  },
});
```

---

### 4.2 Daily Goal & Streak Reset (Scheduled Crons)

Set up a Convex cron job (`convex/crons.ts`) to run daily at UTC midnight to check user streaks.

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "Reset streaks for inactive users",
  { hourUTC: 0, minuteUTC: 0 },
  internal.gamification.checkUserStreaks
);

export default crons;
```

---

### 4.3 Audio Asset Pipeline (`convex/audio.ts`)

Handles secure audio uploads for speaking exercises and streaming pre-recorded exercise clips.

* **Listening Exercise:** Fetch pre-signed storage URL for `audioFileId` via `ctx.storage.getUrl(exercise.audioFileId)`.
* **Speaking Exercise:** Direct audio upload from Expo client to Convex via pre-signed upload URLs using `generateUploadUrl`.

```typescript
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

---

### 4.4 AI Instructor Streaming (`convex/aiInstructor.ts`)

Use **Convex Actions** to interface with LLM endpoints and stream responses back to React Native.

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const streamInstructorReply = action({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Send prompt to LLM endpoint (e.g. OpenAI)
    // 2. Stream chunk updates directly to client using internal mutations
    // 3. Save final assistant response to chatMessages table
  },
});
```

---

## 5. Offline & Caching Strategy

1. **Query Caching:** Convex React Native client automatically keeps local memory cache updated via WebSocket subscription.
2. **Optimistic Updates:** Immediate UI reaction on answer submissions before server confirmation.
3. **Asset Caching:** Audio files and static UI images are cached locally using Expo FileSystem for smooth playback.
