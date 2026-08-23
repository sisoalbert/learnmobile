/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminContent from "../adminContent.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as featureFlags from "../featureFlags.js";
import type * as http from "../http.js";
import type * as learning from "../learning.js";
import type * as learningValidators from "../learningValidators.js";
import type * as mobileAdFlags from "../mobileAdFlags.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as passwordReset from "../passwordReset.js";
import type * as roles from "../roles.js";
import type * as streakReminderContent from "../streakReminderContent.js";
import type * as streakReminderEmail from "../streakReminderEmail.js";
import type * as streakReminderRules from "../streakReminderRules.js";
import type * as streakReminderTime from "../streakReminderTime.js";
import type * as streakReminders from "../streakReminders.js";
import type * as tasks from "../tasks.js";
import type * as userDeletion from "../userDeletion.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminContent: typeof adminContent;
  auth: typeof auth;
  authz: typeof authz;
  content: typeof content;
  crons: typeof crons;
  emails: typeof emails;
  featureFlags: typeof featureFlags;
  http: typeof http;
  learning: typeof learning;
  learningValidators: typeof learningValidators;
  mobileAdFlags: typeof mobileAdFlags;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  passwordReset: typeof passwordReset;
  roles: typeof roles;
  streakReminderContent: typeof streakReminderContent;
  streakReminderEmail: typeof streakReminderEmail;
  streakReminderRules: typeof streakReminderRules;
  streakReminderTime: typeof streakReminderTime;
  streakReminders: typeof streakReminders;
  tasks: typeof tasks;
  userDeletion: typeof userDeletion;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
