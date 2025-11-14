import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session) {
    return NextResponse.json({ message: "Already signed in" }, { status: 400 });
  }

  if ((process.env.AUTH_PROVIDER ?? "local") === "neon") {
    return NextResponse.json(
      { message: "Registration is handled via Neon Auth. Use the Neon sign-in flow." },
      { status: 400 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (existing) {
    return NextResponse.json({ message: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      calendarPrefs: {
        create: {}
      }
    }
  });

  return NextResponse.json({ ok: true });
}
