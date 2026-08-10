import Link from "next/link";
import { brand } from "@/lib/brand";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";

const SLUG = "pricing-and-payouts";
export const metadata = docMetadata(SLUG);

const keep = Math.round((1 - brand.commissionRate) * 100);
const fee = Math.round(brand.commissionRate * 100);

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        The money side of selling on {brand.name}, in plain terms: what it costs,
        what you keep, how a sale reaches your bank, and what happens if a buyer
        asks for a refund.
      </p>

      <H2 id="what-it-costs">What it costs to sell</H2>
      <p>
        Nothing to list. There&apos;s no listing fee, no monthly fee and no
        separate payment-processing fee. {brand.name}{" "}makes money only when you
        do — a flat <strong>{fee}% commission</strong>{" "}on each sale. You keep{" "}
        <strong>{keep}%</strong>.
      </p>
      <div className="doc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sale price</th>
              <th>{brand.name}{" "}keeps ({fee}%)</th>
              <th>You keep ({keep}%)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>$25</td><td>${(25 * brand.commissionRate).toFixed(2)}</td><td>${(25 * (1 - brand.commissionRate)).toFixed(2)}</td></tr>
            <tr><td>$50</td><td>${(50 * brand.commissionRate).toFixed(2)}</td><td>${(50 * (1 - brand.commissionRate)).toFixed(2)}</td></tr>
            <tr><td>$100</td><td>${(100 * brand.commissionRate).toFixed(2)}</td><td>${(100 * (1 - brand.commissionRate)).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      <Callout tone="note" title="Why the fee is all-inclusive">
        That {fee}% covers the card processing, the secure delivery of the
        download, hosting, and version updates for your buyers. It&apos;s the one
        number — there are no surprise deductions on top.
      </Callout>

      <H2 id="choosing-a-price">Choosing a price</H2>
      <p>
        Prices run from <strong>${15} to ${250}</strong>. Price for the value of
        the problem solved, not the lines of code. A tool that saves someone an
        afternoon every week is worth more than one that saves five minutes once.
        Because buyers are comparing against a monthly SaaS bill they&apos;d pay
        forever, a one-time price that looks like a couple of months of that
        subscription is an easy yes.
      </p>

      <H2 id="how-payouts-work">How payouts work</H2>
      <p>
        Payouts run through <strong>Stripe</strong>. The first time you list, you
        connect a payout account through Stripe&apos;s own onboarding — you
        don&apos;t need an existing Stripe account, and {brand.name}{" "}never sees
        your bank details. After that it&apos;s automatic:
      </p>
      <ol>
        <li>A buyer pays for your tool.</li>
        <li>{brand.name}{" "}takes its {fee}% commission and your {keep}% share is routed to your connected account.</li>
        <li>Stripe pays out to your bank on its normal schedule.</li>
      </ol>
      <p>
        You can manage your payout account, see your balance and update bank
        details any time from Stripe.
      </p>

      <H2 id="refunds">Refunds and your payout</H2>
      <p>
        Every purchase carries a <strong>14-day &ldquo;it runs or your money
        back&rdquo;</strong>{" "}guarantee for buyers. If a buyer is refunded — for
        example, the tool won&apos;t run on their machine and isn&apos;t fixed —
        the refunded amount is settled against your sales. In practice: keep your{" "}
        <Link href={docPath("app-package")}><code>SETUP.md</code></Link>{" "}honest
        and answer support questions, and refunds stay rare. The full policy is
        on the <Link href="/refunds">Refund policy</Link>{" "}page.
      </p>
      <Callout tone="note" title="Support is part of the deal">
        Buyers reach you at the support email on your listing. Responding quickly
        to a &ldquo;won&apos;t run&rdquo; message is usually the difference
        between a happy buyer and a refund.
      </Callout>

      <H2 id="taxes">Taxes</H2>
      <p>
        You&apos;re responsible for your own income tax on what you earn.
        Depending on where you and your buyers are, sales tax or VAT may apply to
        transactions; {brand.name}{" "}handles marketplace-level tax obligations
        where required. Nothing here is tax advice — check your local rules or an
        accountant for your situation.
      </p>

      <p>
        That&apos;s the economics. To actually list, follow{" "}
        <Link href={docPath("selling")}>Get your project live</Link>.
      </p>
    </DocPage>
  );
}
