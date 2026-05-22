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
    startScraping(
      message.scrapeDetails ?? false,
      message.customCategory,
      message.defaultCity,
      message.defaultCountry,
      message.plan || 'free'
    );
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

async function startScraping(
  scrapeDetails: boolean,
  customCategory?: string,
  defaultCity?: string,
  defaultCountry?: string,
  plan: string = 'free'
) {
  if (isScraping) return;
  isScraping = true;
  seenIds.clear();

  try {
    await scrapeLoop(scrapeDetails, customCategory, defaultCity, defaultCountry, plan);
  } catch (error) {
    chrome.runtime.sendMessage({
      type: "SCRAPING_FAILED",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function scrapeLoop(
  scrapeDetails: boolean,
  customCategory?: string,
  defaultCity?: string,
  defaultCountry?: string,
  plan: string = 'free'
) {
  // Phase 1: Collect all basic leads from list view
  const allLeads: Lead[] = [];

  while (isScraping) {
    // Pause check
    while (isPaused) {
      await sleep(200);
    }
    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: "Extracting leads from current view...",
    });

    const leads = extractLeads(customCategory, defaultCity, defaultCountry);
    let newLeads = leads.filter((lead) => !seenIds.has(lead.id));

    if (newLeads.length > 0) {
      if (plan === 'free' && allLeads.length + newLeads.length > 20) {
        const allowedSpace = 20 - allLeads.length;
        if (allowedSpace > 0) {
          newLeads = newLeads.slice(0, allowedSpace);
          newLeads.forEach((lead) => seenIds.add(lead.id));
          allLeads.push(...newLeads);
          chrome.runtime.sendMessage({ type: "LEADS_FOUND", payload: newLeads });
        }
        
        chrome.runtime.sendMessage({
          type: "UPDATE_ACTIVITY",
          payload: "Ücretsiz plan limitine ulaşıldı (Maks. 20 kayıt).",
        });

        chrome.runtime.sendMessage({
          type: "SCRAPING_FAILED",
          error: "Ücretsiz plan limitine (oturum başı 20 kayıt) ulaştınız. Sınırsız arama ve bulut senkronizasyonu için lütfen planınızı PRO'ya yükseltin!"
        });

        isScraping = false;
        break;
      }

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

    await sleep(800);
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

      // Pause check
      while (isPaused) {
        await sleep(200);
      }

      const lead = allLeads[i];
      chrome.runtime.sendMessage({
        type: "UPDATE_ACTIVITY",
        payload: `Detail: ${i + 1}/${allLeads.length} — ${lead.name}`,
      });
      chrome.runtime.sendMessage({
        type: "DETAIL_PROGRESS",
        payload: { current: i + 1, total: allLeads.length },
      });
      chrome.runtime.sendMessage({
        type: "DETAIL_ACTIVITY",
        payload: { name: lead.name, index: i + 1, total: allLeads.length, currentFields: [] },
      });

      try {
        const details = await retry(() => extractDetailForLead(lead, (fields) => {
          chrome.runtime.sendMessage({
            type: "DETAIL_ACTIVITY",
            payload: { name: lead.name, index: i + 1, total: allLeads.length, currentFields: fields },
          });
        }), 2, 1000);
        if (details) {

          const enrichedLead = { ...lead, ...details };
          chrome.runtime.sendMessage({
            type: "LEAD_ENRICHED",
            payload: enrichedLead,
          });

          // Determine which fields were extracted
          const extractedFields: string[] = [];
          if (details.phone) extractedFields.push('phone');
          if (details.website) extractedFields.push('website');
          if (details.address) extractedFields.push('address');
          if (details.openingHours && Object.keys(details.openingHours).length > 0) extractedFields.push('hours');
          if (details.isOpenNow !== undefined) extractedFields.push('open_now');
          if (details.priceLevel) extractedFields.push('price');
          if (details.serviceOptions && details.serviceOptions.length > 0) extractedFields.push('services');

          chrome.runtime.sendMessage({
            type: "DETAIL_LOG_ENTRY",
            payload: {
              businessName: lead.name,
              timestamp: Date.now(),
              fields: extractedFields,
              success: true,
            },
          });
        } else {
          chrome.runtime.sendMessage({
            type: "DETAIL_LOG_ENTRY",
            payload: {
              businessName: lead.name,
              timestamp: Date.now(),
              fields: [],
              success: false,
            },
          });
        }
      } catch (err) {
        console.warn(`Detail extraction failed for ${lead.name}:`, err);
        chrome.runtime.sendMessage({
          type: "DETAIL_LOG_ENTRY",
          payload: {
            businessName: lead.name,
            timestamp: Date.now(),
            fields: [],
            success: false,
          },
        });
      }

      // Random delay between clicks to avoid detection (1-2.5 seconds)
      await sleep(1000 + Math.random() * 1500);
    }
  }

  if (isScraping) {
    chrome.runtime.sendMessage({
      type: "UPDATE_ACTIVITY",
      payload: "Scraping finished successfully!",
    });
    chrome.runtime.sendMessage({
      type: "DETAIL_ACTIVITY",
      payload: undefined,
    });
    chrome.runtime.sendMessage({ type: "SCRAPING_COMPLETED" });
    isScraping = false;
  }
}

function extractLeads(customCategory?: string, defaultCity?: string, defaultCountry?: string): Lead[] {
  const leads: Lead[] = [];
  // Updated selectors for business items in the list
  const items = document.querySelectorAll('div[role="article"], div.Nv2Ybe, .fontBodyMedium.Q7S7S');

  items.forEach((item) => {
    // Look for the main link - hfpxzc is common but a[href*="/maps/place/"] is safer
    const linkElement = item.querySelector("a.hfpxzc") || item.querySelector('a[href*="/maps/place/"]');
    if (!linkElement) return;

    const url = (linkElement as HTMLAnchorElement).href;
    // Extract ID from URL (e.g., https://www.google.com/maps/place/NAME/...)
    const id = url.split("?")[0];
    
    // Name fallbacks
    const name =
      item.querySelector(".qBF1Pd")?.textContent?.trim() || 
      item.querySelector(".fontHeadlineSmall")?.textContent?.trim() ||
      item.querySelector('div[role="heading"]')?.textContent?.trim() ||
      "Unknown";
      
    // Rating and Reviews
    const ratingLabel = item.querySelector("span.ZkP5Je, span.MW4etd")?.getAttribute("aria-label");
    let rating: number | undefined;
    let reviews: number | undefined;

    if (ratingLabel) {
      // Robust regex for Turkish and English ratings
      // "4,5 yıldız 1.234 Yorum" or "4.5 stars 1,234 Reviews"
      const match = ratingLabel.match(/([\d,.]+)\s*(yıldızlı|stars?)\s*([\d,.]+)\s*(Yorum|Reviews?|reviews?)/i);
      if (match) {
        rating = parseFloat(match[1].replace(",", "."));
        reviews = parseInt(match[3].replace(/[.,]/g, ""));
      }
    }

    // Phone - UsdlK is specific, but also check aria-labels
    let phone = item.querySelector(".UsdlK")?.textContent?.trim() || "";
    if (!phone) {
        const phoneBtn = item.querySelector('button[aria-label*="Telefon"], button[aria-label*="Phone"]');
        if (phoneBtn) phone = phoneBtn.textContent?.trim() || "";
    }

    // Website
    const websiteElement = item.querySelector('a[data-value*="Web"], a[aria-label*="web"], a[aria-label*="internet"]');
    const website = websiteElement
      ? (websiteElement as HTMLAnchorElement).href
      : undefined;

    // Category and Address (usually in .W4Efsd containers)
    const infoContainers = item.querySelectorAll(".W4Efsd");
    let category = "";
    let address = "";

    // Typically infoContainers[1] has category and address
    for (let i = 0; i < infoContainers.length; i++) {
        const text = infoContainers[i].textContent || "";
        if (text.includes("·")) {
            const parts = text.split("·").map((p) => p.trim());
            if (parts.length >= 2) {
                // If the first part looks like a category (no digits)
                if (!/\d/.test(parts[0])) {
                    category = parts[0];
                    address = cleanAddress(parts[1]);
                } else {
                    address = cleanAddress(parts[0]);
                }
            }
        } else if (text.length > 5 && /\d/.test(text) && !address) {
            address = cleanAddress(text);
        } else if (text.length > 2 && !category && !/\d/.test(text)) {
            category = text;
        }
    }

    leads.push({
      id,
      name,
      rating,
      reviews,
      category: customCategory || category.replace(/\s+/g, ' ').trim(),
      address: address.replace(/\s+/g, ' ').trim(),
      city: defaultCity || undefined,
      country: defaultCountry || undefined,
      phone: phone.replace(/\s+/g, ' ').trim(),
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
  lead: Lead,
  onFieldsFound?: (fields: string[]) => void
): Promise<Partial<Lead> | null> {
  const feed = document.querySelector('div[role="feed"]');
  let targetLink: HTMLAnchorElement | null = null;

  const findLink = () => {
    // Try multiple selectors for the link
    const allLinks = document.querySelectorAll('a.hfpxzc, a[href*="/maps/place/"]');
    for (const link of Array.from(allLinks)) {
      const href = (link as HTMLAnchorElement).href.split("?")[0];
      if (href === lead.id || href.includes(encodeURIComponent(lead.name.replace(/\s+/g, '+')))) {
        return link as HTMLAnchorElement;
      }
    }
    return null;
  };

  // Try multiple click methods to ensure it triggers (Google Maps uses PointerEvent for React)
  const clickElement = (el: HTMLElement) => {
    try { el.click(); } catch (e) {}

    // Google Maps React event system listens to PointerEvents, not MouseEvents
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
      const event = new PointerEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        buttons: 1
      });
      el.dispatchEvent(event);
    });
  };

  targetLink = findLink();

  if (!targetLink && feed) {
    // DO NOT reset scroll to top anymore for better speed
    // Search downwards from current position
    let lastHeight = feed.scrollHeight;
    let noChangeCount = 0;
    
    for (let i = 0; i < 20; i++) {
      targetLink = findLink();
      if (targetLink) break;
      
      feed.scrollBy(0, 800);
      await sleep(600); // Polling for lazy loading
      
      if (feed.scrollHeight === lastHeight) {
        noChangeCount++;
        if (noChangeCount > 3) break;
      } else {
        noChangeCount = 0;
      }
      lastHeight = feed.scrollHeight;
    }
    
    // If still not found, one quick check from the top ONLY if we are near the end
    if (!targetLink) {
        feed.scrollTop = 0;
        await sleep(500);
        for (let i = 0; i < 5; i++) {
            targetLink = findLink();
            if (targetLink) break;
            feed.scrollBy(0, 1000);
            await sleep(400);
        }
    }
  }

  if (!targetLink) {
    // Fallback: try clicking the article element directly
    const articles = document.querySelectorAll('div[role="article"]');
    for (const article of Array.from(articles)) {
      const nameEl = article.querySelector('.qBF1Pd, .fontHeadlineSmall, div[role="heading"]');
      const articleName = nameEl?.textContent?.trim() || '';
      if (articleName.includes(lead.name.replace(/[.*+?^${}()|[\]\\]/g, '').substring(0, 20))) {
        console.warn(`[Scraper] Clicking article directly for: ${lead.name}`);
        clickElement(article as HTMLElement);
        await sleep(800);
        const opened = await waitForDetailPanel();
        if (opened) {
          const details = scrapeDetailPanel();
          await goBackToList();
          return details;
        }
        break;
      }
    }

    console.warn(`[Scraper] Could not find link for lead: ${lead.name}`);
    return null;
  }

  // Ensure element is visible
  targetLink.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(400);
  
  // Click the link itself
  clickElement(targetLink);
  
  // If it didn't seem to work, click the parent article or a child div
  await sleep(200);
  const parentArticle = targetLink.closest('div[role="article"], .Nv2Ybe') as HTMLElement;
  if (parentArticle) clickElement(parentArticle);

  // Wait for detail panel to load
  const opened = await waitForDetailPanel();
  if (!opened) {
    console.warn(`[Scraper] Detail panel did not open for: ${lead.name}`);
    // One last desperate try clicking the name
    const nameEl = parentArticle?.querySelector('.qBF1Pd, .fontHeadlineSmall') as HTMLElement;
    if (nameEl) clickElement(nameEl);
    await waitForDetailPanel();
  }

  // Quick final wait for content stabilization
  await sleep(600);

  // Extract details
  const details = scrapeDetailPanel(onFieldsFound);

  // Go back to list view
  await goBackToList();

  return details;
}

async function waitForDetailPanel(): Promise<boolean> {
  const maxWait = 6000;
  const interval = 200; // Faster polling
  let waited = 0;

  const dataSelectors = [
    'button[data-item-id^="phone"]',
    'a[data-item-id="authority"]',
    'button[data-item-id="address"]',
    'button[data-item-id="oh"]',
    'h1.DUwDvf',
    '.CsEnBe',
    '.UsdlK',
    '.R9v7S', // Image/Header container
    '[role="main"]', // General Google Maps panel
    '.m6QErb.DByuAd', // Common panel container
    'div[jsaction]', // React-rooted panel
  ];

  while (waited < maxWait) {
    const detailHeader = document.querySelector('h1.DUwDvf');
    const hasAnyData = dataSelectors.some(sel => document.querySelector(sel));
    
    if (detailHeader && detailHeader.textContent?.trim()) {
        // If we have a header AND either some data OR we've waited long enough
        if (hasAnyData || waited > 3000) return true;
    }
    
    await sleep(interval);
    waited += interval;
  }
  return false;
}

function scrapeDetailPanel(onFieldsFound?: (fields: string[]) => void): Partial<Lead> {
  const details: Partial<Lead> = {};
  const foundFields: string[] = [];

  const notify = (field: string) => {
    if (!foundFields.includes(field)) {
      foundFields.push(field);
      onFieldsFound?.([...foundFields]);
    }
  };

  // Use document.body as base scope — Google Maps renders detail content at document level
  const scope: HTMLElement | Document = document;

  // ── Opening Hours ──
  details.openingHours = extractOpeningHours();
  if (details.openingHours && Object.keys(details.openingHours).length > 0) notify('hours');

  // ── Is Open Now ──
  const openNowSelectors = [
    'span.ZDu9vd',
    'span[data-hide-tooltip-on-mouse-move]',
    '.JpS9C',
    '[style*="color: rgb(24, 128, 56)"]', // Green text usually means open
    '[style*="color: rgb(217, 48, 37)"]'  // Red text usually means closed
  ];
  for (const selector of openNowSelectors) {
    const el = scope.querySelector(selector);
    if (el) {
      const text = el.textContent?.trim().toLowerCase() || "";
      if (text.includes("açık") || text.includes("open")) {
        details.isOpenNow = true;
        notify('open_now');
        break;
      } else if (text.includes("kapalı") || text.includes("closed")) {
        details.isOpenNow = false;
        notify('open_now');
        break;
      }
    }
  }

  // ── Phone ──
  const phoneSelectors = [
    'button[data-item-id^="phone"]',
    'a[data-item-id^="phone"]',
    'button[aria-label*="Telefon"]',
    'button[aria-label*="Phone"]',
    'button[aria-label*="Numara"]',
    'button[data-tooltip*="Telefon"]',
    'a[href^="tel:"]',
    '[data-item-id^="phone:tel:"]',
    '.UsdlK',
    '.fontBodyMedium [data-item-id^="phone"]',
    // New Google Maps selectors
    'button div.fontBodyMedium:has-text("+")',
    'div.fontBodyMedium[data-item-id]',
    'div[jsaction][data-phone]',
  ];

  for (const selector of phoneSelectors) {
    const el = scope.querySelector(selector) as HTMLElement;
    if (el) {
      const target = el.hasAttribute('data-item-id') ? el : el.closest('[data-item-id]');
      const itemId = target?.getAttribute('data-item-id');
      if (itemId && itemId.includes('phone:tel:')) {
        details.phone = itemId.replace('phone:tel:', '').trim();
        if (details.phone) {
          notify('phone');
          break;
        }
      }

      const ariaLabel = el.getAttribute('aria-label') || el.closest('button')?.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('Telefon') || ariaLabel.includes('Phone'))) {
        const match = ariaLabel.match(/(\+?[\d\s-]{8,})/);
        if (match) {
          details.phone = match[1].trim();
          if (details.phone) {
            notify('phone');
            break;
          }
        }
      }

      const textContent = el.querySelector('.Io6YTe')?.textContent?.trim() || el.textContent?.trim();
      if (textContent && textContent.length > 5 && /\d/.test(textContent) && !textContent.includes("Giriş")) {
        details.phone = textContent;
        notify('phone');
        break;
      }
    }
  }

  // Aggressive text-based phone fallback — scan detail panel text
  if (!details.phone) {
    const mainElement = scope.querySelector('[role="main"]') || (scope instanceof Document ? scope.body : scope);
    if (mainElement) {
      const allText = mainElement.textContent || "";
      // Look for Turkish phone patterns and international formats
      const phonePatterns = [
        /(\+?\d{2}[-. ]?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{2,4})/,
        /(0\d{2,3}[-. ]?\d{3}[-. ]?\d{2,4})/,
        /(\+90\s?\d{3}\s?\d{3}\s?\d{2,4})/,
        /(Tel[\s:]*[\d\s\-+()]{7,})/i,
        /(Telefon[\s:]*[\d\s\-+()]{7,})/i,
      ];
      for (const pattern of phonePatterns) {
        const matches = allText.match(pattern);
        if (matches) {
          let candidate = matches[0].replace(/Tel[\s:]*/i, '').replace(/Telefon[\s:]*/i, '').trim();
          // Validate it looks like a real phone number
          const digitsOnly = candidate.replace(/\D/g, '');
          if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            details.phone = candidate;
            notify('phone');
            break;
          }
        }
      }
    }
  }

  // ── Website ──
  const websiteSelectors = [
    'a[data-item-id="authority"]',
    'a[data-value*="Web"]',
    'a[aria-label*="web"]',
    'a[aria-label*="internet"]',
    'a[jsaction*="authority"]',
    'button[aria-label*="Web sitesi"]',
    '[data-item-id="authority"] a',
    '.IT5zAf',
    // New Google Maps selectors
    'a[href*="http"]:not([href*="google.com"])',
    'button[jsaction*="authority"]',
    'div.fontBodyMedium a[href]',
    'a[aria-label*="site"]',
  ];
  for (const selector of websiteSelectors) {
    const el = scope.querySelector(selector) as HTMLElement;
    if (el) {
      const href = (el as any).href || el.getAttribute('href') || el.closest('a')?.href;
      if (href && !href.includes("google.com/maps") && !href.includes("google.com/search") && href.startsWith('http')) {
        details.website = href;
        notify('website');
        break;
      }
      const text = el.textContent?.trim();
      if (text && (text.includes('.com') || text.includes('.net') || text.includes('.org') || text.includes('.tr') || text.includes('.co'))) {
        details.website = text.startsWith('http') ? text : `http://${text}`;
        notify('website');
        break;
      }
    }
  }

  // Text-based website fallback
  if (!details.website) {
    const mainElement = scope.querySelector('[role="main"]') || (scope instanceof Document ? scope.body : scope);
    if (mainElement) {
      const allText = mainElement.textContent || "";
      const urlPattern = /(https?:\/\/[^\s]+(?:\.com|\.net|\.org|\.tr|\.co)[^\s]*)/i;
      const urlMatch = allText.match(urlPattern);
      if (urlMatch && !urlMatch[0].includes("google.com/maps")) {
        details.website = urlMatch[0];
        notify('website');
      }
    }
  }

  // ── Address ──
  const addressSelectors = [
    'button[data-item-id="address"] .Io6YTe',
    'button[data-item-id="address"] .rogA2c',
    'button[aria-label*="Adres"] .Io6YTe',
    'button[aria-label*="Address"] .Io6YTe',
    'button[data-tooltip*="Adres"] .Io6YTe',
    'button[data-tooltip*="Address"] .Io6YTe',
    '.CsEnBe',
    'button[data-item-id="address"]'
  ];
  for (const selector of addressSelectors) {
    const el = scope.querySelector(selector);
    if (el && el.textContent?.trim()) {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 5 && /\d/.test(text)) {
        details.address = text;
        notify('address');
        break;
      }
    }
  }

  if (!details.address) {
    const addrBtn = scope.querySelector('button[data-item-id="address"]');
    const ariaLabel = addrBtn?.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.includes(':')) {
        details.address = ariaLabel.split(':')[1].trim().replace(/\s+/g, ' ');
        notify('address');
    }
  }

  // Category notification
  const categorySelectors = [
    'button[jsaction*="category"]',
    '.fontBodyMedium [jsaction*="category"]',
    'span[role="img"] + div .fontBodyMedium',
    '.DkEaL',
    'span.u609uc'
  ];
  for (const selector of categorySelectors) {
    const el = scope.querySelector(selector);
    if (el && el.textContent?.trim() && !el.textContent.includes('·')) {
      details.category = el.textContent.trim().replace(/\s+/g, ' ');
      // Optional: notify('category');
      break;
    }
  }

  // ── Service Options ──
  details.serviceOptions = extractServiceOptions();
  if (details.serviceOptions && details.serviceOptions.length > 0) notify('services');

  return details;
}

