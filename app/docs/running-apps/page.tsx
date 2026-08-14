import Link from "next/link";
import { DocPage, H2, Callout, docMetadata, docPath } from "@/components/Docs";

const SLUG = "running-apps";
export const metadata = docMetadata(SLUG);

export default function Page() {
  return (
    <DocPage slug={SLUG}>
      <p>
        You bought a tool. Here&apos;s exactly what you got and how to run it —
        including the path for people who&apos;ve never opened a terminal. If you
        just want the quick version, the{" "}
        <Link href="/how-to-run">two-minute how-to-run guide</Link>{" "}has it; this
        page is the fuller reference.
      </p>

      <H2 id="what-you-get">What you actually download</H2>
      <p>
        Every tool is a small <strong>folder</strong>{" "}you download from your
        library and unzip. It&apos;s an ordinary folder on your own computer —
        nothing installs itself, nothing runs in the cloud, and your data never
        leaves your machine. Inside you&apos;ll find a{" "}
        <code>README.md</code>{" "}(what it does), a <code>SETUP.md</code>{" "}(how to run
        it), the code, and its licence.
      </p>
      <p>
        Your purchases stay in your <Link href="/library">library</Link>{" "}
        permanently — you can re-download any time, on any computer.
      </p>

      <H2 id="two-ways">Two ways to run it</H2>
      <p>Pick whichever fits you. Every tool supports at least one.</p>

      <H2 id="one-command">A) The one-command way</H2>
      <p>
        Best if you&apos;re comfortable opening a terminal. Every tool lists its
        exact command on its listing page and in the included{" "}
        <code>SETUP.md</code>.
      </p>
      <ol>
        <li>Download the tool from your library and unzip it.</li>
        <li>Open the folder in your terminal.</li>
        <li>Paste the one command shown on the tool&apos;s page. That&apos;s it.</li>
      </ol>

      <H2 id="ai-assisted">B) The AI-assisted way (no coding)</H2>
      <p>
        Never touched a terminal? Let a free AI assistant do the whole setup. You
        do this once, then every tool you ever buy works the same way.
      </p>
      <ol>
        <li>
          Install a coding assistant once — we recommend{" "}
          <strong>Claude Code</strong>{" "}or <strong>Cursor</strong>.
        </li>
        <li>Open the downloaded folder in it.</li>
        <li>
          Type: <code>set this up and run it</code>
        </li>
        <li>
          The assistant reads the included <code>SETUP.md</code>, installs
          what&apos;s needed, and starts the tool for you.
        </li>
      </ol>
      <Callout tone="good" title="This is the whole trick">
        A tool marked &ldquo;AI-assisted setup&rdquo; is written so an assistant
        can follow its <code>SETUP.md</code>{" "}unattended. You don&apos;t need to
        understand the code — you just need the assistant open in the folder.
      </Callout>

      <H2 id="runtimes">Runtimes, briefly</H2>
      <p>
        Each listing shows a <strong>runtime</strong>{" "}— the thing the tool needs
        to run. If you use the AI-assisted path, the assistant handles this for
        you. If you&apos;re running it yourself, here&apos;s what each means:
      </p>
      <div className="doc-table-wrap">
        <table>
          <thead>
            <tr><th>Runtime</th><th>What you need</th></tr>
          </thead>
          <tbody>
            <tr><td>Node.js</td><td>Node.js installed (nodejs.org). Usually <code>npm install &amp;&amp; npm start</code>.</td></tr>
            <tr><td>Python</td><td>Python installed (python.org). Usually a <code>pip install</code>{" "}then a run command.</td></tr>
            <tr><td>Browser</td><td>Nothing extra — it runs in a web browser you already have.</td></tr>
            <tr><td>Desktop app</td><td>Download and open it like any app. The setup guide covers first-run security prompts.</td></tr>
          </tbody>
        </table>
      </div>

      <H2 id="troubleshooting">If it won&apos;t run</H2>
      <ul>
        <li>
          <strong>Re-read <code>SETUP.md</code>.</strong>{" "}The exact command and
          prerequisites are there. Check you installed the runtime it names.
        </li>
        <li>
          <strong>Ask your AI assistant.</strong>{" "}Open the folder and describe the
          error — it can usually diagnose a missing dependency or wrong version.
        </li>
        <li>
          <strong>Contact the seller.</strong>{" "}Every listing has a support email.
          Sellers agree to help with &ldquo;won&apos;t run&rdquo; issues.
        </li>
        <li>
          <strong>Still stuck within 14 days? Get a refund.</strong>{" "}If a tool
          won&apos;t run, you&apos;re covered — no questions asked. Reach us via
          the <Link href="/about#contact">contact form</Link>. See the{" "}
          <Link href="/refunds">Refund policy</Link>.
        </li>
      </ul>

      <Callout tone="note" title="Is it safe to run?">
        Every tool is reviewed and its source is readable before it lists —
        details in <Link href={docPath("trust-and-safety")}>Trust &amp; safety</Link>.
        Because tools run on your own machine, you run downloaded software at your
        own risk, so the usual good habits apply.
      </Callout>
    </DocPage>
  );
}
