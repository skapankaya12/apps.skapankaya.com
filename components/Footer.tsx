import Link from "next/link";
import { brand } from "@/lib/brand";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-semibold">
            <Logo size={24} id="ftr" />
            {brand.name}
          </div>
          <p className="mt-3 max-w-xs text-sm text-[var(--muted)]">
            {brand.tagline}
          </p>
        </div>

        <FooterCol
          title="Marketplace"
          links={[
            { href: "/browse", label: "Browse tools" },
            { href: "/sell", label: "Sell your tool" },
            { href: "/library", label: "My library" },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { href: "/blog", label: "Insights" },
            { href: "/about", label: "About marketplace" },
            { href: "/how-to-run", label: "How to run a tool" },
            { href: "/about#contact", label: "Contact & support" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "#", label: "Terms" },
            { href: "#", label: "Privacy" },
            { href: "#", label: "Refund policy" },
          ]}
        />
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:px-8">
          <span>
            © {new Date().getFullYear()} {brand.name}. All apps reviewed before listing.
          </span>
          <span>{brand.supportEmail}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-[var(--foreground)]/80 hover:text-[var(--accent)]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
