import Link from "next/link";
import { Command } from "lucide-react";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Adaptiva">
      <span className="brand-mark">
        <Command size={21} strokeWidth={1.8} />
      </span>
      <span>
        adaptiva<span className="brand-dot">/</span>
      </span>
    </Link>
  );
}
