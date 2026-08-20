import { v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';
import { requireAdmin } from './authz';
import { userRoleValidator } from './roles';

export const setUserRole = internalMutation({
  args: {
    userId: v.id('users'),
    role: userRoleValidator,
  },
  returns: v.object({
    userId: v.id('users'),
    role: userRoleValidator,
  }),
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(userId, { role });
    return { userId, role };
  },
});

export const listUsers = query({
  args: {},
  returns: v.array(v.object({
    id: v.id('users'),
    name: v.string(),
    email: v.string(),
    role: v.optional(userRoleValidator),
    plan: v.union(v.literal('free'), v.literal('premium')),
    platform: v.union(v.literal('iOS'), v.literal('Android'), v.literal('Web')),
    courseProgress: v.number(),
    streak: v.number(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    isActive: v.boolean(),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query('users').order('desc').take(250);
    const totalLessons = (await ctx.db.query('lessons').collect()).length;
    const activeThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);

    return await Promise.all(users.map(async (user) => {
      const [devices, progressRecords, streak] = await Promise.all([
        ctx.db.query('devices').withIndex('by_user', (q) => q.eq('userId', user._id)).collect(),
        ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', user._id)).collect(),
        ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', user._id)).first(),
      ]);
      const latestDevice = devices.reduce<(typeof devices)[number] | undefined>(
        (latest, device) => !latest || device.updatedAt > latest.updatedAt ? device : latest,
        undefined,
      );
      const completedLessons = new Set(progressRecords.flatMap((progress) => progress.completedLessonKeys)).size;
      const createdAt = user.createdAt ?? user._creationTime;
      const lastActiveAt = Math.max(
        user.lastActiveAt ?? createdAt,
        latestDevice?.lastSeenAt ?? 0,
      );
      const name = user.name?.trim()
        || [user.firstName, user.lastName].filter(Boolean).join(' ')
        || user.username
        || 'Unnamed user';

      return {
        id: user._id,
        name,
        email: user.email ?? 'No email',
        role: user.role,
        plan: user.plan ?? 'free',
        platform: latestDevice?.platform === 'ios'
          ? 'iOS' as const
          : latestDevice?.platform === 'android'
            ? 'Android' as const
            : 'Web' as const,
        courseProgress: totalLessons > 0
          ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
          : 0,
        streak: streak?.currentDays ?? 0,
        createdAt,
        lastActiveAt,
        isActive: lastActiveAt >= activeThreshold,
      };
    }));
  },
});

export const getUserDetails = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const [
      devices,
      courseProgressList,
      streak,
      dailyActivities,
      rewards,
      monthlyQuests,
      lessonRewards,
      userAchievements,
      allAchievements,
      lessonAttempts,
      subscriptions,
      pushDeliveries,
      leaderboardEntries,
      learnerSessions,
      allCourses,
      allUnits,
      allLessons,
    ] = await Promise.all([
      ctx.db.query('devices').withIndex('by_user', (q) => q.eq('userId', userId)).order('desc').collect(),
      ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', userId)).first(),
      ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', userId)).order('desc').take(30),
      ctx.db.query('learnerRewards').withIndex('by_user', (q) => q.eq('userId', userId)).first(),
      ctx.db.query('monthlyQuestProgress').withIndex('by_user_month', (q) => q.eq('userId', userId)).order('desc').take(12),
      ctx.db.query('lessonRewards').withIndex('by_user_month', (q) => q.eq('userId', userId)).order('desc').take(50),
      ctx.db.query('userAchievements').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('achievements').collect(),
      ctx.db.query('lessonAttempts').withIndex('by_user_status_completed_at', (q) => q.eq('userId', userId)).order('desc').take(50),
      ctx.db.query('subscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).order('desc').collect(),
      ctx.db.query('pushNotificationDeliveries').withIndex('by_user', (q) => q.eq('userId', userId)).order('desc').take(50),
      ctx.db.query('leaderboardEntries').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('learnerSessions').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('courses').collect(),
      ctx.db.query('units').collect(),
      ctx.db.query('lessons').collect(),
    ]);

    const courseMap = new Map(allCourses.map((c) => [c._id, c]));
    const unitMap = new Map(allUnits.map((u) => [u._id, u]));
    const lessonMap = new Map(allLessons.map((l) => [l._id, l]));

    const enrichedCourseProgress = await Promise.all(
      courseProgressList.map(async (cp) => {
        const course = courseMap.get(cp.courseId);
        const currentUnit = cp.currentUnitId ? unitMap.get(cp.currentUnitId) ?? (await ctx.db.get(cp.currentUnitId)) : null;
        const currentLesson = cp.currentLessonId ? lessonMap.get(cp.currentLessonId) ?? (await ctx.db.get(cp.currentLessonId)) : null;
        const courseLessons = allLessons.filter((l) => {
          const unit = unitMap.get(l.unitId);
          return unit?.courseId === cp.courseId;
        });
        const completionPct = courseLessons.length > 0
          ? Math.min(100, Math.round((cp.completedLessonKeys.length / courseLessons.length) * 100))
          : 0;

        return {
          ...cp,
          courseTitle: course?.title ?? 'Unknown course',
          courseKey: course?.key ?? '',
          completionPct,
          totalCourseLessons: courseLessons.length,
          currentUnitTitle: currentUnit?.title,
          currentLessonTitle: currentLesson?.title,
        };
      })
    );

    const userAchievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));
    const enrichedAchievements = allAchievements.map((achievement) => {
      const userAch = userAchievementMap.get(achievement._id);
      return {
        _id: achievement._id,
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        iconUrl: achievement.iconUrl,
        threshold: achievement.threshold,
        status: achievement.status,
        order: achievement.order,
        progress: userAch?.progress ?? 0,
        unlockedAt: userAch?.unlockedAt ?? null,
        isUnlocked: (userAch?.unlockedAt ?? 0) > 0 || (userAch?.progress ?? 0) >= achievement.threshold,
      };
    });

    const enrichedLessonAttempts = await Promise.all(
      lessonAttempts.map(async (attempt) => {
        const lesson = lessonMap.get(attempt.lessonId);
        const unit = lesson ? unitMap.get(lesson.unitId) : null;
        const course = unit ? courseMap.get(unit.courseId) : null;
        const exerciseAttempts = await ctx.db
          .query('exerciseAttempts')
          .withIndex('by_attempt', (q) => q.eq('lessonAttemptId', attempt._id))
          .collect();

        return {
          ...attempt,
          lessonTitle: lesson?.title ?? 'Unknown Lesson',
          lessonKey: lesson?.key ?? '',
          courseTitle: course?.title ?? 'Unknown Course',
          exerciseAttemptsCount: exerciseAttempts.length,
          exercises: exerciseAttempts.map((ea) => ({
            _id: ea._id,
            status: ea.status,
            score: ea.score,
            maximumScore: ea.maximumScore,
            responseTimeMs: ea.responseTimeMs,
            answeredAt: ea.answeredAt,
            submittedAnswer: ea.submittedAnswer,
          })),
        };
      })
    );

    const enrichedLeaderboardEntries = await Promise.all(
      leaderboardEntries.map(async (entry) => {
        const leaderboard = await ctx.db.get(entry.leaderboardId);
        return {
          ...entry,
          leaderboardKey: leaderboard?.key ?? 'global',
          period: leaderboard?.period ?? 'weekly',
          status: leaderboard?.status ?? 'active',
        };
      })
    );

    const latestDevice = devices.reduce<(typeof devices)[number] | undefined>(
      (latest, device) => !latest || device.updatedAt > latest.updatedAt ? device : latest,
      undefined,
    );

    const createdAt = user.createdAt ?? user._creationTime;
    const lastActiveAt = Math.max(
      user.lastActiveAt ?? createdAt,
      latestDevice?.lastSeenAt ?? 0,
    );
    const activeThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const totalCompletedLessons = new Set(courseProgressList.flatMap((p) => p.completedLessonKeys)).size;
    const totalXp = courseProgressList.reduce((acc, p) => acc + (p.totalXp ?? 0), 0);

    return {
      user: {
        _id: user._id,
        _creationTime: user._creationTime,
        createdAt,
        name: user.name ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        username: user.username ?? '',
        normalizedUsername: user.normalizedUsername ?? '',
        email: user.email ?? '',
        emailVerificationTime: user.emailVerificationTime,
        phone: user.phone ?? '',
        phoneVerificationTime: user.phoneVerificationTime,
        image: user.image ?? '',
        age: user.age,
        role: user.role ?? 'learner',
        plan: user.plan ?? 'free',
        isAnonymous: user.isAnonymous ?? false,
        timezone: user.timezone ?? 'UTC',
        lastActiveAt,
        lastPracticeAt: user.lastPracticeAt,
        lastStreakEmailAt: user.lastStreakEmailAt,
        nextStreakEmailAt: user.nextStreakEmailAt,
        streakEmailVariantIndex: user.streakEmailVariantIndex,
        isActive: lastActiveAt >= activeThreshold,
        platform: latestDevice?.platform === 'ios'
          ? ('iOS' as const)
          : latestDevice?.platform === 'android'
            ? ('Android' as const)
            : ('Web' as const),
      },
      onboarding: user.onboarding ?? null,
      stats: {
        totalXp,
        totalCompletedLessons,
        totalCoursesEnrolled: courseProgressList.length,
        currentStreak: streak?.currentDays ?? 0,
        longestStreak: streak?.longestDays ?? 0,
        gems: rewards?.gems ?? 0,
        devicesCount: devices.length,
        attemptsCount: lessonAttempts.length,
        activeSubscriptionsCount: subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').length,
      },
      streak: streak ?? null,
      courses: enrichedCourseProgress,
      dailyActivities,
      rewards: {
        gems: rewards?.gems ?? 0,
        monthlyQuests,
        lessonRewards,
      },
      achievements: enrichedAchievements,
      lessonAttempts: enrichedLessonAttempts,
      subscriptions,
      devices,
      pushDeliveries,
      leaderboards: enrichedLeaderboardEntries,
      learnerSessions,
    };
  },
});