function extractOpeningHours(): OpeningHours | undefined {
  const hours: OpeningHours = {};

  // Method 1: Look for the hours table (expanded)
  const hoursTable = document.querySelector("table.eK4R0e, table.WgFkxc, .y07Mff, .t390nd");
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
    'button[data-item-id="oh"], button[aria-label*="saat"], button[aria-label*="hour"], .OqCZI'
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
    '.OqCZI tr, div[aria-label*="Çalışma saatleri"] tr, .t390nd tr'
  );
  dayRows.forEach((row) => {
    const dayEl = row.querySelector(".ylH6lf, .y07Mff");
    const timeEl = row.querySelector(".mxowUb, .mxowUb");
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
    'div.LTs0Rc div.E0DTEd, li.hpLkke span, .Yf6Ybe'
  );
  serviceItems.forEach((item) => {
    const text = item.textContent?.trim();
    if (text && text.length < 50 && text.length > 2) {
      options.push(text);
    }
  });

  // Also check for the service options grid (Paket servis, İç mekan yemek, etc.)
  if (options.length === 0) {
    const optionCards = document.querySelectorAll(
      'div[class*="m6QErb"] div.P2UJoe, .HBy37b'
    );
    optionCards.forEach((card) => {
      const label = card.querySelector("span")?.textContent?.trim();
      if (label) options.push(label);
    });
  }

  return [...new Set(options)]; // Return unique options
}

