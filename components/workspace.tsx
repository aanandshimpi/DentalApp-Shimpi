"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Activity, Building2, CalendarDays, ChartNoAxesCombined, ClipboardList, CreditCard,
  FolderOpen, House, LogOut, Menu, Settings, Stethoscope, UserRound, UsersRound, X,
} from "lucide-react";
import { clinicBrand } from "@/lib/brand";
import { signOut } from "@/app/actions";
import { Brand } from "./brand";
import { Button } from "./ui/button";

const navigation = [
  ["Dashboard", House, "/dashboard"], ["Appointments", CalendarDays, "/appointments"], ["Patients", UserRound, "/patients"],
  ["Consultations", Stethoscope, "/consultations"], ["Treatment Plans", ClipboardList, "/treatment-plans"],
  ["Billing & Payments", CreditCard], ["Documents & Imaging", FolderOpen],
  ["Reports", ChartNoAxesCombined], ["Doctors & Staff", UsersRound], ["Settings", Settings],
] as const;

export function Workspace({ clinic, name, role, day, modules, section = "Dashboard", children }: {
  clinic: string; name: string; role: string; day?: string; section?: "Dashboard" | "Patients" | "Appointments" | "Consultations" | "Treatment Plans"; modules: string[]; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <div className="workspace">
    <aside id="clinic-nav" className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Brand />
      <nav aria-label="Clinic navigation">
        {navigation.filter(([label]) => label === "Dashboard" || modules.includes(label)).map(([label, Icon, href]) =>
          href
            ? <Link href={href} key={label} aria-current={label === section ? "page" : undefined} onClick={() => setOpen(false)}><Icon />{label}</Link>
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
          <div className="workspace-title">
            <span className="mobile-brand">{clinicBrand.name}</span>
            <h1>{section}</h1>
          </div>
        </div>
        <div className="header-tools">
          {day && <span className="date-chip"><CalendarDays size={15} />{day}</span>}
          {section === "Dashboard" && <a className="alert-link" href="#alerts" aria-label="View clinic alerts"><Activity size={19} /></a>}
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
