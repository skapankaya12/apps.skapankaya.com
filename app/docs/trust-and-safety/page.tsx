import Link from "next/link";
import { brand } from "@/lib/brand";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";
import { ScanDisclaimer } from "@/components/Disclaimer";

const SLUG = "trust-and-safety";
export const metadata = docMetadata(SLUG);

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        {brand.name}{" "}
        sells code that runs on your own computer, so trust is the
        whole product. This page explains what every tool goes through before
        it&apos;s listed, what you can rely on as a buyer, and the honest limits
        of any review.
      </p>

      <H2 id="review">Every tool is reviewed before it lists</H2>
      <p>
        Nothing goes live automatically. When a seller submits a tool, it enters
        a review queue and is checked against a fixed list before it can appear
        in the catalogue:
      </p>
      <ol>
        <li>
          <strong>Fresh-machine test.</strong>{" "}A reviewer runs the tool on a
          clean setup, following the seller&apos;s{" "}
          <Link href={docPath("app-package")}><code>SETUP.md</code></Link>. It has
          to actually run — in about five minutes.
        </li>
        <li>
          <strong>Readable source.</strong>{" "}No obfuscated or minified-only code.
          If a reviewer can&apos;t read what it does, it doesn&apos;t list.
        </li>
        <li>
          <strong>Disclosed behaviour.</strong>{" "}Every network call and dependency
          must be declared in the tool&apos;s <code>manifest.json</code>.
          Undisclosed activity is a rejection.
        </li>
        <li>
          <strong>Honest listing.</strong>{" "}The description and demo have to match
          what the tool really does.
        </li>
      </ol>
      <p>
        Tools that pass earn the{" "}
        <strong>&ldquo;Verified — runs in 5 minutes&rdquo;</strong>{" "}badge. That
        badge is the whole point of a curated marketplace: it means a person
        already got this running and read the code.
      </p>

      <div className="not-prose">
        <ScanDisclaimer />
      </div>

      <H2 id="what-buyers-can-rely-on">What you can rely on as a buyer</H2>
      <ul>
        <li>
          <strong>It runs, or your money back.</strong>{" "}A 14-day guarantee on
          every purchase — if a tool won&apos;t run, you&apos;re refunded, no
          questions asked. See the <Link href="/refunds">Refund policy</Link>.
        </li>
        <li>
          <strong>It runs on your machine, not ours.</strong>{" "}Your data stays on
          your computer. There&apos;s no account required to run a tool and no
          telemetry the marketplace adds.
        </li>
        <li>
          <strong>You can re-download forever.</strong>{" "}Purchases live in your
          library; a tool you bought doesn&apos;t disappear.
        </li>
        <li>
          <strong>You can read the code.</strong>{" "}Source is required to be
          readable, so you — or an AI assistant — can inspect what you run.
        </li>
      </ul>

      <H2 id="limits">The honest limits</H2>
      <p>
        Review reduces risk; it can&apos;t erase it. Because these tools run on
        your own machine rather than ours, we can&apos;t guarantee a tool is
        compatible with, or safe on, your specific setup, and you run downloaded
        software at your own risk. Sensible habits still apply: read the{" "}
        <code>README.md</code>, glance at the source or ask your AI assistant to,
        and don&apos;t hand a tool credentials it has no reason to need.
      </p>
      <Callout tone="warn" title="See something wrong?">
        If a listing behaves differently from how it&apos;s described, or you
        spot something unsafe, tell us through the{" "}
        <Link href="/about#contact">contact form</Link>. Reports are how a
        curated marketplace stays clean.
      </Callout>

      <H2 id="for-sellers">What this means if you&apos;re selling</H2>
      <p>
        The bar above is also your checklist. Ship readable source, declare
        every network call, and make sure your <code>SETUP.md</code>{" "}genuinely
        works on a clean machine. Do that and review is quick. The full
        requirements are in{" "}
        <Link href={docPath("app-package")}>the App Package standard</Link>{" "}and{" "}
        <Link href={docPath("selling")}>Get your project live</Link>.
      </p>
    </DocPage>
  );
}
