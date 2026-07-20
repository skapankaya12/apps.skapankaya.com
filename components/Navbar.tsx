"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { useUser, useStoreValue } from "@/lib/hooks";
import { logout, getCart, getBookmarks } from "@/lib/store";
import { ButtonLink } from "./ui";
import { RoleSwitcher } from "./RoleSwitcher";

export function Navbar() {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const cartCount = useStoreValue(() => getCart().length);
  const savedCount = useStoreValue(() => getBookmarks().length);

  const navItems = [
    { href: "/browse", label: "Browse" },
    { href: "/sell", label: "Sell your tool" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm">
              ▸_
            </span>
            <span className="text-[15px]">{brand.name}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "text-[var(--foreground)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          {user && <RoleSwitcher />}

          {/* Saved */}
          <Link
            href="/saved"
            aria-label="Saved"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <HeartIcon />
            {savedCount > 0 && <Dot>{savedCount}</Dot>}
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <CartIcon />
            {cartCount > 0 && <Dot>{cartCount}</Dot>}
          </Link>

          {user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="hidden px-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:block">
                  Admin
                </Link>
              )}
              {(user.role === "seller" || user.role === "admin") && (
                <Link href="/dashboard" className="hidden px-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:block">
                  Dashboard
                </Link>
              )}
              <Link href="/library" className="px-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                Library
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              >
                Sign out
              </button>
            </>
          ) : (
            <ButtonLink href="/login" variant="primary" size="sm" className="ml-1">
              Sign in
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}

function Dot({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-fg)]">
      {children}
    </span>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}
