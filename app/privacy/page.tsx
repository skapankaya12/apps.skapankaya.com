import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LegalPage, Clause } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${brand.name} collects, why, who processes it, and how to get it deleted. Short version: an email address, what you listed or bought, and nothing else — no analytics, no tracking, no ad networks.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2026-08-01"
      intro="The short version: we collect an email address, whatever you chose to publish on a listing, and a record of what you bought or sold. There is no analytics, no tracking pixel and no advertising network on this site."
    >
      <Clause heading="1. Who is responsible">
        <p>
          {brand.name}, operated from Portugal, is the data controller for the
          information described here. Full legal entity details will be listed
          before the public launch. To reach us about your data, use the{" "}
          <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
            contact form
          </Link>
          .
        </p>
      </Clause>

      <Clause heading="2. What we collect">
        <p>
          <strong className="text-[var(--foreground)]">Account.</strong> Your
          email address, a display name, and a password. The password is handled
          by Firebase Authentication and hashed — we never see it.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">If you sell.</strong> The
          contents of your listing: title, description, screenshots, demo video,
          your uploaded package, and the support email, bio and website you
          choose to publish. Bear in mind a listing is public — only put in it
          what you want the world to read.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">If you buy.</strong> A
          record of what you bought and when, so you can re-download it. Card
          details go straight to Stripe; they never touch our servers.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">If you write to us.</strong>{" "}
          Whatever you put in the contact form, including the email address you
          give us so we can reply.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">
            If you join the launch list.
          </strong>{" "}
          Just your email address, kept until we email you at launch or you ask
          us to remove it, whichever comes first. We send one message, we
          don&apos;t add you to anything else, and we never pass it on. Reply to
          that email, or use the contact form, to be taken off the list.
        </p>
        <p>
          <strong className="text-[var(--foreground)]">On your own device.</strong>{" "}
          Your cart and saved items are kept in your browser&apos;s local
          storage, not on our servers. Clearing your browser data clears them.
        </p>
      </Clause>

      <Clause heading="3. What we do not collect">
        <p>
          No analytics or product-tracking scripts. No advertising or marketing
          cookies. No third-party trackers. We do not build a profile of you, and
          we do not sell or rent your data to anyone, ever.
        </p>
        <p>
          The tools sold here run on your own computer. We have no visibility
          into what you do with them or what data you put through them.
        </p>
      </Clause>

      <Clause heading="4. Why we are allowed to hold it">
        <p>
          To perform our contract with you: running your account, delivering what
          you bought, paying sellers. To meet legal obligations: tax and
          accounting records, and seller reporting under DAC7. And on legitimate
          interest: keeping the marketplace safe from fraud and abuse.
        </p>
        <p>
          The launch list is different: that one runs on your consent, given by
          entering your address, and you can withdraw it at any time.
        </p>
      </Clause>

      <Clause heading="5. Who else processes it">
        <p>
          We use a small number of established providers, each only for what it
          says here:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-[var(--foreground)]">Google Firebase</strong> —
            authentication, database and file storage.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Stripe</strong> — payments
            and seller payouts. Stripe collects sellers&apos; identity and bank
            details directly, under its own privacy policy.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Resend</strong> —
            transactional email (receipts, review decisions, sale notices).
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Vercel</strong> — hosting.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Google Sheets</strong> —
            where contact-form messages land so we can answer them.
          </li>
        </ul>
        <p>
          Some of these process data outside the EU. Where that happens it is
          covered by the European Commission&apos;s standard contractual clauses.
        </p>
      </Clause>

      <Clause heading="6. How long we keep it">
        <p>
          Account data for as long as your account exists. Purchase and payout
          records for as long as tax and accounting law requires, which is
          longer. Contact-form messages until the conversation is finished and
          we have no reason to keep them.
        </p>
      </Clause>

      <Clause heading="7. Your rights">
        <p>
          Under the GDPR you can ask for a copy of your data, correct it, have it
          deleted, restrict or object to how we use it, and take it elsewhere.
          Ask through the{" "}
          <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
            contact form
          </Link>{" "}
          and we will respond within one month.
        </p>
        <p>
          You can delete your account yourself from{" "}
          <Link href="/account" className="text-[var(--accent)] hover:underline">
            account settings
          </Link>
          . Records we are legally required to keep — sales, payouts, invoices —
          survive that deletion, and so do listings other people have already
          bought, so those buyers keep access to what they paid for.
        </p>
        <p>
          If you think we have handled your data badly, you can complain to your
          national data protection authority. In Portugal that is the CNPD.
        </p>
      </Clause>

      <Clause heading="8. Changes">
        <p>
          If this policy changes in a way that matters, we will email account
          holders before it takes effect rather than quietly editing the page.
        </p>
      </Clause>
    </LegalPage>
  );
}
