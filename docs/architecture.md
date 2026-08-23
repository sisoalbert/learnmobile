# Technical Architecture & Specification: Learn Expo

**Document Version:** 2.0  
**Target:** Full-stack implementation for an interactive learning application  
**Primary Stack:** React Native with Expo + Convex  
**Initial Product Scope:** Online-first MVP for structured React Native and Expo learning

---

## 1. Purpose

Learn Expo is a mobile learning application for developers who want to learn React Native and Expo through short, interactive lessons.

The application uses a Duolingo-inspired progression model built around:

- Short lessons
- Structured exercises
- Immediate server-authoritative feedback
- XP and daily goals
- Learning streaks
- Progressive lesson unlocking
- Optional audio, AI guidance, and offline learning in later releases

The first release should prove that developers will repeatedly complete short React Native and Expo lessons in this format.

---

## 2. Product Scope

### 2.1 MVP Features

The first production release includes:

- User authentication
- Course, unit, lesson, and exercise navigation
- Published course content
- Multiple-choice exercises
- Word-arrangement exercises
- Fill-in-the-blank exercises
- Short typed-answer exercises
- Server-side answer validation
- Lesson attempts
- Exercise attempt history
- Lesson completion and progress tracking
- XP rewards
- Daily learning goals
- User-local streak tracking
- Sequential lesson unlocking
- Audio playback for selected lessons
- Basic local asset caching
- Online-required learning sessions
- Analytics and error reporting

### 2.2 Deferred Features

The following features are intentionally excluded from the first MVP:

- Speaking exercises
- User audio uploads
- AI instructor streaming
- Vector search and retrieval-augmented generation
- Full offline lesson completion
- Push notifications
- Leagues
- Gems or virtual currency
- Streak freezes
- Complex heart regeneration
- Open-ended code execution
- User-generated course content

These features may be added after the core learning loop has been validated.

---

## 3. System Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                   React Native / Expo App                    │
│                                                              │
│  Expo Router                                                 │
│  Authentication Provider                                     │
│  Lesson and Exercise UI                                      │
│  Audio Playback                                              │
│  Local Preferences and Asset Cache                           │
│  Analytics and Error Reporting                               │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ Convex Queries, Mutations,
                        │ Actions, and WebSocket Subscriptions
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                        Convex Backend                        │
│                                                              │
│  Public Queries                                              │
│  Authenticated Mutations                                     │
│  Internal Queries and Mutations                              │
│  Scheduled Jobs                                              │
│  File Storage                                                │
│  Optional AI Actions                                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Convex Database                      │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ Optional External Integrations
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  LLM APIs | Expo Push Service | Analytics | Error Tracking  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Principles

### 4.1 Server-Authoritative Learning State

The client may display temporary interaction state, but the backend is authoritative for:

- Answer correctness
- Heart deduction
- XP awards
- Lesson completion
- Streak changes
- Lesson unlocking
- Progress records
- AI usage limits

The client must not be trusted to submit final scores, XP, completion state, or user ownership information.

### 4.2 Authenticated User Resolution

Protected backend functions must derive the current user from the authenticated Convex identity.

The client must not provide a `userId` for user-owned operations.

```typescript
const identity = await ctx.auth.getUserIdentity();

if (!identity) {
  throw new Error("Unauthenticated");
}
```

The backend then resolves the application user using the authentication token identifier.

### 4.3 Strong Runtime Validation

Exercise content, submitted answers, backend function arguments, and stored data should use explicit Convex validators.

Avoid `v.any()` for core domain data.

### 4.4 Online-First MVP

The MVP requires an active internet connection for:

- Starting lessons
- Submitting answers
- Completing lessons
- Updating XP
- Updating streaks
- Unlocking lessons

Previously downloaded static assets may remain available locally, but the application does not promise full offline lesson completion in Version 1.

### 4.5 Idempotent Mutations

Mutations that change user state must support safe retry behavior.

