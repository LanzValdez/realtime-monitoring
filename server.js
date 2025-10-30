const express = require("express");
const cors = require("cors");
const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Simple list of connected clients
let clients = [];

// --- SSE Setup ---
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);
  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

// --- Send event to all connected clients ---
function sendToClients(type, message) {
  const payload = JSON.stringify({ type, message });
  clients.forEach(res => res.write(`data: ${payload}\n\n`));
}

// --- Playwright Runner ---
app.post("/run-playwright", async (req, res) => {
  const log = (msg) => {
    console.log(msg);
    sendToClients("log", msg);
  };

  try {
    // Notify all clients test started
    sendToClients("status", { state: "running", time: new Date().toLocaleTimeString() });

    // --- Playwright code ---
    const extensionId = "kaimffedkgfcdipeodaggjmgilgabhjj";
    const extensionPath = "C:\\Users\\lanz.valdez\\Documents\\GitHub\\datadepot-extension1";
    const tempProfile = path.join(__dirname, "edge-temp-profile");

    const edgePath = fs.existsSync("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")
      ? "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
      : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    log("🔍 Launching Edge...");
    const context = await chromium.launchPersistentContext(tempProfile, {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
    ],
    });


    const page = await context.newPage();
    const extensionUrl = `chrome-extension://${extensionId}/index.html`;

    log(`🧩 Opening extension page: ${extensionUrl}`);
    await page.goto(extensionUrl);

    log("🧰 Opening Tools...");
    await page.click("#tool-btn");
    await page.waitForTimeout(1000);

    log("⚡ Opening Ninja QuickType...");
    await page.click("#tools-quicktype");
    await page.waitForTimeout(1000);

    log("🧠 Adding QuickType entries...");
    for (let i = 1; i <= 5; i++) {
      log(`➕ Creating QuickType ${i}`);
      await page.click("#addNewQuickType");
      await page.fill("#nqt-triggerInput", `${i}`);
      await page.fill("#nqt-descriptionInput", `${i}`);
      await page.fill("#nqt-textInput", `AIquicktype test ${i}`);
      await page.click("#nqt-okBtn");
      await page.waitForTimeout(500);
    }

    log("✅ Done!");

    // Notify all clients test passed
    sendToClients("status", { state: "passed", time: new Date().toLocaleTimeString() });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    sendToClients("log", `❌ Error: ${err.message}`);
    sendToClients("status", { state: "failed", time: new Date().toLocaleTimeString() });
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

