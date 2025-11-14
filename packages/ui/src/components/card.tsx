import { PropsWithChildren } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}
