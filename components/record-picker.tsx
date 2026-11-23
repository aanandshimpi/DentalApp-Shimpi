"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

export function RecordPicker({ label, selected, options }: {
  label: string; selected: string; options: { href: string; label: string }[];
}) {
  const router = useRouter();
  const id = useId();

  return <div className="record-picker">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={selected} onChange={(event) => router.push(event.target.value, { scroll: false })}>
      {options.map(({ href, label }) => <option key={href} value={href}>{label}</option>)}
    </select>
  </div>;
}
