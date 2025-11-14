"use client";

import { Button } from "@totracker/ui";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-600 hover:text-slate-900"
    >
      Sign out
    </Button>
  );
}
