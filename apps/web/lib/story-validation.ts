import { z } from "zod";

export const storyStatus = z.enum([
  "BACKLOG",
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "DONE",
  "ARCHIVED"
]);

export const storyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: storyStatus.default("BACKLOG"),
  priority: z.number().int().min(1).max(5).default(3),
  parentId: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional()
});

export const storyUpdateSchema = storyCreateSchema.partial().extend({
  id: z.string().cuid()
});

export const storyDueDateSchema = z.object({
  storyId: z.string().cuid(),
  dueDate: z.string().datetime().nullable(),
  startDate: z.string().datetime().nullable().optional()
});

export type StoryStatusValue = z.infer<typeof storyStatus>;
export type StoryCreateInput = z.infer<typeof storyCreateSchema>;
export type StoryUpdateInput = z.infer<typeof storyUpdateSchema>;
