import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { getPrismaClient } from "../src/lib/prisma";

// Renders the deployed Beta access tab in real Chrome and reports any console
// error or uncaught exception. A clean typecheck and a 200 from the API do not
// prove the component renders: an unguarded property access in the new panel
// would blank the page while every server-side check stayed green.

const PROFILE = process.env.CHROME_PROFILE!;
const PORT = 9222;
const URL_TO_LOAD = process.env.TARGET_URL ?? "https://www.trenchers.ai/analytics";

type CdpMsg = { id?: number; method?: string; params?: any; result?: any; error?: any };

async function cdp(ws: WebSocket, id: number, method: string, params: any = {}, sessionId?: string) {
  return new Promise<any>((resolve, reject) => {
    const onMsg = (ev: MessageEvent) => {
      const m: CdpMsg = JSON.parse(String(ev.data));
      if (m.id === id) {
        ws.removeEventListener("message", onMsg as any);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      }
    };
    ws.addEventListener("message", onMsg as any);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    setTimeout(() => reject(new Error(`timeout on ${method}`)), 30_000);
  });
}

async function main() {
  const prisma = getPrismaClient();
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  await prisma.analyticsSession.create({
    data: { email: "verify-bot@trenchers.ai", tokenHash, expiresAt: new Date(Date.now() + 180_000) },
  });

  const chrome = spawn("google-chrome", [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--window-size=1440,2400", "about:blank",
  ], { stdio: "ignore", detached: false });

  const errors: string[] = [];
  try {
    let info: any = null;
    for (let i = 0; i < 40; i++) {
      try { info = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; }
      catch { await new Promise((r) => setTimeout(r, 500)); }
    }
    if (!info) throw new Error("chrome did not expose CDP");

    const ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r as any, { once: true }));
    let id = 0;

    const { targetId } = await cdp(ws, ++id, "Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp(ws, ++id, "Target.attachToTarget", { targetId, flatten: true });

    ws.addEventListener("message", (ev: any) => {
      const m: CdpMsg = JSON.parse(String(ev.data));
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params?.exceptionDetails;
        errors.push(`EXCEPTION: ${d?.exception?.description ?? d?.text ?? "unknown"}`.slice(0, 400));
      }
      if (m.method === "Runtime.consoleAPICalled" && m.params?.type === "error") {
        errors.push(`CONSOLE ERROR: ${m.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ")}`.slice(0, 400));
      }
    });

    await cdp(ws, ++id, "Runtime.enable", {}, sessionId);
    await cdp(ws, ++id, "Network.enable", {}, sessionId);
    await cdp(ws, ++id, "Page.enable", {}, sessionId);
    await cdp(ws, ++id, "Network.setCookie", {
      name: "trenchers_analytics_session", value: token,
      domain: process.env.COOKIE_DOMAIN ?? "www.trenchers.ai", path: "/",
      secure: (process.env.COOKIE_DOMAIN ?? "www.trenchers.ai") !== "127.0.0.1", httpOnly: true,
    }, sessionId);

    await cdp(ws, ++id, "Page.navigate", { url: URL_TO_LOAD }, sessionId);
    await new Promise((r) => setTimeout(r, 9_000));

    // Click through to the Beta access tab, then let it fetch.
    const clicked = await cdp(ws, ++id, "Runtime.evaluate", {
      expression: `(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Beta access');
        if (!b) return 'tab button not found';
        b.click(); return 'clicked';
      })()`, returnByValue: true,
    }, sessionId);
    console.log("beta tab:", clicked.result.value);

    // Poll until the panel appears rather than sleeping a fixed amount: this
    // endpoint runs a large query plus a cross-database join and is genuinely
    // slow, and a fixed sleep would report a false failure.
    let waited = 0;
    for (;;) {
      const r = await cdp(ws, ++id, "Runtime.evaluate", {
        expression: `document.body.innerText.includes('Second trench: rollout report')`,
        returnByValue: true,
      }, sessionId);
      if (r.result.value === true) { console.log(`panel appeared after ${waited}s`); break; }
      if (waited >= 90) { console.log(`panel NOT present after ${waited}s`); break; }
      await new Promise((r2) => setTimeout(r2, 3_000));
      waited += 3;
    }

    const dump = await cdp(ws, ++id, "Runtime.evaluate", {
      expression: `JSON.stringify({
        h4s: [...document.querySelectorAll('h4')].map(h => h.textContent.trim()),
        panelTitles: [...document.querySelectorAll('h3')].map(h => h.textContent.trim()),
        trenchSectionText: (() => {
          const all = [...document.querySelectorAll('*')];
          const el = all.find(e => e.tagName === 'H3' && e.textContent.includes('Second trench'));
          if (!el) return 'panel h3 not found';
          const panel = el.closest('section,div[class*=rounded]');
          return panel ? panel.innerText.slice(0, 1400) : 'panel container not found';
        })(),
      })`, returnByValue: true,
    }, sessionId);
    console.log("\nPAGE DUMP:", JSON.stringify(JSON.parse(dump.result.value), null, 2));

    // Screenshot the panel itself. innerText concatenates across elements and
    // ignores CSS margins, so it cannot tell a real layout bug from a gap that
    // is there visually. Only a picture settles that.
    const box = await cdp(ws, ++id, "Runtime.evaluate", {
      expression: `(() => {
        const el = [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Second trench'));
        const panel = el.closest('section') || el.parentElement.parentElement;
        const r = panel.getBoundingClientRect();
        window.scrollTo(0, 0);
        return JSON.stringify({x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height});
      })()`, returnByValue: true,
    }, sessionId);
    const b = JSON.parse(box.result.value);
    const shot = await cdp(ws, ++id, "Page.captureScreenshot", {
      format: "png",
      clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 3000), scale: 1.5 },
      captureBeyondViewport: true,
    }, sessionId);
    const fs = await import("node:fs");
    fs.writeFileSync(process.env.SHOT_PATH!, Buffer.from(shot.data, "base64"));
    console.log("screenshot written:", process.env.SHOT_PATH);

    const probe = await cdp(ws, ++id, "Runtime.evaluate", {
      expression: `(() => {
        const t = document.body.innerText;
        const has = (s) => t.includes(s);
        return JSON.stringify({
          trenchPanel:  has('Second trench: rollout report'),
          cadence:      has('Batch cadence'),
          caveats:      has('What this report does not say'),
          comparison:   has('Against the first trench'),
          providers:    has('By mailbox provider'),
          waveTable:    has('Rollout by wave'),
          signedInAfter:has('Signed in after'),
          sentLine:     (t.match(/of 1,000 sent/) || [])[0] || null,
          svgCount:     document.querySelectorAll('svg').length,
          errorText:    has('Could not load') || has('Application error') || has('client-side exception'),
        });
      })()`, returnByValue: true,
    }, sessionId);
    console.log("\nrendered:", JSON.stringify(JSON.parse(probe.result.value), null, 2));
  } finally {
    chrome.kill("SIGKILL");
    await prisma.analyticsSession.deleteMany({ where: { tokenHash } });
    await prisma.$disconnect();
  }

  console.log("\nconsole errors / exceptions:", errors.length);
  for (const e of errors.slice(0, 12)) console.log("  " + e);
}
main();
