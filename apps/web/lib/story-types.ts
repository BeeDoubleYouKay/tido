import type { Story, User } from "@prisma/client";

export type StoryWithTree = Story & {
  assignee: Pick<User, "id" | "email" | "name"> | null;
  children: StoryWithTree[];
};

export type SerializedStory = Omit<Story, "dueDate" | "startDate" | "createdAt" | "updatedAt"> & {
  dueDate: string | null;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
  children: SerializedStory[];
  assignee: Pick<User, "id" | "email" | "name"> | null;
};

export function serializeStory(story: StoryWithTree): SerializedStory {
  return {
    ...story,
    dueDate: story.dueDate ? story.dueDate.toISOString() : null,
    startDate: story.startDate ? story.startDate.toISOString() : null,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
    assignee: story.assignee,
    children: (story.children ?? []).map((child: StoryWithTree) => serializeStory(child))
  };
}
