/**
 * Structured data (schema.org JSON-LD) for search engines and AI answer
 * engines. Rendered as a plain <script type="application/ld+json"> per Next's
 * recommendation — this is data, not executable code, so next/script isn't it.
 *
 * Listing text is seller-supplied, so "<" is escaped to its unicode form before
 * it lands inside the script tag. JSON.stringify alone doesn't do that, and a
 * seller who typed "</script>" into a description would otherwise break out.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