Answer submissions and lesson completion mutations must include an idempotency key so a repeated network request cannot:

- Deduct two hearts
- Award XP twice
- Record duplicate attempts
- Complete a lesson multiple times

---

## 5. Technology Stack

### 5.1 Frontend

- React Native
- Expo SDK
- TypeScript
- Expo Router
- Convex React client
- `expo-audio`
- `expo-file-system`
- React Native-compatible analytics provider
- React Native-compatible error reporting provider

### 5.2 Backend

- Convex database
- Convex queries
- Convex mutations
- Convex actions
- Convex scheduled functions
- Convex file storage

### 5.3 Authentication

Use one of:

- Convex Auth
- Clerk with Convex integration

The chosen authentication provider must expose a stable token identifier for linking authenticated identities to application users.

### 5.4 Optional External Services

Later releases may use:

- OpenAI or Anthropic for AI instructor features
- Expo Push Service for learning reminders
- Speech-to-text provider for speaking exercises
- Analytics and crash-reporting services

---

## 6. Frontend Application Structure

```text
app/
├── _layout.tsx
├── index.tsx
├── onboarding/
├── auth/
├── home/
├── course/
│   └── [courseId].tsx
├── lesson/
│   └── [lessonId].tsx
├── results/
└── profile/

src/
├── components/
├── features/
│   ├── auth/
│   ├── courses/
│   ├── lessons/
│   ├── exercises/
│   ├── progress/
│   └── gamification/
├── hooks/
├── lib/
├── state/
├── types/
└── utils/
```

### 6.1 Exercise UI State Machine

Each exercise follows the state sequence:

```text
idle
→ selected
→ submitting
→ correct | incorrect | error
```

The client may optimistically show:

- Selected answer
- Button state
- Loading state
- Temporary animation

The client must wait for the backend before showing final correctness, XP, heart, or completion results.

---

## 7. Database Schema

The schema below is a recommended baseline. Exact validators may be split into reusable files.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const exerciseType = v.union(
  v.literal("multiple_choice"),
  v.literal("word_arrangement"),
  v.literal("fill_in_the_blank"),
  v.literal("typing")
);

const lessonStatus = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("completed")
);

const attemptStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned")
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),

    timezone: v.string(),
    dailyGoalMinutes: v.number(),

    xpTotal: v.number(),
    streakCount: v.number(),
    lastQualifiedActivityDateKey: v.optional(v.string()),

    hearts: v.optional(v.number()),
    maxHearts: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  courses: defineTable({
    title: v.string(),
    description: v.string(),
    iconStorageId: v.optional(v.id("_storage")),
    order: v.number(),

    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),

    contentVersion: v.number(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_order", ["status", "order"]),

  units: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    overview: v.string(),
    order: v.number(),

    keyConcepts: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
      })
    ),

    keywords: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course_order", ["courseId", "order"]),

  lessons: defineTable({
    unitId: v.id("units"),
    title: v.string(),
    description: v.optional(v.string()),
    estimatedTimeMinutes: v.number(),
    order: v.number(),

    minimumPassingScore: v.number(),
    xpReward: v.number(),

    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_unit_order", ["unitId", "order"])
    .index("by_unit_status_order", ["unitId", "status", "order"]),

  exercises: defineTable({
    lessonId: v.id("lessons"),
    type: exerciseType,
    questionPrompt: v.string(),

    payload: v.union(
      v.object({
        type: v.literal("multiple_choice"),
        options: v.array(
          v.object({
            id: v.string(),
            text: v.string(),
          })
        ),
      }),

      v.object({
        type: v.literal("word_arrangement"),
        tokens: v.array(
          v.object({
            id: v.string(),
            text: v.string(),
          })
        ),
      }),

      v.object({
        type: v.literal("fill_in_the_blank"),
        textBeforeBlank: v.string(),
        textAfterBlank: v.string(),
        placeholder: v.optional(v.string()),
      }),

      v.object({
        type: v.literal("typing"),
        placeholder: v.optional(v.string()),
        language: v.optional(v.string()),
      })
    ),

    audioStorageId: v.optional(v.id("_storage")),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lesson_order", ["lessonId", "order"]),

  exerciseSolutions: defineTable({
    exerciseId: v.id("exercises"),

    gradingConfig: v.union(
      v.object({
        type: v.literal("multiple_choice"),
        correctOptionId: v.string(),
      }),

      v.object({
        type: v.literal("word_arrangement"),
        correctTokenIds: v.array(v.string()),
      }),

      v.object({
        type: v.literal("fill_in_the_blank"),
        acceptedAnswers: v.array(v.string()),
        caseSensitive: v.boolean(),
      }),

      v.object({
        type: v.literal("typing"),
        acceptedAnswers: v.array(v.string()),
        caseSensitive: v.boolean(),
        trimWhitespace: v.boolean(),
      })
    ),

    explanation: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_exercise", ["exerciseId"]),

  lessonProgress: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),

    status: lessonStatus,
    currentExerciseOrder: v.number(),

    bestScore: v.number(),
    attemptCount: v.number(),

    firstStartedAt: v.optional(v.number()),
    lastAttemptedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_status", ["userId", "status"]),

  lessonAttempts: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),

    status: attemptStatus,

    correctCount: v.number(),
    incorrectCount: v.number(),
    totalExercises: v.number(),

    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_status", ["userId", "status"]),

  exerciseAttempts: defineTable({
    attemptId: v.id("lessonAttempts"),
    userId: v.id("users"),
    exerciseId: v.id("exercises"),

    submittedAnswer: v.union(
      v.object({
        type: v.literal("multiple_choice"),
        optionId: v.string(),
      }),

      v.object({
        type: v.literal("word_arrangement"),
        tokenIds: v.array(v.string()),
      }),

      v.object({
        type: v.literal("fill_in_the_blank"),
        value: v.string(),
      }),

      v.object({
        type: v.literal("typing"),
        value: v.string(),
      })
    ),

    isCorrect: v.boolean(),
    responseTimeMs: v.optional(v.number()),
    idempotencyKey: v.string(),
    answeredAt: v.number(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_user_exercise", ["userId", "exerciseId"])
    .index("by_idempotency", ["idempotencyKey"]),

  dailyActivity: defineTable({
    userId: v.id("users"),
    dateKey: v.string(),
    minutesLearned: v.number(),
    lessonsCompleted: v.number(),
    xpEarned: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_date", ["userId", "dateKey"]),

  assetCacheMetadata: defineTable({
    storageId: v.id("_storage"),
    contentVersion: v.number(),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_storage", ["storageId"]),
});
```

---

## 8. User Authentication and Authorization

### 8.1 Current User Helper

All protected queries and mutations should call a shared helper.

```typescript
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function requireCurrentUser(
  ctx: MutationCtx | QueryCtx
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User profile not found");
  }

  return user;
}
```

### 8.2 Authorization Rules

The backend must verify:

- The current user owns the lesson attempt
- The exercise belongs to the attempt's lesson
- The lesson is published
- The lesson is unlocked
- The attempt is active
- The answer has not already been processed using the same idempotency key
- The user is permitted to access uploaded or generated files

Public functions should expose only data required by the client.

Internal functions should handle:

- Solution lookup
- XP calculation
- Streak calculation
- Administrative content operations
- AI persistence
- Scheduled maintenance

---

## 9. Course and Content Model

### 9.1 Course Hierarchy

```text
Course
└── Unit
    └── Lesson
        └── Exercise
```

### 9.2 Publishing Rules

Only published courses and lessons are visible to learners.

Content records support:

- `draft`
- `published`
- `archived`

A content version must be incremented when published learning content changes in a way that affects caching or grading.

### 9.3 Content Creation

Course content is managed in Convex. The Expo client does not bundle or seed curriculum data;
each Convex environment must contain its published courses, lessons, exercises, and private
solutions before learners use it.

### 9.4 Ordering

All parent-child collections use a consistent numeric `order` field.

Mutations that create or update content must prevent duplicate order values within the same parent collection.

---

## 10. Exercise System

### 10.1 Supported Exercise Types

#### Multiple Choice

```typescript
{
  type: "multiple_choice",
  optionId: "option-b"
}
```

#### Word Arrangement

```typescript
{
  type: "word_arrangement",
  tokenIds: ["token-1", "token-3", "token-2"]
}
```

#### Fill in the Blank

```typescript
{
  type: "fill_in_the_blank",
  value: "useState"
}
```

#### Typing

```typescript
{
  type: "typing",
  value: "npx expo start"
}
```

### 10.2 Server-Side Grading

Each exercise type has a dedicated grader.

```typescript
switch (exercise.type) {
  case "multiple_choice":
    return submitted.optionId === solution.correctOptionId;

  case "word_arrangement":
    return arraysEqual(
      submitted.tokenIds,
      solution.correctTokenIds
    );

  case "fill_in_the_blank":
    return acceptedTextMatch(submitted.value, solution);

  case "typing":
    return acceptedTextMatch(submitted.value, solution);
}
```

Do not compare answers using `JSON.stringify`.

### 10.3 Text Normalization

Text graders may support:

- Optional whitespace trimming
- Optional case sensitivity
- Unicode normalization
- Multiple accepted answers

Code-like answers should remain constrained and predictable in the MVP.

Open-ended code execution is not part of this architecture.

---

## 11. Lesson Attempt Flow

### 11.1 Start Lesson

The client calls:

```text
startLessonAttempt(lessonId)
```

The backend:

1. Resolves the current user
2. Verifies the lesson is published
3. Verifies the lesson is unlocked
4. Creates a lesson attempt
5. Creates or updates lesson progress
6. Returns the attempt ID and first exercise

### 11.2 Submit Answer

The client calls:

```text
submitAnswer({
  attemptId,
  exerciseId,
  submittedAnswer,
  idempotencyKey,
  responseTimeMs
})
```

The backend:

1. Resolves the current user
2. Verifies attempt ownership
3. Verifies attempt status
4. Verifies exercise membership
5. Checks for an existing idempotency key
6. Loads the private exercise solution
7. Grades the submitted answer
8. Records the exercise attempt
9. Updates lesson attempt totals
10. Applies heart logic if enabled
11. Returns authoritative result data

Example response:

```typescript
{
  isCorrect: true,
  explanation: "useState returns the current state and a setter.",
  heartsRemaining: 5,
  progress: {
    completedExercises: 3,
    totalExercises: 8,
  },
}
```

### 11.3 Complete Lesson

When all required exercises have been answered:

1. Calculate the score
2. Determine pass or retry state
3. Update lesson progress
4. Award XP exactly once
5. Update daily activity
6. Update streak state
7. Unlock the next lesson when applicable
8. Return the result summary

---

## 12. Gamification

### 12.1 MVP Gamification Features

The initial release includes:

- XP
- Daily goal
- Learning streak
- Lesson completion
- Progress path

Hearts are optional and should be tested carefully because technical learning benefits from experimentation.

### 12.2 XP

XP is awarded for completed lessons.

Rules:

- XP is calculated on the server
- XP is awarded once per qualifying completion
- Retakes may award reduced or zero XP
- XP writes must be idempotent

### 12.3 Daily Goal

The user selects a daily goal in minutes.

Recommended values:

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes

The backend stores aggregated daily activity by user-local date key.

### 12.4 Streak Logic

Streaks are updated when a qualifying learning event occurs, such as passing a lesson.

The user's IANA timezone is used to derive the local date key.

```text
Same local date:
  Keep the current streak.

Previous local date:
  Increment the streak.

Older than the previous local date:
  Reset the streak to 1.
```

A global UTC-midnight reset is not used as the primary streak mechanism.

A scheduled function may support reminders or cleanup, but streak correctness is event-driven.

### 12.5 Hearts

When enabled:

- Maximum hearts are defined by user game state
- Incorrect server-validated answers deduct one heart
- Retries with the same idempotency key do not deduct again
- The application must define regeneration and premium rules before launch

For the first MVP, hearts may be disabled entirely.

---

## 13. Lesson Unlocking

The default progression is sequential.

A lesson is unlocked when:

- It is the first published lesson in the course, or
- The preceding required lesson has been completed with a passing score

The backend must enforce unlocking rules. The client may visually show locked lessons but cannot bypass backend validation.

Future releases may support:

- Placement tests
- Optional lessons
- Review lessons
- Skill-tree prerequisites
- Course branches

---

## 14. Audio Playback and Storage

### 14.1 MVP Audio Scope

The MVP supports playback of pre-recorded lesson audio.

Use:

- `expo-audio`
- Convex file storage
- `expo-file-system` for local caching

### 14.2 Playback Flow

1. Query the exercise metadata
2. Request a file URL for the exercise storage ID
3. Download or stream the asset
4. Store the asset locally when appropriate
5. Play the file using `expo-audio`

### 14.3 Local Cache Path

Recommended format:

```text
/cache/learn-expo/audio/{contentVersion}/{storageId}.{extension}
```

### 14.4 Cache Metadata

The client tracks:

- Storage ID
- Content version
- Local path
- File size
- MIME type
- Download status
- Download time
- Last access time

### 14.5 Cache Eviction

The application should define:

- Maximum cache size
- Least-recently-used eviction
- Manual cache clearing
- Invalidating assets after content-version changes

Generated file URLs should not be treated as stable cache identifiers.

The stable storage ID and content version should be used instead.

---

## 15. Speaking Exercise Pipeline

Speaking exercises are deferred, but the expected future architecture is:

1. Authenticate the user
2. Generate a short-lived Convex upload URL
3. Record audio using `expo-audio`
4. Move the file to persistent local storage if needed
5. Upload the binary file
6. Receive a Convex storage ID
7. Call an authorized mutation to associate the file with a speaking submission
8. Process transcription or scoring asynchronously
9. Return feedback through a reactive query

Future speaking submissions require:

- Upload size limits
- Duration limits
- MIME validation
- Retention policy
- Consent and privacy language
- Abandoned-file cleanup
- Retry behavior
- Status tracking

---

## 16. Connectivity and Local Persistence

### 16.1 MVP Behavior

The MVP is online-first.

Convex subscriptions maintain live query state while the app is connected, but the in-memory cache is not treated as a durable offline database.

### 16.2 Locally Persisted Data

The client may persist:

- Onboarding completion
- Theme and preferences
- Selected daily goal
- Cached asset metadata
- In-progress UI state that can be safely restored
- Last visited course or lesson

### 16.3 Disconnection Handling

The UI must detect connection state and handle:

- Temporary network loss
- Failed answer submissions
- Retryable operations
- Expired sessions
- Incomplete lesson attempts

The application must not claim an answer was recorded until the backend confirms it.

### 16.4 Future Offline Learning

A future offline mode may use SQLite for:

- Published course manifests
- Unit and lesson content
- Public exercise payloads
- Downloaded audio assets
- Local active attempts
- Pending operation outbox
- Synchronization metadata

Offline synchronization requires explicit conflict resolution and content versioning.

---

## 17. AI Instructor Architecture

AI instructor functionality is deferred until the structured learning loop is validated.

### 17.1 Future Responsibilities

An AI instructor may:

- Explain incorrect answers
- Provide lesson-specific hints
- Answer constrained questions
- Generate guided examples
- Review a learner's previous mistakes

### 17.2 Convex Action Flow

A future action may:

1. Authenticate the user
2. Verify AI usage allowance
3. Load approved lesson context
4. Create a streaming assistant message
5. Call the external model
6. Buffer streamed text
7. Persist updates at controlled intervals
8. Mark the message complete
9. Record model and token usage

Do not write every model token to the database individually.

### 17.3 AI Data Model

```typescript
chatThreads: defineTable({
  userId: v.id("users"),
  lessonId: v.optional(v.id("lessons")),
  status: v.union(
    v.literal("active"),
    v.literal("archived")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_updated", ["userId", "updatedAt"]),

chatMessages: defineTable({
  threadId: v.id("chatThreads"),

  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("system"),
    v.literal("tool")
  ),

  content: v.string(),

  status: v.union(
    v.literal("streaming"),
    v.literal("complete"),
    v.literal("failed")
  ),

  model: v.optional(v.string()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),

  createdAt: v.number(),
})
  .index("by_thread_created", ["threadId", "createdAt"]);
```

### 17.4 AI Controls

Before launch, define:

- Authentication
- Rate limits
- Daily quotas
- Maximum input size
- Maximum output size
- Approved models
- Approved lesson context
- Prompt templates
- Timeout handling
- Retry behavior
- Moderation
- Retention policy
- User deletion behavior
- Model and prompt versioning

The client must not choose unrestricted system prompts or arbitrary models.

---

## 18. Scheduled Jobs

Scheduled functions are appropriate for:

- Analytics aggregation
- Expired upload cleanup
- Optional heart regeneration
- Push reminder scheduling
- AI usage reset
- Maintenance tasks

Scheduled functions should not perform a full user-table scan every UTC midnight to reset streaks.

---

## 19. Queries and Mutations

### 19.1 Public Queries

Recommended queries:

```text
courses.listPublished
courses.getCourse
courses.getCoursePath
lessons.getLesson
lessons.getLessonExercises
progress.getCurrentUserProgress
progress.getLessonProgress
gamification.getCurrentUserGameState
```

Published exercise queries must not include private grading configuration.

### 19.2 Authenticated Mutations

Recommended mutations:

```text
users.ensureCurrentUser
users.updateProfile
users.updateDailyGoal

lessons.startLessonAttempt
lessons.submitAnswer
lessons.completeLesson
lessons.abandonLessonAttempt

gamification.claimDailyGoalReward

audio.generateUploadUrl
audio.attachSpeakingSubmission
```

### 19.3 Internal Functions

Recommended internal functions:

```text
internal.grading.gradeExercise
internal.progress.applyLessonCompletion
internal.gamification.applyXp
internal.gamification.updateStreak
internal.audio.cleanupAbandonedFiles
internal.ai.persistStreamChunk
```

---

## 20. Error Handling

Backend functions should return structured domain errors where practical.

Suggested categories:

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
LESSON_LOCKED
LESSON_NOT_PUBLISHED
ATTEMPT_NOT_ACTIVE
EXERCISE_NOT_IN_ATTEMPT
DUPLICATE_SUBMISSION
INVALID_ANSWER
OUT_OF_HEARTS
RATE_LIMITED
NETWORK_ERROR
INTERNAL_ERROR
```

The client should map these categories to clear user-facing messages.

Do not expose internal stack traces, private IDs, grading configuration, or provider error details.

---

## 21. Observability

The application should track:

### Product Analytics

- Onboarding completion
- Course started
- Lesson started
- Exercise submitted
- Exercise correct
- Exercise incorrect
- Lesson abandoned
- Lesson completed
- Daily goal completed
- Streak increased
- Return rate
- Lesson completion rate
- Average response time
- Exercise difficulty

### Technical Monitoring

- Mutation failure rate
- Query failure rate
- App crashes
- Slow screens
- Upload failures
- Audio playback failures
- AI action latency
- AI provider errors
- Duplicate submission attempts

Analytics events must not include private answer keys, authentication tokens, or sensitive audio content.

---

## 22. Security Requirements

The application must enforce:

- Server-derived user identity
- Authorization for all user-owned records
- Private grading configuration
- Input validation
- File upload validation
- Idempotent state-changing mutations
- Rate limiting for expensive operations
- Protected administrative functions
- No secrets in the mobile client
- No direct client access to AI provider keys
- Minimal user data retention
- Account and data deletion support

---

## 23. Testing Strategy

### 23.1 Unit Tests

Test:

- Text normalization
- Array comparison
- Exercise grading
- XP calculation
- Streak transitions
- Lesson unlocking
- Score calculation
- Idempotency behavior

### 23.2 Backend Integration Tests

Test:

- Unauthorized access
- Attempt ownership
- Duplicate answer submissions
- Duplicate lesson completion
- Locked lesson access
- Draft content access
- Correct and incorrect grading
- XP award behavior
- Streak updates across local dates

### 23.3 Frontend Tests

Test:

- Exercise state transitions
- Loading states
- Retry states
- Disconnection behavior
- Locked lesson UI
- Progress restoration
- Audio loading and playback errors

### 23.4 End-to-End Tests

Critical flows:

1. Sign up
2. Select daily goal
3. Open the first course
4. Start a lesson
5. Submit correct and incorrect answers
6. Complete the lesson
7. Receive XP
8. Update streak
9. Unlock the next lesson
10. Restart the app and verify progress

---

## 24. Deployment Environments

Use separate Convex deployments for:

- Development
- Preview or staging
- Production

Each environment must have separate:

- Database
- Storage
- Authentication configuration
- AI credentials
- Analytics configuration
- Push credentials

Published course content must be created and validated in each Convex environment before that
environment is released.

---

## 25. Implementation Phases

### Phase 1: Foundation

- Expo application setup
- Expo Router
- Convex setup
- Authentication
- User creation
- Course schema
- Seed content

### Phase 2: Learning Loop

- Course path
- Lesson screen
- Exercise components
- Answer validation
- Lesson attempts
- Progress tracking

### Phase 3: Gamification

- XP
- Daily goals
- Streaks
- Lesson unlocking
- Results screen

### Phase 4: Reliability

- Idempotency
- Connection handling
- Error reporting
- Analytics
- Backend integration tests

### Phase 5: Content and Launch

- Initial React Native and Expo curriculum
- Content validation
- App-store assets
- Product analytics review
- Closed beta
- Public launch

### Phase 6: Post-MVP Evaluation

Evaluate whether to add:

- Hearts
- Audio-heavy lessons
- Speaking exercises
- AI instructor
- Offline lesson downloads
- Push reminders
- Additional courses

---

## 26. Architectural Decisions Summary

| Decision | Version 2.0 Choice |
|---|---|
| User identity | Derived from authenticated backend context |
| Exercise validation | Strong typed validators |
| Correct answers | Stored separately from public exercise content |
| Grading | Type-specific server-side graders |
| Progress model | Lesson progress + lesson attempts + exercise attempts |
| Duplicate protection | Idempotency keys |
| Streak updates | Event-driven using user-local date |
| MVP connectivity | Online-first |
| Offline support | Deferred |
| Audio package | `expo-audio` |
| Audio storage | Convex file storage |
| AI instructor | Deferred |
| Vector search | Removed from MVP |
| Notifications | Deferred |
| Content management | Seed scripts and internal admin functions |
| Code execution | Not included in MVP |

---

## 27. Final Recommendation

The Learn Expo MVP should remain focused on a reliable structured learning loop:

```text
Open lesson
→ Complete short exercises
→ Receive authoritative feedback
→ Finish lesson
→ Earn XP
→ Advance streak
→ Unlock next lesson
→ Return the next day
```

The architecture should not add AI, speaking, vector search, or full offline synchronization until this loop has demonstrated repeat usage and retention.
