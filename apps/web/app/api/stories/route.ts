import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { StoryStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStory, type StoryWithTree } from "@/lib/story-types";
import { storyCreateSchema } from "@/lib/story-validation";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const stories = (await prisma.story.findMany({
    where: { ownerId: session.user.id },
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

  return NextResponse.json({ stories: stories.map((story) => serializeStory(story)) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = storyCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const story = await prisma.story.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority ?? 3,
      parentId: parsed.data.parentId ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      ownerId: session.user.id,
      position: parsed.data.parentId ? 0 : await nextPosition(session.user.id, parsed.data.status)
    },
    include: {
      children: true,
      assignee: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return NextResponse.json({ story: serializeStory(story as StoryWithTree) }, { status: 201 });
}

async function nextPosition(ownerId: string, status: StoryStatus | null | undefined) {
  const maxPosition = await prisma.story.aggregate({
    where: { ownerId, status: status || undefined },
    _max: {
      position: true
    }
  });

  return (maxPosition._max?.position ?? 0) + 1;
}
