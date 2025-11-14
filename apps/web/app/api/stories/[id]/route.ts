import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStory, type StoryWithTree } from "@/lib/story-types";
import { storyCreateSchema } from "@/lib/story-validation";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = storyCreateSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.story.findFirst({
    where: { id: params.id, ownerId: session.user.id }
  });

  if (!existing) {
    return NextResponse.json({ message: "Story not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.parentId !== undefined) data.parentId = parsed.data.parentId ?? null;
  if (parsed.data.dueDate !== undefined)
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.startDate !== undefined)
    data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  
  // Handle effort field
  if (body.effort !== undefined) data.effort = body.effort === null ? null : Number(body.effort);
  
  // Handle position field
  if (body.position !== undefined) data.position = Number(body.position);

  // Handle multiple assignees if provided
  let assigneesData: { user: { id: string; email: string; name: string | null } }[] = [];
  if (body.assignees !== undefined && Array.isArray(body.assignees)) {
    // First, delete existing assignees
    await prisma.storyAssignee.deleteMany({
      where: { storyId: params.id }
    });

    // Then create new assignees
    if (body.assignees.length > 0) {
      await prisma.storyAssignee.createMany({
        data: body.assignees.map((user: any) => ({
          storyId: params.id,
          userId: user.id
        })),
        skipDuplicates: true
      });

      // Fetch the created assignees with user data
      const fetchedAssignees = await prisma.storyAssignee.findMany({
        where: { storyId: params.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });
      assigneesData = fetchedAssignees;
    }
  }

  const updated = (await prisma.story.update({
    where: { id: params.id },
    data,
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
      }
    }
  })) as StoryWithTree;

  const serialized = serializeStory(updated);
  return NextResponse.json({ 
    story: {
      ...serialized,
      effort: updated.effort,
      assignees: assigneesData.length > 0 ? assigneesData.map(a => a.user) : (updated as any).assignees.map((a: any) => a.user)
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const story = await prisma.story.findFirst({
    where: { id: params.id, ownerId: session.user.id }
  });

  if (!story) {
    return NextResponse.json({ message: "Story not found" }, { status: 404 });
  }

  await prisma.story.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
