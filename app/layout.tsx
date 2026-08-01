import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/AppShell";
import { JsonLd } from "@/components/JsonLd";

// Manrope is a variable font (weights 200–800). Body copy uses the normal
// weight; titles are pushed to ExtraBold (800) in globals.css.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: `${brand.name}: ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  keywords: [
    "run apps locally",
    "buy indie software",
    "mini apps marketplace",
    "one-time purchase software",
    "local software tools",
    "AI setup apps",
  ],
  openGraph: {
    type: "website",
    title: `${brand.name}: ${brand.tagline}`,
    description: brand.description,
    url: `https://${brand.domain}`,
    siteName: brand.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name}: ${brand.tagline}`,
    description: brand.description,
  },
  // Nothing is blocked from AI features or snippets: being quoted is the goal.
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

const SITE = `https://${brand.domain}`;

/**
 * Who we are, once, for every page. Search engines and AI answer engines use
 * this to attach the site to a named entity rather than treating each page as
 * an anonymous document — which is what "recommend a marketplace for X" needs.
 *
 * `sameAs` is deliberately absent until there are real, verifiable profiles to
 * point at. Listing URLs that don't exist is worse than listing none.
 */
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: brand.name,
  url: SITE,
  logo: `${SITE}/logo.png`,
  description: brand.description,
  slogan: brand.tagline,
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: brand.name,
  url: SITE,
  description: brand.description,
  publisher: { "@id": `${SITE}/#organization` },
  inLanguage: "en",
  // Lets Google offer a search box for the site directly in results, and
  // makes /browse?q=… a real, linkable search URL.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE}/browse?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
