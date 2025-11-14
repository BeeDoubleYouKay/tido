import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStory } from "@/lib/story-types";
import { KanbanBoard } from "@/components/kanban-board";

export default async function PlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const stories = await prisma.story.findMany({
    where: {
      ownerId: session.user.id
    },
    include: {
      assignee: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      tags: true
    },
    orderBy: [{ status: "asc" }, { position: "asc" }]
  });

  const serializedStories = stories.map((story) =>
    serializeStory({ ...story, children: [] })
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planning Board</h1>
        <p className="text-sm text-gray-600 mt-1">
          Organize your stories by status and track progress
        </p>
      </div>
      <KanbanBoard initialStories={serializedStories} />
    </div>
  );
}
