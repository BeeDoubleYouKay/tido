import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
              ToTracker
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard/backlog" className="text-slate-600 hover:text-slate-900 transition-colors">
                Backlog
              </Link>
              <Link href="/dashboard/planning" className="text-slate-600 hover:text-slate-900 transition-colors">
                Planning
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{session.user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
