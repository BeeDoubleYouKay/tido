import { getServerSession } from "next-auth";

import { StoryCalendarBoard } from "@/components/story-calendar-board";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStory, type StoryWithTree } from "@/lib/story-types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const stories = (await prisma.story.findMany({
    where: {
      ownerId: session?.user?.id ?? ""
    },
    include: {
      children: {
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          children: {
            include: {
              assignee: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      },
      assignee: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: [
      { dueDate: "asc" },
      { position: "asc" }
    ]
  })) as StoryWithTree[];

  const serialized = stories.map((story) => serializeStory(story));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sprint planner</h1>
          <p className="text-sm text-slate-600">
            Drag stories onto the calendar to set timelines. Parent stories can contain nested work items.
          </p>
        </div>
      </header>

  <StoryCalendarBoard initialStories={serialized} />
    </div>
  );
}
