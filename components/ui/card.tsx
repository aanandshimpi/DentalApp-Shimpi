import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section data-slot="card" className={cn("min-w-0 rounded-xl border border-[var(--border)] bg-white shadow-[0_2px_4px_#17274a05]", className)} {...props} />;
}
