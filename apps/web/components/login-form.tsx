"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@totracker/ui";

type LoginFormProps = {
  callbackUrl?: string;
  authProvider: "local" | "neon";
};

export function LoginForm({ callbackUrl, authProvider }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (authProvider === "neon") {
      await signIn("neon", { callbackUrl: callbackUrl ?? "/dashboard" });
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl ?? "/dashboard"
    });

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push(result?.url ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
      <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">
        {authProvider === "neon"
          ? "Sign in with your Neon account. You will be redirected to Neon Auth."
          : "Use your workspace credentials to access the agile board."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {authProvider === "local" && (
          <>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            />

            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              minLength={8}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            />
          </>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : authProvider === "neon" ? "Continue with Neon" : "Sign in"}
        </Button>
      </form>

      {authProvider === "local" && (
        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}
