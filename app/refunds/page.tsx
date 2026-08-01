import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LegalPage, Clause } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund policy",
  description: `14 days to change your mind on anything bought from ${brand.name}. How to ask, when we say yes, and what it means for the seller.`,
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund policy"
      updated="2026-08-01"
      intro="You have 14 days to change your mind. If a tool doesn't do what its listing said, or you can't get it running on your machine, you get your money back."
    >
      <Clause heading="1. The 14-day guarantee">
        <p>
          Every purchase is covered for 14 days from the moment you buy it. If
          the tool doesn&apos;t match its description, doesn&apos;t work on your
          setup, or simply isn&apos;t what you expected, ask and we&apos;ll refund
          you in full.
        </p>
        <p>
          You don&apos;t have to justify yourself at length. Telling us what went
          wrong helps us and the seller, but it isn&apos;t a condition.
        </p>
      </Clause>

      <Clause heading="2. Your EU withdrawal right">
        <p>
          If you are a consumer in the EU you also have a statutory 14-day right
          of withdrawal on digital purchases. Our guarantee is written to be at
          least as generous as that right, and nothing here reduces it.
        </p>
      </Clause>

      <Clause heading="3. How to ask">
        <p>
          Send us a message through the{" "}
          <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
            contact form
          </Link>{" "}
          with the tool&apos;s name and the email address you bought it with. We
          aim to reply within two working days and process approved refunds
          straight away — the money usually reaches your bank within five to ten
          working days, depending on your card issuer.
        </p>
        <p>
          Refunds go back to the card you paid with. We can&apos;t send them
          anywhere else.
        </p>
      </Clause>

      <Clause heading="4. When we may say no">
        <p>
          We may decline a refund where the same account repeatedly buys and
          refunds tools, or where there is clear evidence the tool was downloaded
          in order to copy or redistribute it rather than to use it. This is
          about abuse, not about ordinary buyers changing their mind.
        </p>
        <p>
          Once we refund you, your licence to the tool ends and it stops being
          available in your library.
        </p>
      </Clause>

      <Clause heading="5. If a listing is removed">
        <p>
          If we remove a tool after you bought it — because it broke our rules,
          for example — you will not be able to download it again. Tell us and we
          will refund you, whether or not the 14 days have passed.
        </p>
      </Clause>

      <Clause heading="6. What this means if you sell here">
        <p>
          Refunds cover the full sale price, including your{" "}
          {Math.round((1 - brand.commissionRate) * 100)}% share. Where your share
          has already been transferred to your Stripe account, we settle the
          difference against later sales or ask you to repay it.
        </p>
        <p>
          The best defence against refunds is an honest listing: a demo video
          that shows the real thing, a description that says plainly what the
          tool does and does not do, and a setup guide someone can actually
          follow. Tools that are described accurately are rarely refunded.
        </p>
      </Clause>
    </LegalPage>
  );
}
