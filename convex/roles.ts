import { v } from 'convex/values';

export const userRoleValidator = v.union(
  v.literal('user'),
  v.literal('admin'),
);
