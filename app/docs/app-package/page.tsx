import Link from "next/link";
import { brand } from "@/lib/brand";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";

const SLUG = "app-package";
export const metadata = docMetadata(SLUG);

const TREE = `my-tool.zip
├── manifest.json     # name, version, runtime, entry command, network calls
├── README.md         # what it does, screenshots, how to use it
├── SETUP.md          # exact run steps — must work one of the two ways below
├── LICENSE.md        # the licence the buyer owns it under
└── src/              # your actual code`;

const INSTALLER_CHECK = `# is it signed, and by whom?
codesign -dv --verbose=4 YourApp.dmg

# would Gatekeeper let someone open it?
spctl -a -t open --context context:primary-signature -v YourApp.dmg

# is Apple's notarization ticket stapled to this exact file?
xcrun stapler validate YourApp.dmg`;

const MANIFEST = `{
  "name": "CSV Cleaner",
  "version": "1.0.0",
  "runtime": "node",
  "entry": "npm install && npm start",
  "network": [
    "none"
  ],
  "dependencies": [
    "papaparse"
  ]
}`;

const SETUP = `# Setup

## What you need
- Node.js 20 or newer (https://nodejs.org)

## Run it (one command)
1. Unzip this folder.
2. Open a terminal in the folder.
3. Run:

    npm install && npm start

The tool opens at http://localhost:3000.

## Prefer an AI assistant?
Open this folder in Claude Code or Cursor and say
"set this up and run it". Everything above is written
so the assistant can follow it step by step.`;

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        Every listing on {brand.name}{" "}ships as one zip with the same five things
        inside. Standardising the package is what lets a non-technical buyer run
        any tool the same way, and what lets an AI assistant set it up
        unattended. This page is the spec, with a worked example you can copy.
      </p>

      <H2 id="two-kinds">Two kinds of package</H2>
      <p>
        Most tools here are source you hand over: a zip the buyer unpacks and
        runs. If that is what you are selling, the structure below is the
        contract and the rest of this page is for you.
      </p>
      <p>
        A native app is different. There is no entry command and no setup file,
        because opening it and dragging it where it belongs <em>is</em> the
        setup. Pick <strong>Installer</strong> as the setup method and upload
        the app itself.
      </p>

      <H2 id="installer">Installers</H2>
      <p>
        Today that means a <code>.dmg</code> for macOS, up to 500&nbsp;MB, and it
        has to be <strong>signed with a Developer ID and notarized by Apple</strong>,
        with the ticket stapled to the file. If you already ship it from your own
        site without Gatekeeper warning people off, it is almost certainly
        already both.
      </p>
      <p>You can check the exact file you are about to upload:</p>
      <pre>
        <code>{INSTALLER_CHECK}</code>
      </pre>
      <Callout tone="warn" title="Why only Mac, and only for now">
        An installer is the one upload nobody can read, so we only accept
        formats where the platform gives us something to check. Apple
        notarization does that and we verify it on every submission. There is no
        equivalent signal for a bare Windows <code>.exe</code>, so we would
        rather not accept one than pretend it was checked. Windows and Linux
        follow when we can say something true about them.
      </Callout>
      <p>
        Notarization means Apple scanned the file and found no known malware. It
        is not a judgement about whether the app is any good, so a human still
        reviews every listing, and you still owe buyers a working tool, a real
        support address and the refund policy.
      </p>

      <H2 id="structure">The structure</H2>
      <p>
        For a source package, your zip must contain exactly this, and stay under
        200&nbsp;MB:
      </p>
      <pre>
        <code>{TREE}</code>
      </pre>
      <Callout tone="warn" title="It's checked at upload">
        The upload step verifies these files are present. A zip missing{" "}
        <code>manifest.json</code>, <code>README.md</code>, <code>SETUP.md</code>,{" "}
        <code>LICENSE.md</code>{" "}or <code>src/</code>{" "}is rejected before it ever
        reaches review.
      </Callout>

      <H2 id="manifest">manifest.json</H2>
      <p>
        A short, machine-readable description of the tool: its name and version,
        the runtime it needs, the single command that starts it, and — most
        importantly — an honest list of every network call it makes and every
        dependency it pulls in. Reviewers and buyers both read this to know what
        the tool touches.
      </p>
      <pre>
        <code>{MANIFEST}</code>
      </pre>
      <p>
        If your tool makes no network calls, say so (<code>&quot;network&quot;: [&quot;none&quot;]</code>).
        If it calls an API, list the host. Undisclosed network activity is the
        fastest way to fail review.
      </p>

      <H2 id="readme">README.md</H2>
      <p>
        The buyer-facing description: what the tool does, what it looks like
        (screenshots welcome), and how to use it once it&apos;s running. This is
        the document a buyer opens first after unzipping.
      </p>

      <H2 id="setup">SETUP.md — the important one</H2>
      <p>
        This file is the difference between a tool that runs in five minutes and
        a refund. It must let a buyer get from a fresh download to a running tool
        by satisfying <strong>at least one</strong>{" "}of these two paths:
      </p>
      <ul>
        <li>
          <strong>One command.</strong>{" "}A single command such as{" "}
          <code>npm install &amp;&amp; npm start</code>, or a double-clickable
          binary. Name any prerequisite (like Node.js or Python) and where to get
          it.
        </li>
        <li>
          <strong>AI-assisted.</strong>{" "}Written so a buyer can open the folder in
          a free assistant like Claude Code or Cursor, say &ldquo;set this up and
          run it&rdquo;, and have it work. This is what makes non-technical buyers
          possible — write the steps for a careful assistant to follow.
        </li>
      </ul>
      <p>Most tools support both with the same file. Here&apos;s a template:</p>
      <pre>
        <code>{SETUP}</code>
      </pre>
      <Callout tone="good" title="The five-minute test">
        Before you submit, delete your local dependencies (or try it on another
        machine) and run through your own <code>SETUP.md</code>{" "}exactly as
        written. If a stranger couldn&apos;t get it running in five minutes, the
        reviewer won&apos;t either.
      </Callout>

      <H2 id="license">LICENSE.md</H2>
      <p>
        The terms the buyer owns your tool under. Buyers get a personal,
        perpetual right to use what they bought; you keep ownership of your code.
        If you don&apos;t have a licence of your own, a simple personal-use
        licence consistent with the marketplace{" "}
        <Link href="/terms">Terms</Link>{" "}is enough — the key point is that the
        file is present and its terms don&apos;t contradict &ldquo;buy once, own
        forever&rdquo;.
      </p>

      <H2 id="src">src/</H2>
      <p>
        Your actual code, readable. No obfuscation, no minified-only bundles —
        buyers and their AI assistants must be able to see what they run.
        Prefer shipping source over a compiled binary where you can: unsigned
        binaries trigger security warnings on macOS and Windows, which reads as
        untrustworthy even when it isn&apos;t.
      </p>

      <H2 id="checklist">Pre-submit checklist</H2>
      <ul>
        <li>All five items present, zip under 200&nbsp;MB.</li>
        <li><code>manifest.json</code>{" "}lists the real runtime, entry command and every network call.</li>
        <li>You followed your own <code>SETUP.md</code>{" "}on a clean setup and it worked.</li>
        <li>Source is readable; nothing is obfuscated.</li>
        <li><code>LICENSE.md</code>{" "}is present and consistent with the Terms.</li>
      </ul>
      <p>
        With the package built, head back to{" "}
        <Link href={docPath("selling")}>Get your project live</Link>{" "}to fill in
        the listing, or read{" "}
        <Link href={docPath("trust-and-safety")}>Trust &amp; safety</Link>{" "}to see
        exactly how it&apos;ll be reviewed.
      </p>
    </DocPage>
  );
}
