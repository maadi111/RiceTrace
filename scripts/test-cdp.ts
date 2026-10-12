import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.resolve(__dirname, "../scratch/chrome-profile");

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  async connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        if (data.id && this.pending.has(data.id)) {
          const { resolve, reject } = this.pending.get(data.id)!;
          this.pending.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
    });
  }

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws?.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws?.close();
  }
}

async function test() {
  console.log("Spawning Chrome with CDP...");
  const chromeProcess: ChildProcess = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${USER_DATA_DIR}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
  ], { detached: false });

  // Wait for debugger port
  let wsUrl = "";
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        const json = await res.json();
        wsUrl = json.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) throw new Error("Could not connect to Chrome debugging port!");
  console.log("Chrome CDP WebSocket:", wsUrl);

  const browserCdp = new CDPClient();
  await browserCdp.connect(wsUrl);

  const { targetId } = await browserCdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browserCdp.send("Target.attachToTarget", { targetId, flatten: true });

  const sessionSend = async (method: string, params: any = {}) => {
    return browserCdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id: Date.now() + Math.random(), method, params }),
    });
  };

  // Or connect to the page directly via /json/list
  const targetsRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t: any) => t.type === "page");

  const pageCdp = new CDPClient();
  await pageCdp.connect(pageTarget.webSocketDebuggerUrl);

  await pageCdp.send("Page.enable");
  await pageCdp.send("Runtime.enable");
  await pageCdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1.5,
    mobile: false,
  });

  console.log("Navigating to http://localhost:3000/login...");
  await pageCdp.send("Page.navigate", { url: "http://localhost:3000/login" });
  await new Promise((r) => setTimeout(r, 2000));

  const { data } = await pageCdp.send("Page.captureScreenshot", { format: "png" });
  const outPath = path.resolve(__dirname, "../test-images/01_login_cdp.png");
  fs.writeFileSync(outPath, Buffer.from(data, "base64"));
  console.log("Saved CDP screenshot:", outPath, fs.statSync(outPath).size, "bytes");

  pageCdp.close();
  browserCdp.close();
  chromeProcess.kill();
}

test().catch(console.error);
