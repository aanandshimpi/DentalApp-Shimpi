"use client";

import { useState, type ReactNode } from "react";
import {
  Activity, Building2, CalendarDays, ChartNoAxesCombined, ClipboardList, CreditCard,
  FolderOpen, House, LogOut, Menu, Settings, Stethoscope, UserRound, UsersRound, X,
} from "lucide-react";
import { signOut } from "@/app/actions";
import { Brand } from "./brand";
import { Button } from "./ui/button";

const navigation = [
  ["Dashboard", House], ["Appointments", CalendarDays], ["Patients", UserRound],
  ["Consultations", Stethoscope], ["Treatment Plans", ClipboardList],
  ["Billing & Payments", CreditCard], ["Documents & Imaging", FolderOpen],
  ["Reports", ChartNoAxesCombined], ["Doctors & Staff", UsersRound], ["Settings", Settings],
] as const;

export function Workspace({ clinic, name, role, day, modules, children }: {
  clinic: string; name: string; role: string; day: string; modules: string[]; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <div className="workspace">
    <aside id="clinic-nav" className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Brand />
      <nav aria-label="Clinic navigation">
        {navigation.filter(([label]) => label === "Dashboard" || modules.includes(label)).map(([label, Icon]) =>
          label === "Dashboard"
            ? <a href="/dashboard" key={label} aria-current="page" onClick={() => setOpen(false)}><Icon />{label}</a>
            : <span key={label} aria-disabled="true" title="Available in a later milestone"><Icon />{label}</span>
        )}
      </nav>
      <div className="clinic-identity"><span><Building2 size={19} /></span><div><strong>{clinic}</strong><small>Clinic workspace</small></div></div>
    </aside>
    <div className="workspace-main">
      <header className="topbar">
        <div className="heading-group">
          <Button variant="outline" size="icon" className="mobile-nav" aria-expanded={open} aria-controls="clinic-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </Button>
          <h1>Dashboard</h1>
        </div>
        <div className="header-tools">
          <span className="date-chip"><CalendarDays size={15} />{day}</span>
          <a className="alert-link" href="#alerts" aria-label="View clinic alerts"><Activity size={19} /></a>
          <details className="account">
            <summary aria-label={`Account for ${name}`}><span className="avatar" aria-hidden="true">{name.replace(/^Dr\. /, "").split(" ").slice(0, 2).map((word) => word[0]).join("")}</span><span className="account-text"><strong>{name}</strong><small>{role}</small></span></summary>
            <form action={signOut}><Button variant="ghost" type="submit"><LogOut size={16} /> Sign out</Button></form>
          </details>
        </div>
      </header>
      <main className="dashboard">{children}</main>
    </div>
  </div>;
}
