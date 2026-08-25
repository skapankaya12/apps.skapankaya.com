import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/* ---------------------------------------------------------------------------
   Fetching a URL that a seller typed.

   This is the dangerous half of the import feature. The server is inside our
   infrastructure and the seller chooses the address, which is textbook SSRF:
   left unguarded, `http://169.254.169.254/` turns a convenience feature into a
   credential leak, and `http://127.0.0.1:6379/` turns it into a port scanner.

   So every request through here is constrained on five axes, and each one
   matters independently:

     scheme    https only — no file:, no gopher:, no data:
     port      the default only — an internal service is rarely on 443
     address   every resolved IP checked against the private ranges below
     redirect  followed by hand, re-validating the address at every hop,
               because a public host is free to redirect to 127.0.0.1
     size/time capped, so a hostile or merely enormous page can't hold a
               serverless function open or exhaust its memory

   One residual risk, stated plainly rather than papered over: between our DNS
   check and fetch's own resolution the record can change (DNS rebinding). Fully
   closing that means pinning the connection to the address we validated, which
   needs a custom undici dispatcher. The window is small and the payoff for an
   attacker is one unauthenticated GET, so this takes the standard trade — but
   it is a known gap, not an oversight.
--------------------------------------------------------------------------- */

/** Long enough for a slow marketing site, short enough not to hold a function. */
const TIMEOUT_MS = 8000;
/** Meta tags live in <head>; a megabyte is already far more than we read. */
export const MAX_HTML_BYTES = 1024 * 1024;
/** Screenshots are capped at 10MB by storage.rules — don't accept more here. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/**
 * Identify ourselves. A site that would rather not be read this way can then
 * say so in robots.txt or block us, instead of having to guess what we are.
 */
const USER_AGENT =
  "TheSoloMarketBot/1.0 (+https://www.thesolomarket.com; listing import)";

/** Thrown for every rejection, with a message already fit for a seller. */
export class ImportError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

/** CIDR blocks that must never be reachable from an import. */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918 private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — the cloud metadata endpoint lives here
  ["172.16.0.0", 12], // RFC1918 private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // RFC1918 private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, includes broadcast
];

function isBlockedAddress(address: string): boolean {
  let ip = address;

  // An IPv6-mapped IPv4 address (::ffff:10.0.0.1) is an IPv4 address wearing a
  // hat. Unwrap it before testing, or every private range below is bypassed by
  // writing it in IPv6 form.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) ip = mapped[1];

  if (isIP(ip) === 4) {
    const value = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (value & mask) === (ipv4ToInt(base) & mask);
    });
  }

  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true; // unspecified, loopback
  if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true; // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/.test(v6)) return true; // fe80::/10 link-local
  return false;
}

/**
 * Reject anything that isn't a plain https URL on a public address.
 *
 * Returns the parsed URL so callers don't parse it a second time and risk
 * validating one string while fetching another.
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError("That doesn't look like a link. Paste a full URL.");
  }

  if (url.protocol !== "https:") {
    throw new ImportError("Only https:// links can be imported.");
  }
  if (url.port && url.port !== "443") {
    throw new ImportError("Only standard https links can be imported.");
  }

  // A bare IP in the URL skips DNS entirely, so check it directly.
  if (isIP(url.hostname)) {
    if (isBlockedAddress(url.hostname)) {
      throw new ImportError("That address can't be reached from here.");
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new ImportError(`Couldn't find ${url.hostname}. Check the link.`);
  }
  // Every answer must be public: a host that resolves to both a real address
  // and 127.0.0.1 is a rebinding attempt, not a misconfiguration to tolerate.
  if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
    throw new ImportError("That address can't be reached from here.");
  }
  return url;
}

/**
 * Fetch with redirects followed by hand.
 *
 * `redirect: "manual"` is the point of the exercise — the built-in follower
 * would happily walk from a public host to a private one, and by the time the
 * response arrives the guard above has already had its say.
 */
async function guardedFetch(raw: string, accept: string): Promise<Response> {
  let target = raw;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(target);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: accept,
        // Never forward anything of ours. There are no credentials to leak
        // here today, and this makes sure that stays true.
        "Accept-Language": "en",
      },
    });

    const redirect = res.status >= 300 && res.status < 400;
    if (!redirect) return res;

    const location = res.headers.get("location");
    if (!location) throw new ImportError("That link redirects nowhere.");
    // Resolve against the current URL so a relative Location works, then loop
    // and re-validate the result from scratch.
    target = new URL(location, url).href;
  }

  throw new ImportError("That link redirects too many times.");
}

/** Read a body, stopping at `maxBytes`. Truncation is fine — <head> comes first. */
async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= maxBytes) {
      await reader.cancel();
      break;
    }
  }

  const out = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= out.length) break;
    out.set(chunk.subarray(0, out.length - offset), offset);
    offset += chunk.length;
  }
  return out;
}

/** Fetch a page as text. Throws ImportError with a seller-readable message. */
export async function fetchHtml(raw: string): Promise<string> {
  const res = await guardedFetch(raw, "text/html,application/xhtml+xml");

  if (res.status === 403 || res.status === 401) {
    throw new ImportError(
      "That site refused an automated request. Try its Product Hunt or GitHub page instead."
    );
  }
  if (!res.ok) {
    throw new ImportError(`That page returned an error (${res.status}).`);
  }

  const type = res.headers.get("content-type") ?? "";
  if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) {
    throw new ImportError("That link isn't a web page.");
  }

  const bytes = await readCapped(res, MAX_HTML_BYTES);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export interface FetchedImage {
  bytes: Uint8Array;
  contentType: string;
}

/** Fetch one image. Used by the asset proxy, never by the metadata pass. */
export async function fetchImage(raw: string): Promise<FetchedImage> {
  const res = await guardedFetch(raw, "image/*");
  if (!res.ok) throw new ImportError(`That image returned an error (${res.status}).`);

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  // storage.rules only accepts image/* for screenshots, so anything else would
  // fail at upload — reject it here where the message can be useful.
  if (!/^image\/(png|jpeg|webp|gif|avif)$/i.test(contentType)) {
    throw new ImportError("That file isn't an image we can use.");
  }

  // Trust Content-Length when it's there, but still cap the read: a lying or
  // absent header is exactly the case the cap exists for.
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_IMAGE_BYTES) {
    throw new ImportError("That image is too large.");
  }

  const bytes = await readCapped(res, MAX_IMAGE_BYTES + 1);
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new ImportError("That image is too large.");
  }
  return { bytes, contentType };
}
