import Link from "next/link";
import { brand } from "@/lib/brand";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";

const SLUG = "how-it-works";
export const metadata = docMetadata(SLUG);

const keep = Math.round((1 - brand.commissionRate) * 100);
const fee = Math.round(brand.commissionRate * 100);

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        {brand.name}{" "}
        exists for one simple exchange: a solo developer sells a
        small piece of software they already built, and a buyer owns it forever.
        No subscription, no platform to log into, no data leaving the
        buyer&apos;s machine. This page is the whole model in one read; the rest
        of the docs go deeper on each part.
      </p>

      <H2 id="what-it-is">What it is</H2>
      <p>
        Think of it as the opposite of a big SaaS suite. Instead of renting a
        thirty-feature platform to use one feature, a buyer finds the single
        tool made for the job they have and buys it once. Every tool is a small
        folder of code the buyer downloads and runs on their own computer.
      </p>
      <ul>
        <li>
          <strong>Buy once, own forever.</strong>{" "}A one-time price, not a
          monthly bill. The tool is yours and keeps working with no account and
          no expiry.
        </li>
        <li>
          <strong>Runs locally.</strong>{" "}The code runs on the buyer&apos;s
          machine, not our servers. Their data never leaves their computer.
        </li>
        <li>
          <strong>Software only.</strong>{" "}Self-contained tools with readable
          source — scripts, CLIs, desktop and browser apps, automations. Not
          SaaS, not ebooks or courses, not services.
        </li>
      </ul>

      <H2 id="who-its-for">Who it&apos;s for</H2>
      <p>
        <strong>Sellers</strong>{" "}are solo builders and indie developers who made
        something to fix their own problem — the kind of tool that&apos;s too
        niche to turn into a startup, so it usually just sits on a laptop.
        Someone else has that same problem. List it once and keep {keep}% of
        every sale.
      </p>
      <p>
        <strong>Buyers</strong>{" "}are people who need one specific thing done and
        would rather own the tool for it than rent a large platform. Many
        aren&apos;t developers at all — the tools are built to be run by a
        free AI assistant if the buyer would rather not touch a terminal.
      </p>

      <H2 id="the-journey">The journey of a tool</H2>
      <p>
        Here&apos;s the full path, from a seller&apos;s folder to a buyer running
        it:
      </p>
      <ol>
        <li>
          <strong>A seller packages their tool</strong>{" "}as a standard zip — the{" "}
          <Link href={docPath("app-package")}>App Package</Link>{" "}— with the
          source, a setup guide, a licence and a short manifest, plus a demo
          video and screenshots.
        </li>
        <li>
          <strong>They submit it for review.</strong>{" "}Nothing lists
          automatically. Every submission is checked before it can go live (see{" "}
          <Link href={docPath("trust-and-safety")}>Trust &amp; safety</Link>).
        </li>
        <li>
          <strong>Once approved, it appears in the catalogue</strong>{" "}with its
          own page, screenshots and price, and is discoverable by the problem it
          solves.
        </li>
        <li>
          <strong>A buyer pays once</strong>{" "}and downloads the package
          immediately. The purchase lives in their library to re-download any
          time.
        </li>
        <li>
          <strong>The buyer runs it</strong>{" "}on their own machine — either the
          one command in the setup guide, or by opening the folder in a free AI
          assistant and asking it to set the tool up. See{" "}
          <Link href={docPath("running-apps")}>Running an app you bought</Link>.
        </li>
        <li>
          <strong>The seller gets paid</strong>{" "}their {keep}% share through
          Stripe. See <Link href={docPath("pricing-and-payouts")}>Pricing &amp; payouts</Link>.
        </li>
      </ol>

      <H2 id="what-it-costs">What it costs</H2>
      <p>
        Listing is free. When a tool sells, {brand.name}{" "}keeps a flat {fee}%
        commission and the seller keeps {keep}%. That {fee}% is all-inclusive —
        it covers payment processing and the delivery, hosting and versioning of
        the download, so there are no separate card fees, listing fees or monthly
        costs on either side.
      </p>

      <Callout tone="good" title="The promise, both ways">
        For buyers: if a tool won&apos;t run within 14 days, it&apos;s a full
        refund, no questions asked. For sellers: no cost to list, keep most of
        every sale, and never run a server. If neither of those is the deal
        you&apos;re looking for, {brand.name}{" "}probably isn&apos;t the right fit —
        and that&apos;s fine.
      </Callout>

      <p>
        Next: if you&apos;re here to sell, start with{" "}
        <Link href={docPath("selling")}>Get your project live</Link>. If
        you&apos;re here to buy, jump to{" "}
        <Link href={docPath("running-apps")}>Running an app you bought</Link>.
      </p>
    </DocPage>
  );
}