async function goBackToList(): Promise<void> {
  // Method 1: Press Escape to close the side panel (most reliable in Google Maps)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await sleep(100);
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
  await sleep(400);
  if (await tryWaitForFeed()) return;

  // Method 2: Click the close/X button
  const closeButton = document.querySelector(
    'button[aria-label="Close"], button[aria-label="Kapat"]'
  );
  if (closeButton) {
    (closeButton as HTMLElement).click();
    await sleep(400);
    if (await tryWaitForFeed()) return;
  }

  // Method 3: Click the back button
  const backButton = document.querySelector(
    'button[jsaction*="back"], button[aria-label="Geri"], button[aria-label="Back"], button.VfPpkd-icon-LgbsSe.kCyAyd'
  );
  if (backButton) {
    (backButton as HTMLElement).click();
    await sleep(400);
    if (await tryWaitForFeed()) return;
  }

  // Method 4: Use history back as last resort
  history.back();
  await sleep(600);
  await tryWaitForFeed();
}

async function tryWaitForFeed(): Promise<boolean> {
  const maxWait = 5000;
  const interval = 200; // Faster polling
  let waited = 0;

  while (waited < maxWait) {
    const feed = document.querySelector('div[role="feed"]');
    if (feed && feed.children.length > 1) return true; // length > 1 because 1 child might be a header
    await sleep(interval);
    waited += interval;
  }
  return false;
}

