"use client";

import { useState, type ReactNode } from "react";
import type { TreatmentStatus } from "@/generated/prisma/enums";
import { treatmentStatusLabels } from "@/lib/treatment-progress";

export function TreatmentBoard({ columns }: {
  columns: { status: TreatmentStatus; count: number; content: ReactNode }[];
}) {
  const [selection, setSelection] = useState<TreatmentStatus | null>(null);
  const active = selection ?? columns.find(({ count }) => count > 0)?.status ?? "PLANNED";

  return <div role="group" aria-label="Treatment progress board">
    <div className="treatment-mobile-switch" role="group" aria-label="Treatment status">
      {columns.map(({ status, count }) => <button key={status} type="button"
        aria-pressed={active === status} onClick={() => setSelection(status)}>
        {treatmentStatusLabels[status]} <span>{count}</span>
      </button>)}
    </div>
    <div className="treatment-board">
      {columns.map(({ status, content }) => <div className="treatment-board-column" key={status} data-active={status === active}>
        {content}
      </div>)}
    </div>
  </div>;
}
