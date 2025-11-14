import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/register-form";
import { authOptions } from "@/lib/auth";

export default async function RegisterPage() {
  const authProvider = process.env.AUTH_PROVIDER ?? "local";

  if (authProvider === "neon") {
    redirect("/login");
  }

  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-6">
      <RegisterForm />
    </main>
  );
}
