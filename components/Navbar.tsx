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
import { LiquidMetalButton } from "./ui/liquid-metal-button";

const navItems = [
  { href: "/about", label: "About" },
  { href: "/browse", label: "Browse" },
  { href: "/free", label: "Free / Open Source tools" },
  { href: "/blog", label: "Blogs" },
  // The seller CTA sits last because it is a button rather than a link. See
  // the LiquidMetalButton branch below.
  { href: "/sell", label: "Sell your tool" },
];

export function Navbar() {
  const user = useUser();
  const pathname = usePathname();
  const cartCount = useStoreValue(() => getCart().length);
  const savedCount = useStoreValue(() => getBookmarks().length);
  const [menuOpen, setMenuOpen] = useState(false);

  // A link tap re-renders with a new pathname but doesn't unmount the header,
  // so the panel has to be closed explicitly or it stays over the new page.
  // The panel's own links close it on click; this covers everything else that
  // changes the route — the logo, the cart, back/forward, a redirect.
  //
  // Adjusted during render rather than in an effect: React finishes this render
  // and re-runs the component before committing anything to the DOM, so the
  // panel is already gone on the first paint of the new page. From an effect it
  // would paint open, then close.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // The dock is the header, from first paint — there is no scroll state to be
  // in. The <header> stays transparent and only reserves the space; the
  // floating bar inside it is the whole chrome, so the page scrolls underneath
  // it rather than up to a hard edge. Absolute, not fixed: it floats over the
  // hero but scrolls away with the page instead of following you down it.
  // Either way it reserves no space, so AppShell pads for it and the homepage
  // hero bleeds back up behind it.
  return (
    <header className="absolute inset-x-0 top-0 z-40 py-2.5">
      <div className="mx-auto flex h-14 w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between gap-2 rounded-2xl sm:gap-4 border border-white/60 bg-[var(--background)]/55 px-4 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex shrink-0 items-center" aria-label={brand.name}>
            <Image
              src="/logo.png"
              alt={brand.name}
              width={1160}
              height={620}
              priority
              className="h-8 w-auto sm:h-10"
            />
          </Link>
          {/*
            lg rather than md. Five items including "Free / Open Source tools"
            do not fit beside the logo, the icon row and the seller button at
            768px: the long label wrapped to two lines and the button ran under
            the saved icon. Tablets get the hamburger, which already holds every
            one of these links.
          */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              // The seller CTA is the one nav item that gets the treatment —
              // it is what this pre-launch phase is recruiting for. Making
              // every one a shader would be five WebGL contexts and no hierarchy.
              if (item.href === "/sell") {
                return (
                  <LiquidMetalButton
                    key={item.href}
                    href={item.href}
                    className="mx-1 px-3.5 py-1.5"
                  >
                    {item.label}
                  </LiquidMetalButton>
                );
              }
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

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Saved */}
          <Link
            href="/saved"
            aria-label="Saved"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <HeartIcon />
            {savedCount > 0 && <Dot>{savedCount}</Dot>}
          </Link>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <CartIcon />
            {cartCount > 0 && <Dot>{cartCount}</Dot>}
          </Link>

          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <>
              {/* Below md the nav is behind the hamburger, so the one thing
                  this phase is recruiting for would be two taps deep while a
                  sign-in nobody has asked for yet holds the only button. On a
                  phone the CTA takes the slot and Sign in moves into the menu
                  panel, which is the reverse of the desktop arrangement, where
                  /sell already has the shader button in the nav itself. */}
              <ButtonLink
                href="/sell"
                variant="primary"
                size="sm"
                className="shrink-0 sm:ml-1 lg:hidden"
              >
                {/* Below 360px the full label cannot coexist with the logo,
                    both icons and the menu button, and something has to give.
                    Shortening the label is the one option that keeps every
                    control reachable; the destination is the same either way.
                    Only one span is ever displayed, so the button's own gap-2
                    never applies between them. */}
                <span className="sm:hidden">Sell</span>
                <span className="hidden sm:inline">Sell your tool</span>
              </ButtonLink>
              {/* `hidden` here has to beat the `inline-flex` in buttonBase,
                  which it only does because buttonClass merges with cn(). It
                  was concatenation until 26 August 2026, and this exact pair
                  rendered both buttons at once. */}
              <ButtonLink
                href="/login"
                variant="primary"
                size="sm"
                className="ml-1 hidden shrink-0 lg:inline-flex"
              >
                Sign in
              </ButtonLink>
            </>
          )}

          {/* Below md the nav links are hidden, so this is the only way to
              reach them — which matters most on a phone, where a shared link
              is usually opened. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:ml-1 lg:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--border)] bg-[var(--background)] px-5 py-2 sm:px-8 lg:hidden"
        >
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-3 text-sm ${
                  active
                    ? "font-medium text-[var(--foreground)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {!user && (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block border-t border-[var(--border)] px-3 py-3 text-sm font-medium text-[var(--foreground)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
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
              <MenuItem href="/account" onNavigate={() => setOpen(false)}>
                Account settings
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