// ─── Scrolling ──────────────────────────────────────────────────────

async function scrollToLoadMore(): Promise<boolean> {
  // Try multiple common scroll container selectors for Google Maps
  const scrollContainer = 
    document.querySelector('div[role="feed"]') || 
    document.querySelector('div[aria-label^="Results"]') ||
    document.querySelector('div[aria-label^="Sonuçlar"]') ||
    document.querySelector('.m6QErb.DByuAd.ecceSd[role="region"]');
    
  if (!scrollContainer) {
    // Fallback: search for any element with overflow-y: auto/scroll that contains articles
    const allDivs = Array.from(document.querySelectorAll('div'));
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.querySelector('div[role="article"]')) {
        return performScroll(div as HTMLElement);
      }
    }
    return false;
  }

  return performScroll(scrollContainer as HTMLElement);
}

async function performScroll(scrollContainer: HTMLElement): Promise<boolean> {
  const previousHeight = scrollContainer.scrollHeight;
  const currentScrollTop = scrollContainer.scrollTop;
  
  // Scroll down
  scrollContainer.scrollBy(0, 1200);

  // Dynamic wait for height change
  let waited = 0;
  const pollInterval = 400;
  const maxPoll = 3000;

  while (waited < maxPoll) {
    await sleep(pollInterval);
    waited += pollInterval;
    if (scrollContainer.scrollHeight > previousHeight) return true;
  }

  // If height didn't change, check if we can still scroll more
  if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 50) {
      // Check for "End of list" indicators
      const endOfListIndicators = [
        ".HlvSq", // Standard end of list
        ".PbZDve", // "You've reached the end"
      ];
      
      const isEnd = endOfListIndicators.some(sel => !!document.querySelector(sel));
      
      // Text based check for Turkish/English end messages
      const spans = Array.from(document.querySelectorAll('span'));
      const hasEndText = spans.some(s => {
          const t = s.textContent?.toLowerCase() || "";
          return t.includes('sonuna ulaştınız') || t.includes('reached the end');
      });
      
      if (isEnd || hasEndText) return false;
  }

  // One last try with a larger scroll
  scrollContainer.scrollBy(0, 1500);
  await sleep(1500);
  
  return scrollContainer.scrollHeight > previousHeight || scrollContainer.scrollTop > currentScrollTop;
}

// ─── Utility ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
