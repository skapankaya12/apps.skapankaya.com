import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LegalPage, Clause } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The agreement between ${brand.name}, the solo builders who list tools here, and the people who buy them: what you keep, what we take, how review works, and how either side can walk away.`,
  alternates: { canonical: "/terms" },
};

const KEEP_PCT = Math.round((1 - brand.commissionRate) * 100);
const FEE_PCT = Math.round(brand.commissionRate * 100);

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="2026-08-01"
      intro={`${brand.name} is a marketplace where independent builders sell small software that buyers download and run on their own computers. These terms cover both sides.`}
    >
      <Clause heading="1. Who runs this">
        <p>
          {brand.name} is operated from Portugal, in the European Union. Full
          legal entity details, registered address and VAT number will be listed
          here before the public launch. Until then, reach us through the{" "}
          <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
            contact form
          </Link>
          .
        </p>
      </Clause>

      <Clause heading="2. What we are, and what we are not">
        <p>
          We are a marketplace. Sellers write the software; we list it, take the
          payment, and pass on the seller&apos;s share. We are not the author of
          the tools sold here and we do not warrant that any tool will work on
          your particular machine.
        </p>
        <p>
          Every submission is reviewed by a person before it can be listed. That
          review is a good-faith check, not a security guarantee — you are
          downloading and running software written by a third party, and you do
          so at your own risk.
        </p>
      </Clause>

      <Clause heading="3. Accounts">
        <p>
          You need an account to buy or sell. You must give a real email address,
          keep your password to yourself, and be old enough to enter a contract
          where you live. You are responsible for what happens under your account.
        </p>
        <p>
          You can delete your account at any time from{" "}
          <Link href="/account" className="text-[var(--accent)] hover:underline">
            account settings
          </Link>
          . Deleting it does not remove listings you have sold or purchases you
          have made, because other people rely on those records.
        </p>
      </Clause>

      <Clause heading="4. For sellers: what you can list">
        <p>
          Software only, and only software you wrote or are licensed to resell.
          It must be self-contained, run on the buyer&apos;s own machine, ship
          with a setup guide, and disclose any network calls it makes.
        </p>
        <p>
          You may not list: anything that runs on your servers (SaaS or
          subscriptions), non-software goods, physical products, freelance
          services, code you do not have the right to sell, malware, data
          harvesters, obfuscated or hidden-behaviour tools, or anything illegal.
        </p>
        <p>
          We can decline, delay or remove any listing, including one already
          approved, if we believe it breaks these rules or harms buyers. Where we
          reasonably can, we will tell you why and give you a chance to fix it.
        </p>
      </Clause>

      <Clause heading="5. For sellers: you keep your work">
        <p>
          <strong className="text-[var(--foreground)]">
            You keep full ownership of your code.
          </strong>{" "}
          Listing here does not transfer any intellectual property to us. You
          grant us a non-exclusive licence to host your package, show your
          title, description, screenshots and demo video, and deliver the files
          to people who buy it. That licence exists so we can run the
          marketplace, and it ends when your listing comes down — except that
          buyers who already paid keep the right to re-download what they bought.
        </p>
        <p>
          You are free to sell the same tool elsewhere. There is no exclusivity.
        </p>
      </Clause>

      <Clause heading="6. For sellers: money">
        <p>
          You set the price. On each sale you keep{" "}
          <strong className="text-[var(--foreground)]">{KEEP_PCT}%</strong> and we
          keep <strong className="text-[var(--foreground)]">{FEE_PCT}%</strong>.
          That fee is all-inclusive: it covers payment processing and hosting.
          There are no listing fees and no monthly cost.
        </p>
        <p>
          Payments and payouts run through Stripe. You complete Stripe&apos;s own
          onboarding and provide your identity and bank details directly to
          Stripe — we never see them. Stripe pays out to your bank on a monthly
          schedule. You must have completed that onboarding before your tools can
          be sold.
        </p>
        <p>
          If a buyer is refunded, the refund covers the full sale, including your
          share. Where your share has already been transferred, we will settle
          the difference against later sales or ask you to repay it.
        </p>
        <p>
          You are responsible for your own taxes. As an EU operator we may be
          required to report seller information to tax authorities under DAC7,
          and we will collect what that requires.
        </p>
      </Clause>

      <Clause heading="7. For buyers: what you get">
        <p>
          When you buy a tool you get a perpetual, non-exclusive, personal licence
          to use that version and any updates the seller publishes to it. You can
          re-download it from your library at any time while your account exists.
        </p>
        <p>
          You may not resell, redistribute or republish a tool you bought here,
          unless the seller&apos;s own licence explicitly allows it.
        </p>
        <p>
          Refunds are covered in our{" "}
          <Link href="/refunds" className="text-[var(--accent)] hover:underline">
            refund policy
          </Link>
          .
        </p>
      </Clause>

      <Clause heading="8. Things we do not promise">
        <p>
          Tools are sold as they are. We do not promise a tool will suit your
          purpose, run on your setup, or keep working as your operating system
          changes. We do not promise the site will be uninterrupted or
          error-free.
        </p>
        <p>
          Nothing here limits rights you have under mandatory consumer law in
          your country. Where the law allows us to limit our liability, our total
          liability to you is limited to what you paid us in the twelve months
          before the claim.
        </p>
      </Clause>

      <Clause heading="9. Ending it">
        <p>
          You can stop using {brand.name} whenever you like. Sellers can pull a
          listing at any time; buyers who already paid keep access to what they
          bought. We can suspend or close an account that breaks these terms.
        </p>
      </Clause>

      <Clause heading="10. Changes and law">
        <p>
          We may update these terms. If a change materially affects sellers, we
          will email active sellers before it takes effect. Continuing to use the
          marketplace after that means you accept the change.
        </p>
        <p>
          These terms are governed by Portuguese law. If you are a consumer in
          the EU, you keep the protection of the mandatory laws of the country
          you live in.
        </p>
      </Clause>
    </LegalPage>
  );
}
