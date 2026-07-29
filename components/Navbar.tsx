"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { useUser, useStoreValue } from "@/lib/hooks";
import { logout, getCart, getBookmarks } from "@/lib/store";
import type { AppUser } from "@/lib/types";
import Image from "next/image";
import { ButtonLink } from "./ui";

export function Navbar() {
  const user = useUser();
  const pathname = usePathname();
  const cartCount = useStoreValue(() => getCart().length);
  const savedCount = useStoreValue(() => getBookmarks().length);

  const navItems = [
    { href: "/browse", label: "Browse" },
    { href: "/sell", label: "Sell your tool" },
    { href: "/blog", label: "Insights" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center" aria-label={brand.name}>
            <Image
              src="/logo.png"
              alt={brand.name}
              width={1160}
              height={620}
              priority
              className="h-10 w-auto rounded-md"
            />
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
            <ProfileMenu user={user} />
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

function ProfileMenu({ user }: { user: AppUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = user.displayName?.trim()?.charAt(0)?.toUpperCase() || "?";

  async function signOut() {
    setOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <div className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
      >
        {initial}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              {user.email && (
                <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
              )}
            </div>
            <div className="py-1 text-sm">
              <MenuItem href="/library" onNavigate={() => setOpen(false)}>
                My library
              </MenuItem>
              {(user.role === "seller" || user.role === "admin") && (
                <MenuItem href="/dashboard" onNavigate={() => setOpen(false)}>
                  Seller dashboard
                </MenuItem>
              )}
              {user.role === "admin" && (
                <MenuItem href="/admin" onNavigate={() => setOpen(false)}>
                  Admin
                </MenuItem>
              )}
              <button
                role="menuitem"
                onClick={signOut}
                className="block w-full border-t border-[var(--border)] px-4 py-2.5 text-left font-medium text-[var(--danger)] hover:bg-[var(--surface-muted)]"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2 text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
    >
      {children}
    </Link>
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
