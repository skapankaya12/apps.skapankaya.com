import Link from "next/link";
import { brand } from "@/lib/brand";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";

const SLUG = "selling";
export const metadata = docMetadata(SLUG);

const keep = Math.round((1 - brand.commissionRate) * 100);

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        You built a small tool to fix your own problem. Someone else has that
        problem too. This is the complete guide to turning that project into a
        listing people can buy — what qualifies, how to prepare it, exactly what
        the submission form asks for, and what happens after you hit submit.
      </p>

      <H2 id="what-you-can-sell">What you can sell</H2>
      <p>
        {brand.name}{" "}
        is for <strong>self-contained software tools</strong>{" "}a
        buyer downloads and runs on their own computer. If it&apos;s a finished
        thing someone can own forever, it fits. If it needs your servers, or
        isn&apos;t software, it doesn&apos;t.
      </p>

      <div className="doc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Yes — list these</th>
              <th>Not a fit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Scripts &amp; CLI tools (Node.js, Python, shell)</td>
              <td>SaaS, subscriptions, anything running on your servers</td>
            </tr>
            <tr>
              <td>Desktop or browser apps that run locally</td>
              <td>Non-software goods (ebooks, courses, templates, presets, music)</td>
            </tr>
            <tr>
              <td>Automations, agents, converters, scrapers, dashboards</td>
              <td>Physical products or freelance services</td>
            </tr>
            <tr>
              <td>Your own original code, or code you&apos;re licensed to resell</td>
              <td>Code that isn&apos;t yours, or that breaks a licence</td>
            </tr>
            <tr>
              <td>Readable source with disclosed network calls</td>
              <td>Malware, data harvesters, obfuscated / hidden-behaviour tools</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2 id="what-makes-a-good-listing">What makes a good listing</H2>
      <p>
        Every submission is reviewed against the same checklist before it goes
        live. Build toward these four things and approval is straightforward:
      </p>
      <ul>
        <li>
          <strong>Runs in about five minutes.</strong>{" "}A buyer can go from
          download to running by following your <code>SETUP.md</code>{" "}— either
          one command, or by asking an AI assistant to set it up.
        </li>
        <li>
          <strong>Readable source.</strong>{" "}No obfuscated or minified-only code.
          Buyers (and their AI) can read what they&apos;re about to run.
        </li>
        <li>
          <strong>Honest disclosure.</strong>{" "}Every network call and dependency
          is declared in your <code>manifest.json</code>.
        </li>
        <li>
          <strong>Real screenshots and demo.</strong>{" "}Show the tool actually
          working — no mockups, no stock images.
        </li>
      </ul>

      <H2 id="prepare-your-package">Step 1 — Prepare your package</H2>
      <p>
        Your tool ships as one zip with a fixed structure, so every buyer knows
        what they&apos;re getting and every tool runs the same way. It must
        contain a <code>manifest.json</code>, a <code>README.md</code>, a{" "}
        <code>SETUP.md</code>, a <code>LICENSE.md</code>{" "}and your{" "}
        <code>src/</code>{" "}folder, and stay under 200&nbsp;MB. The full
        specification — with a worked example — is on its own page:
      </p>
      <Callout title="Read this before you submit">
        <Link href={docPath("app-package")}>The App Package standard →</Link>{" "}
        covers exactly what goes in each file and how to write a{" "}
        <code>SETUP.md</code>{" "}that passes review on the first try.
      </Callout>

      <H2 id="submit">Step 2 — Fill in the listing</H2>
      <p>
        From <Link href="/sell">Sell your tool</Link>{" "}you&apos;ll sign in (any
        buyer account can become a seller) and land on the listing form. It takes
        about twenty minutes. Here&apos;s every field and what a good answer looks
        like:
      </p>
      <ul>
        <li>
          <strong>App name</strong>{" "}— short and clear, up to 50 characters (e.g.
          &ldquo;CSV Cleaner&rdquo;).
        </li>
        <li>
          <strong>One-line tagline</strong>{" "}— what it does in one sentence, up to
          90 characters. This is the hook on your listing card.
        </li>
        <li>
          <strong>Description</strong>{" "}— the problem it solves and how it runs
          locally. Be concrete about what the buyer gets.
        </li>
        <li>
          <strong>Category</strong>{" "}— the kind of work it serves (Sales,
          Finance, Developers, and so on), so buyers browsing by their job find
          it.
        </li>
        <li>
          <strong>Runtime</strong>{" "}— Node.js, Python, Browser, Desktop app, or
          Other. This tells buyers what they need installed.
        </li>
        <li>
          <strong>Setup method</strong>{" "}— <em>One command</em>{" "}(the buyer runs a
          single command) or <em>AI-assisted</em>{" "}(a free assistant sets it up
          from your <code>SETUP.md</code>). Pick the one your tool actually
          supports.
        </li>
        <li>
          <strong>Price (USD)</strong>{" "}— between ${15} and ${250}. See{" "}
          <Link href={docPath("pricing-and-payouts")}>Pricing &amp; payouts</Link>{" "}
          for how to choose.
        </li>
        <li>
          <strong>App package (.zip)</strong>{" "}— the file from Step 1, up to
          200&nbsp;MB.
        </li>
        <li>
          <strong>Screenshots</strong>{" "}— up to five, showing the tool working.
        </li>
        <li>
          <strong>Demo video (required)</strong>{" "}— up to 30 seconds and 50&nbsp;MB.
          It doubles as your listing card&apos;s preview, so lead with the tool
          doing its job.
        </li>
        <li>
          <strong>About you</strong>{" "}— a short bio, a{" "}
          <strong>support email (required)</strong>{" "}buyers can reach you at, and
          an optional website or profile link.
        </li>
      </ul>
      <p>
        Before you can submit, you confirm the tool is yours to sell, contains no
        malicious code, discloses all network activity, and that you&apos;ll
        support it and honour the 14-day refund policy. That confirmation is part
        of the seller agreement — see{" "}
        <Link href="/terms">Terms</Link>.
      </p>
      <Callout tone="note" title="You can save and come back">
        The form keeps a draft as you go, so a long description or a big upload
        won&apos;t cost you your work if you step away.
      </Callout>

      <H2 id="review">Step 3 — Review</H2>
      <p>
        Submitting puts your listing in the review queue — it does not go live
        yet. A human runs your tool on a clean machine following your{" "}
        <code>SETUP.md</code>, reads the source, checks that the listing is
        honest and that the demo matches what the tool does. This usually takes{" "}
        <strong>1 to 2 business days</strong>.
      </p>
      <p>Two outcomes:</p>
      <ul>
        <li>
          <strong>Approved</strong>{" "}— your tool lists and becomes buyable, and
          earns the &ldquo;Verified — runs in 5 minutes&rdquo; badge.
        </li>
        <li>
          <strong>Changes needed</strong>{" "}— you get a note explaining what to
          fix. Edit the listing from your dashboard and resubmit; it goes back
          into the queue.
        </li>
      </ul>

      <H2 id="get-paid">Step 4 — Get paid</H2>
      <p>
        You keep <strong>{keep}%</strong>{" "}of every sale. Payouts run
        automatically through Stripe once you&apos;ve connected a payout account
        — a one-time setup, no Stripe account needed up front. The mechanics,
        timing and how refunds affect payouts are all on{" "}
        <Link href={docPath("pricing-and-payouts")}>Pricing &amp; payouts</Link>.
      </p>

      <H2 id="your-responsibilities">Your responsibilities as a seller</H2>
      <ul>
        <li>Keep the code yours (or properly licensed) and free of hidden behaviour.</li>
        <li>Answer buyer support questions at the email on your listing.</li>
        <li>Honour the 14-day &ldquo;it runs or your money back&rdquo; guarantee.</li>
        <li>Keep your tool working; ship a new version if something breaks.</li>
      </ul>
      <p>
        The platform handles the storefront, payments, delivery and versioning.
        You handle the code. That split is what the {brand.name}{" "}commission pays
        for.
      </p>

      <p>
        Ready?{" "}
        <Link href="/sell">Start a listing</Link>, or read{" "}
        <Link href={docPath("app-package")}>the App Package standard</Link>{" "}first.
      </p>
    </DocPage>
  );
}
