import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStory } from "@/lib/story-types";
import { BacklogTable } from "@/components/backlog-table";

export default async function BacklogPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [stories, users] = await Promise.all([
    prisma.story.findMany({
      where: {
        ownerId: session.user.id,
        parentId: null
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        tags: true,
        children: {
          include: {
            assignee: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
            children: true
          }
        }
      },
      orderBy: [{ priority: "asc" }, { position: "asc" }]
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    })
  ]);

  const serializedStories = stories.map((story) => {
    const serialized = serializeStory({ 
      ...story, 
      children: [] 
    });
    return {
      ...serialized,
      effort: story.effort,
      assignees: story.assignees.map((a: any) => a.user),
      children: story.children.map((child: any) => ({
        id: child.id,
        title: child.title,
        status: child.status,
        effort: child.effort
      }))
    } as any;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Prioritized Backlog</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage and prioritize your stories with drag-and-drop reordering
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <BacklogTable initialStories={serializedStories} users={users} />
      </div>
    </div>
  );
}
