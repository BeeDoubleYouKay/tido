import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const authProvider = (process.env.AUTH_PROVIDER ?? "local") as "local" | "neon";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-6">
      <LoginForm callbackUrl={searchParams?.callbackUrl} authProvider={authProvider} />
    </main>
  );
}
