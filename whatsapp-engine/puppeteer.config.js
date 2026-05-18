/**
 * Puppeteer configuration for Docker compatibility.
 * Uses system-installed Chromium instead of bundled (which has arch issues).
 */
const path = require('path');

module.exports = {
  // Use system chromium if available (Docker), fallback to bundled
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (() => {
    try {
      // Check for system chromium
      const { execSync } = require('child_process');
      const candidates = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];
      for (const p of candidates) {
        try {
          execSync(`test -x ${p}`);
          return p;
        } catch {}
      }
    } catch {}
    return undefined; // Let puppeteer use bundled
  })(),
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
  ],
  ignoreHTTPSErrors: true,
  dumpio: false,
  pipe: true, // Use pipe instead of websocket (more compatible in Docker)
};