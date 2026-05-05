import type { Lead, OpeningHours } from "../types";

let isScraping = false;
let isPaused = false;
const seenIds = new Set<string>();

// Retry wrapper for fragile operations
async function retry<T>(fn: () => Promise<T>, retries: number = 3, delayMs: number = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Attempt ${i + 1} failed, retrying...`, err);
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw new Error('Retry failed');
}

chrome.runtime.onMessage.addListener((message: any) => {
  if (message.type === "START_SCRAPING_CMD") {
    startScraping(message.scrapeDetails ?? false);
  }
  if (message.type === "STOP_SCRAPING_CMD") {
    isScraping = false;
  }
  if (message.type === "PAUSE_SCRAPING_CMD") {
    isPaused = true;
    chrome.runtime.sendMessage({ type: "SCRAPING_PAUSED" });
  }
  if (message.type === "RESUME_SCRAPING_CMD") {
    isPaused = false;
    chrome.runtime.sendMessage({ type: "SCRAPING_RESUMED" });
  }
});

async function startScraping(scrapeDetails: boolean) {
  if (isScraping) return;
  isScraping = true;
  seenIds.clear();

  try {
    await scrapeLoop(scrapeDetails);
  } catch (error) {
    chrome.runtime.sendMessage({
      type: "SCRAPING_FAILED",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function scrapeLoop(scrapeDetails: boolean) {
  // Phase 1: Collect all basic leads from list view
  const allLeads: Lead[] = [];

  while (isScraping) {
    // Pause check
    while (isPaused) {
      await sleep(500);
    }
    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: "Extracting leads from current view...",
    });

    const leads = extractLeads();
    const newLeads = leads.filter((lead) => !seenIds.has(lead.id));

    if (newLeads.length > 0) {
      newLeads.forEach((lead) => seenIds.add(lead.id));
      allLeads.push(...newLeads);
      chrome.runtime.sendMessage({ type: "LEADS_FOUND", payload: newLeads });
    }

    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: "Scrolling down for more results...",
    });
    const hasMore = await scrollToLoadMore();

    if (!hasMore) {
      chrome.runtime.sendMessage({
        type: "UPDATE_ACTIVITY",
        payload: "List scan complete.",
      });
      break;
    }

    await sleep(1500);
  }

  // Phase 2: If detail scraping is enabled, click each lead for details
  if (scrapeDetails && isScraping && allLeads.length > 0) {
    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: `Starting detail extraction for ${allLeads.length} leads...`,
    });
    chrome.runtime.sendMessage({
      type: "DETAIL_PROGRESS",
      payload: { current: 0, total: allLeads.length },
    });

    for (let i = 0; i < allLeads.length; i++) {
      if (!isScraping) break;

      const lead = allLeads[i];
      chrome.runtime.sendMessage({
        type: "UPDATE_ACTIVITY",
        payload: `Detail: ${i + 1}/${allLeads.length} — ${lead.name}`,
      });
      chrome.runtime.sendMessage({
        type: "DETAIL_PROGRESS",
        payload: { current: i + 1, total: allLeads.length },
      });

      try {
        const details = await retry(() => extractDetailForLead(lead));
        if (details) {
          const enrichedLead = { ...lead, ...details };
          chrome.runtime.sendMessage({
            type: "LEAD_ENRICHED",
            payload: enrichedLead,
          });
        }
      } catch (err) {
        console.warn(`Detail extraction failed for ${lead.name}:`, err);
      }

      // Random delay between clicks to avoid detection (2-4 seconds)
      await sleep(2000 + Math.random() * 2000);
    }
  }

  if (isScraping) {
    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: "Scraping finished successfully!",
    });
    chrome.runtime.sendMessage({ type: "SCRAPING_COMPLETED" });
    isScraping = false;
  }
}

function extractLeads(): Lead[] {
  const leads: Lead[] = [];
  const items = document.querySelectorAll('div[role="article"]');

  items.forEach((item) => {
    const linkElement = item.querySelector("a.hfpxzc");
    if (!linkElement) return;

    const url = (linkElement as HTMLAnchorElement).href;
    const id = url.split("?")[0];
    const name =
      item.querySelector(".qBF1Pd")?.textContent?.trim() || "Unknown";
    const ratingLabel = item
      .querySelector("span.ZkP5Je")
      ?.getAttribute("aria-label");
    let rating: number | undefined;
    let reviews: number | undefined;

    if (ratingLabel) {
      const match = ratingLabel.match(
        /(\d+[,.]\d+)\s*yıldızlı\s*([\d.]+)\s*Yorum/
      );
      if (match) {
        rating = parseFloat(match[1].replace(",", "."));
        reviews = parseInt(match[2].replace(".", ""));
      }
    }

    const phone = item.querySelector(".UsdlK")?.textContent?.trim() || "";
    const websiteElement = item.querySelector('a[data-value*="Web"]');
    const website = websiteElement
      ? (websiteElement as HTMLAnchorElement).href
      : undefined;

    const infoContainers = item.querySelectorAll(".W4Efsd");
    let category = "";
    let address = "";

    if (infoContainers.length > 1) {
      const textContent = infoContainers[1].textContent || "";
      if (textContent.includes("·")) {
        const parts = textContent.split("·").map((p) => p.trim());
        category = parts[0];
        address = cleanAddress(parts[1] || "");
      } else {
        category = textContent;
      }
    }

    leads.push({
      id,
      name,
      rating,
      reviews,
      category,
      address,
      phone,
      website,
      url,
    });
  });

  return leads;
}

// ─── Address Cleaning ──────────────────────────────────────────────

function cleanAddress(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/(Açık|Kapalı)\s*(⋅\s*Açılış zamanı:.*)?$/i, '')
    .replace(/\s*(24\s*saat|açık|kapalı).*$/i, '')
    .replace(/\s*⋅.*$/, '')
    .trim();
}

// ─── Detail Extraction ──────────────────────────────────────────────

async function extractDetailForLead(
  lead: Lead
): Promise<Partial<Lead> | null> {
  // Find and click the listing link in the feed
  const allLinks = document.querySelectorAll("a.hfpxzc");
  let targetLink: HTMLAnchorElement | null = null;

  for (const link of Array.from(allLinks)) {
    const href = (link as HTMLAnchorElement).href;
    if (href.split("?")[0] === lead.id) {
      targetLink = link as HTMLAnchorElement;
      break;
    }
  }

  if (!targetLink) {
    // Try scrolling back up to find the element
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      feed.scrollTop = 0;
      await sleep(1000);
      // Try again
      const retryLinks = document.querySelectorAll("a.hfpxzc");
      for (const link of Array.from(retryLinks)) {
        if ((link as HTMLAnchorElement).href.split("?")[0] === lead.id) {
          targetLink = link as HTMLAnchorElement;
          break;
        }
      }
    }
    if (!targetLink) return null;
  }

  // Scroll element into view and click
  targetLink.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(500);
  targetLink.click();

  // Wait for detail panel to load
  await waitForDetailPanel();
  await sleep(1500);

  // Extract details
  const details = scrapeDetailPanel();

  // Go back to list view
  await goBackToList();
  await sleep(1500);

  return details;
}

async function waitForDetailPanel(): Promise<void> {
  const maxWait = 8000;
  const interval = 300;
  let waited = 0;

  while (waited < maxWait) {
    // Check for the detail panel header (business name in detail view)
    const detailHeader = document.querySelector('h1.DUwDvf');
    if (detailHeader) return;
    await sleep(interval);
    waited += interval;
  }
}

function scrapeDetailPanel(): Partial<Lead> {
  const details: Partial<Lead> = {};

  // ── Opening Hours ──
  details.openingHours = extractOpeningHours();

  // ── Is Open Now ──
  const openNowEl = document.querySelector(
    'span.ZDu9vd, span[data-hide-tooltip-on-mouse-move]'
  );
  if (openNowEl) {
    const text = openNowEl.textContent?.trim().toLowerCase() || "";
    if (text.includes("açık") || text.includes("open")) {
      details.isOpenNow = true;
    } else if (text.includes("kapalı") || text.includes("closed")) {
      details.isOpenNow = false;
    }
  }

  // ── Plus Code ──
  const plusCodeEl = document.querySelector(
    'button[data-item-id="oloc"] .Io6YTe, button[data-item-id="oloc"] .rogA2c'
  );
  if (plusCodeEl) {
    details.plusCode = plusCodeEl.textContent?.trim();
  }

  // ── Price Level ──
  const priceLevelEl = document.querySelector(
    'span[aria-label*="Fiyat"], span[aria-label*="Price"]'
  );
  if (priceLevelEl) {
    details.priceLevel = priceLevelEl.textContent?.trim();
  } else {
    // Try another approach - look in the info section
    const allSpans = document.querySelectorAll("span.mgr77e");
    for (const span of Array.from(allSpans)) {
      const text = span.textContent?.trim() || "";
      if (/^[₺$€£]{1,4}$/.test(text)) {
        details.priceLevel = text;
        break;
      }
    }
  }

  // ── Service Options ──
  details.serviceOptions = extractServiceOptions();

  // ── Description ──
  const descEl = document.querySelector(
    'div.WeS02d div.PYvSYb, div[class*="editorial"] span'
  );
  if (descEl) {
    details.description = descEl.textContent?.trim();
  }

  // ── Total Photos ──
  const photoBtn = document.querySelector(
    'button[jsaction*="photo"] .fontBodyMedium, button.aoRNLd div.YkuOqf'
  );
  if (photoBtn) {
    const photoText = photoBtn.textContent?.trim() || "";
    const photoMatch = photoText.match(/(\d+)/);
    if (photoMatch) {
      details.totalPhotos = parseInt(photoMatch[1]);
    }
  }

  // ── Phone (from detail panel - more reliable) ──
  const phoneBtn = document.querySelector(
    'button[data-item-id^="phone"] .Io6YTe, button[data-item-id^="phone"] .rogA2c'
  );
  if (phoneBtn) {
    details.phone = phoneBtn.textContent?.trim();
  }

  // ── Website (from detail panel - more reliable) ──
  const websiteBtn = document.querySelector(
    'a[data-item-id="authority"] .Io6YTe, a[data-item-id="authority"] .rogA2c'
  );
  if (websiteBtn) {
    const websiteLinkEl = websiteBtn.closest("a");
    if (websiteLinkEl) {
      details.website = (websiteLinkEl as HTMLAnchorElement).href;
    }
  }

  // ── Address (from detail panel - more reliable) ──
  const addressBtn = document.querySelector(
    'button[data-item-id="address"] .Io6YTe, button[data-item-id="address"] .rogA2c'
  );
  if (addressBtn) {
    details.address = addressBtn.textContent?.trim();
  }

  return details;
}

function extractOpeningHours(): OpeningHours | undefined {
  const hours: OpeningHours = {};

  // Method 1: Look for the hours table (expanded)
  const hoursTable = document.querySelector("table.eK4R0e, table.WgFkxc");
  if (hoursTable) {
    const rows = hoursTable.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const day = cells[0].textContent?.trim() || "";
        const time = cells[1].textContent?.trim() || "";
        if (day && time) {
          hours[day] = time;
        }
      }
    });
    if (Object.keys(hours).length > 0) return hours;
  }

  // Method 2: Try clicking "hours" button to expand, then read
  const hoursButton = document.querySelector(
    'button[data-item-id="oh"], button[aria-label*="saat"], button[aria-label*="hour"]'
  );
  if (hoursButton) {
    // Try to read the aria-label which sometimes contains hours info
    const ariaLabel = hoursButton.getAttribute("aria-label") || "";
    if (ariaLabel.includes(";")) {
      const parts = ariaLabel.split(";").map((p) => p.trim());
      for (const part of parts) {
        // Parse "Pazartesi, 09:00–18:00" format
        const sepIndex = part.indexOf(",");
        if (sepIndex > 0) {
          const day = part.substring(0, sepIndex).trim();
          const time = part.substring(sepIndex + 1).trim();
          if (day && time) {
            hours[day] = time;
          }
        }
      }
      if (Object.keys(hours).length > 0) return hours;
    }
  }

  // Method 3: Look for individual day rows in the detail panel
  const dayRows = document.querySelectorAll(
    '.OqCZI tr, div[aria-label*="Çalışma saatleri"] tr'
  );
  dayRows.forEach((row) => {
    const dayEl = row.querySelector(".ylH6lf");
    const timeEl = row.querySelector(".mxowUb");
    if (dayEl && timeEl) {
      const day = dayEl.textContent?.trim() || "";
      const time = timeEl.textContent?.trim() || "";
      if (day && time) {
        hours[day] = time;
      }
    }
  });

  return Object.keys(hours).length > 0 ? hours : undefined;
}

function extractServiceOptions(): string[] {
  const options: string[] = [];

  // Service options are usually in a section with icons and labels
  const serviceItems = document.querySelectorAll(
    'div.LTs0Rc div.E0DTEd, li.hpLkke span'
  );
  serviceItems.forEach((item) => {
    const text = item.textContent?.trim();
    if (text && text.length < 50) {
      options.push(text);
    }
  });

  // Also check for the service options grid (Paket servis, İç mekan yemek, etc.)
  if (options.length === 0) {
    const optionCards = document.querySelectorAll(
      'div[class*="m6QErb"] div.P2UJoe'
    );
    optionCards.forEach((card) => {
      const label = card.querySelector("span")?.textContent?.trim();
      if (label) options.push(label);
    });
  }

  return options;
}

async function goBackToList(): Promise<void> {
  // Method 1: Click the back button
  const backButton = document.querySelector(
    'button[jsaction*="back"], button[aria-label="Geri"], button.VfPpkd-icon-LgbsSe.kCyAyd'
  );
  if (backButton) {
    (backButton as HTMLElement).click();
    await sleep(1000);
    // Wait for feed to reappear
    await waitForFeed();
    return;
  }

  // Method 2: Use history back
  history.back();
  await sleep(1000);
  await waitForFeed();
}

async function waitForFeed(): Promise<void> {
  const maxWait = 6000;
  const interval = 300;
  let waited = 0;

  while (waited < maxWait) {
    const feed = document.querySelector('div[role="feed"]');
    if (feed && feed.children.length > 0) return;
    await sleep(interval);
    waited += interval;
  }
}

// ─── Scrolling ──────────────────────────────────────────────────────

async function scrollToLoadMore(): Promise<boolean> {
  const scrollContainer = document.querySelector('div[role="feed"]');
  if (!scrollContainer) return false;

  const previousHeight = scrollContainer.scrollHeight;
  scrollContainer.scrollBy(0, 1000);

  await sleep(2000);

  if (scrollContainer.scrollHeight <= previousHeight) {
    const endOfList = document.querySelector(".HlvSq");
    if (endOfList) return false;

    scrollContainer.scrollBy(0, 500);
    await sleep(2000);
    return scrollContainer.scrollHeight > previousHeight;
  }

  return true;
}

// ─── Utility ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
