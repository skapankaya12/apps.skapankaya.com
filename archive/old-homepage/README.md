# The old homepage, kept

The homepage as it was on `staging` at `3ca5950` (23 October 2026), before
the desktop replaced it: the hero with "I'm a buyer / I'm a seller", the
pre-launch card with the waitlist, the catalogue, and "Request a tool".

Kept here, outside `app/`, so nothing routes to it and nothing ships it.
Excluded from type-checking and linting in `tsconfig.json` and
`eslint.config.mjs`, so it can sit still while the live code moves on.

| File | Was |
|---|---|
| `page.tsx` | `app/page.tsx` |
| `Navbar.tsx` | `components/Navbar.tsx` |
| `Footer.tsx` | `components/Footer.tsx` |
| `AppShell.tsx` | `components/AppShell.tsx` |

To bring it back, copy each file to where it was. The four belong together:
the page assumes the floating header and the footer around it.

Git has the same version for good: `git show 3ca5950:app/page.tsx`.
