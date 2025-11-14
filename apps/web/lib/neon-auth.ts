import type { OAuthConfig } from "next-auth/providers";
import { z } from "zod";

type EnvShape = {
  NEON_AUTH_ISSUER: string;
  NEON_AUTH_CLIENT_ID: string;
  NEON_AUTH_CLIENT_SECRET: string;
  NEON_AUTH_AUDIENCE?: string;
};

const envSchema = z.object({
  NEON_AUTH_ISSUER: z.string().url(),
  NEON_AUTH_CLIENT_ID: z.string().min(1),
  NEON_AUTH_CLIENT_SECRET: z.string().min(1),
  NEON_AUTH_AUDIENCE: z.string().optional()
});

export function buildNeonProvider<TProfile extends Record<string, unknown>>():
  | OAuthConfig<TProfile>
  | null {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.warn("[auth] Neon Auth configuration incomplete", parsed.error.flatten().fieldErrors);
    return null;
  }

  const { NEON_AUTH_ISSUER, NEON_AUTH_CLIENT_ID, NEON_AUTH_CLIENT_SECRET, NEON_AUTH_AUDIENCE } =
    parsed.data;

  const issuer = NEON_AUTH_ISSUER.replace(/\/$/, "");

  return {
    id: "neon",
    name: "Neon",
    type: "oauth",
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    clientId: NEON_AUTH_CLIENT_ID,
    clientSecret: NEON_AUTH_CLIENT_SECRET,
    authorization: {
      params: {
        scope: NEON_AUTH_AUDIENCE
          ? `openid profile email ${NEON_AUTH_AUDIENCE}`
          : "openid profile email"
      }
    },
    checks: ["pkce", "state"],
    profile: (profile: any) => {
      const id =
        profile.sub ??
        profile.user_id ??
        profile.id;

      return {
        id: typeof id === "string" ? id : "",
        name: profile.name as string | undefined,
        email: profile.email as string | undefined
      } as unknown as TProfile;
    }
  } as unknown as OAuthConfig<TProfile>;
}
