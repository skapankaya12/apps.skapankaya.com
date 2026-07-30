import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
