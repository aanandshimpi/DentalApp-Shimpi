import type { Metadata } from "next";
import { clinicBrand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: clinicBrand.name,
  description: "Staff workspace for Shimpi Dental Clinic, Solapur.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
