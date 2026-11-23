import { clinicBrand } from "@/lib/brand";

export function Brand() {
  return <div className="brand">
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 5c-2.3 0-3.3-2-5.9-1.4C2.7 4.4 3 8.6 4 11.1c1.4 3.4 1.4 9 3.5 9 1.5 0 1.7-5.7 4.5-5.7s3 5.7 4.5 5.7c2.1 0 2.1-5.6 3.5-9 1-2.5 1.3-6.7-2.1-7.5C15.3 3 14.3 5 12 5Z" fill="var(--brand-tooth)"/>
      </svg>
    </span>
    <span><strong>{clinicBrand.name}</strong><small>{clinicBrand.location}</small></span>
  </div>;
}
