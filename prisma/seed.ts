import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@totracker.dev";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash("demo1234", 10);

    const demoUser = await prisma.user.create({
      data: {
        email,
        name: "Demo Product Owner",
        passwordHash,
        calendarPrefs: {
          create: {}
        }
      }
    });

    const createdStories = await Promise.all([
      prisma.story.create({
        data: {
          title: "[R2 Migration] Story 11: Production Deployment Checklist & Monitoring",
          description: "Deploy to production and set up monitoring for R2 migration.",
          status: "DONE",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 0,
          priority: 1,
          effort: 8,
          tags: {
            create: [
              { label: "documentation", color: "#0EA5E9" },
              { label: "infrastructure", color: "#8B5CF6" }
            ]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "Story 1: Architecture Design & Interface Specification",
          description: "Design the architecture and define interfaces for the system.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 1,
          priority: 2,
          effort: 5,
          tags: {
            create: [{ label: "enhancement", color: "#10B981" }]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "[R2 Migration] Story 6: Remove Static File Serving for Production",
          description: "Remove static file serving and migrate to R2.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 2,
          priority: 3,
          effort: 3,
          tags: {
            create: [
              { label: "enhancement", color: "#10B981" },
              { label: "infrastructure", color: "#8B5CF6" }
            ]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "[R2 Migration] Story 4: Implement R2MediaStorage Service",
          description: "Implement the R2 media storage service.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 3,
          priority: 3,
          effort: 13,
          tags: {
            create: [
              { label: "enhancement", color: "#10B981" },
              { label: "infrastructure", color: "#8B5CF6" }
            ]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "[R2 Migration] Story 7: Unit Tests for R2MediaStorage",
          description: "Write comprehensive unit tests for the R2 media storage service.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 4,
          priority: 3,
          effort: 5,
          tags: {
            create: [
              { label: "infrastructure", color: "#8B5CF6" },
              { label: "testing", color: "#F59E0B" }
            ]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "[R2 Migration] Story 10: Data Migration Script for Existing Uploads",
          description: "Create migration script to move existing uploads to R2.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 5,
          priority: 3,
          effort: 8,
          tags: {
            create: [{ label: "infrastructure", color: "#8B5CF6" }]
          },
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "Update some pages",
          description: "Update various pages across the application.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          assigneeId: demoUser.id,
          position: 6,
          priority: 3,
          effort: 2,
          assignees: {
            create: [{ userId: demoUser.id }]
          }
        }
      }),
      prisma.story.create({
        data: {
          title: "Update /dashboard/settings",
          description: "Update the dashboard settings page with new options.",
          status: "BACKLOG",
          ownerId: demoUser.id,
          position: 7,
          priority: 3,
          effort: 3
        }
      })
    ]);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