export const deleteUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    deletedUserId: v.id('users'),
  }),
  handler: async (ctx, { userId, reason }) => {
    const admin = await requireAdmin(ctx);

    if (admin._id === userId) {
      throw new Error("Admins cannot delete their own account from the admin panel.");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const name = user.name?.trim()
      || [user.firstName, user.lastName].filter(Boolean).join(" ")
      || user.username
      || "Unnamed user";

    // 1. Record in deletedUsers table
    await ctx.db.insert("deletedUsers", {
      userId: String(user._id),
      name,
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt ?? user._creationTime,
      deletedAt: now,
      deletedByUserId: admin._id,
      deletedByEmail: admin.email,
      deletionReason: reason?.trim() || "Admin deleted user account",
      snapshotJson: JSON.stringify(user),
    });

    // 2. Cascade delete user records
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    const sessionIds = new Set(sessions.map((session) => session._id));

    const learningRecords = await Promise.all([
      ctx.db.query("userCourseProgress").withIndex("by_user_course", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("lessonAttempts").withIndex("by_user_lesson", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("exerciseAttempts").withIndex("by_user_exercise", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("dailyActivity").withIndex("by_user_date", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("streaks").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("learnerRewards").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("monthlyQuestProgress").withIndex("by_user_month", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("lessonRewards").withIndex("by_user_month", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("userAchievements").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("leaderboardEntries").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("learnerSessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("pushNotificationDeliveries").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    for (const records of learningRecords) {
      for (const record of records) await ctx.db.delete(record._id);
    }

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      const rateLimits = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", account._id))
        .collect();

      for (const verificationCode of verificationCodes) {
        await ctx.db.delete(verificationCode._id);
      }

      for (const rateLimit of rateLimits) {
        await ctx.db.delete(rateLimit._id);
      }
    }

    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const refreshToken of refreshTokens) {
        await ctx.db.delete(refreshToken._id);
      }
    }

    const sessionVerifiers = await ctx.db.query("authVerifiers").collect();

    for (const verifier of sessionVerifiers) {
      if (verifier.sessionId && sessionIds.has(verifier.sessionId)) {
        await ctx.db.delete(verifier._id);
      }
    }

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    await ctx.db.delete(userId);

    return { success: true, deletedUserId: userId };
  },
});

export const listDeletedUsers = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("deletedUsers"),
    _creationTime: v.number(),
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    plan: v.optional(v.union(v.literal("free"), v.literal("premium"))),
    createdAt: v.optional(v.number()),
    deletedAt: v.number(),
    deletedByUserId: v.optional(v.id("users")),
    deletedByEmail: v.optional(v.string()),
    deletionReason: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const records = await ctx.db.query("deletedUsers").order("desc").take(250);
    return records.map((record) => ({
      _id: record._id,
      _creationTime: record._creationTime,
      userId: record.userId,
      name: record.name,
      email: record.email,
      username: record.username,
      role: record.role,
      plan: record.plan,
      createdAt: record.createdAt,
      deletedAt: record.deletedAt,
      deletedByUserId: record.deletedByUserId,
      deletedByEmail: record.deletedByEmail,
      deletionReason: record.deletionReason,
    }));
  },
});
