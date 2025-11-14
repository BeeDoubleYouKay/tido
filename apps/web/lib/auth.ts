import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "./prisma";
import { buildNeonProvider } from "./neon-auth";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type Profile = Record<string, unknown> & { email?: string; name?: string };

function resolveProviders(): NextAuthOptions["providers"] {
  if ((process.env.AUTH_PROVIDER ?? "local") === "neon") {
    const neonProvider = buildNeonProvider<Profile>();
    if (!neonProvider) {
      // Fallback to credentials when Neon configuration is incomplete
      return [credentialsProvider];
    }

    return [neonProvider];
  }

  return [credentialsProvider];
}

const credentialsProvider = CredentialsProvider({
  name: "Email & Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials: Record<string, string> | undefined) {
    const parsed = credentialsSchema.safeParse(credentials);

    if (!parsed.success) {
      throw new Error("Invalid credentials payload");
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email }
    });

    if (!user || !user.passwordHash) {
      throw new Error("User not found");
    }

    const passwordMatches = await compare(parsed.data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error("Invalid email or password");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined
    } satisfies Profile;
  }
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: resolveProviders(),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    }
  }
};
