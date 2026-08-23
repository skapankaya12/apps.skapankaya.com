import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";
import { RuixenGradientFooter } from "@/components/ui/ruixen-gradient-footer";

export function Footer() {
  return (
    <RuixenGradientFooter className="mt-24 border-t border-[var(--border)]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Image
            src="/logo.png"
            alt={brand.name}
            width={1160}
            height={620}
            className="h-9 w-auto rounded-md"
          />
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
            { href: "/docs", label: "Documentation" },
            { href: "/blog", label: "Insights" },
            { href: "/about", label: "About marketplace" },
            { href: "/how-to-run", label: "How to run a tool" },
            { href: "/about#contact", label: "Contact & support" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/refunds", label: "Refund policy" },
          ]}
        />
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:px-8">
          <span>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </span>
          <Link href="/about#contact" className="hover:text-[var(--accent)]">
            Contact &amp; support
          </Link>
        </div>
      </div>
    </RuixenGradientFooter>
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
