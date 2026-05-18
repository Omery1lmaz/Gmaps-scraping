import { globalStateMachine } from "../logic/StateMachine";
import type { Lead, ScraperSettings } from "../types";
import { API_BASE_URL, API_KEY } from "./config";

let currentSettings: ScraperSettings = { scrapeDetails: false };

const apiHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
  ...extra,
});

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === "GET_STATUS") {
    sendResponse(globalStateMachine.getStatus());
    return false;
  }

  if (message.type === "START_SCRAPING") {
    if (message.settings) {
      currentSettings = message.settings;
    }

    // Fetch existing external IDs first to skip duplicates
    fetch(`${API_BASE_URL}/api/leads/external-ids`, {
      headers: apiHeaders()
    })
    .then(res => res.json())
    .then(existingIds => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const tabId = activeTab?.id;
        const url = activeTab?.url || "";

        if (!url.includes("google.com/maps")) {
          globalStateMachine.transition("failed", { error: "Open Google Maps results first." });
          return;
        }

        if (tabId) {
          globalStateMachine.transition("scraping", { 
            leadsCount: 0, 
            pageIndex: 0, 
            lastLeads: [], 
            activity: "Starting scraper...", 
            detailProgress: undefined 
          });
          
          chrome.tabs.sendMessage(tabId, { 
            type: "START_SCRAPING_CMD", 
            scrapeDetails: currentSettings.scrapeDetails,
            customCategory: currentSettings.customCategory,
            existingIds: Array.isArray(existingIds) ? existingIds : []
          }, (_response) => {
            if (chrome.runtime.lastError) {
              globalStateMachine.transition("failed", { error: "Please refresh the Google Maps page." });
            }
          });
        }
      });
    })
    .catch(err => {
      console.error("Failed to fetch existing IDs:", err);
      // Proceed anyway, but without skipping
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { 
            type: "START_SCRAPING_CMD", 
            scrapeDetails: currentSettings.scrapeDetails,
            customCategory: currentSettings.customCategory,
            existingIds: []
          });
        }
      });
    });
    return false;
  }

  if (message.type === "STOP_SCRAPING") {
    globalStateMachine.transition("idle", { activity: "Stopped by user.", currentDetail: undefined });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: "STOP_SCRAPING_CMD" });
      }
    });
    return false;
  }

  if (message.type === "SYNC_LOCAL_DATA") {
    chrome.storage.local.get(["leads"], (result: { [key: string]: any }) => {
      const leads: Lead[] = result.leads || [];
      if (leads.length === 0) {
        sendResponse({ success: true, saved: 0, message: "No local leads to sync." });
        return;
      }

      fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(leads)
      })
      .then(res => res.json())
      .then(data => {
        globalStateMachine.updateProgress({ 
          activity: `Sync complete: ${data.saved} new, ${data.duplicates} skipped.`
        });
        sendResponse({ success: true, ...data });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    });
    return true; // Keep channel open for async fetch
  }

  if (message.type === "LEADS_FOUND") {
    const leads: Lead[] = message.payload;

    // Sync with backend API
    fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(leads)
    })
    .then(res => res.json())
    .then(data => {
      console.log('Sync successful:', data);
      globalStateMachine.updateProgress({ 
        activity: `Synced ${data.saved} new leads to cloud.`
      });
    })
    .catch(err => {
      console.error('Sync failed:', err);
      globalStateMachine.updateProgress({ 
        activity: `Local saved. Cloud sync failed.`
      });
    });

    chrome.storage.local.get(["leads"], (result: { [key: string]: any }) => {
      const existingLeads: Lead[] = result.leads || [];
      const updatedLeads = [...existingLeads, ...leads];
      chrome.storage.local.set({ leads: updatedLeads }, () => {
        globalStateMachine.updateProgress({ 
          leadsCount: updatedLeads.length,
          lastLeads: leads.slice(-5)
        });
      });
    });
    return false;
  }

  if (message.type === "LEAD_ENRICHED") {
    const enrichedLead: Lead = message.payload;

    // Update in local storage
    chrome.storage.local.get(["leads"], (result: { [key: string]: any }) => {
      const existingLeads: Lead[] = result.leads || [];
      const index = existingLeads.findIndex(l => l.id === enrichedLead.id);
      if (index >= 0) {
        existingLeads[index] = { ...existingLeads[index], ...enrichedLead };
      }
      chrome.storage.local.set({ leads: existingLeads });
    });

    // Sync enriched lead to backend
    fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify([enrichedLead])
    }).catch(err => console.error('Enrichment sync failed:', err));

    return false;
  }

  if (message.type === "DETAIL_PROGRESS") {
    globalStateMachine.updateProgress({
      detailProgress: message.payload,
      activity: `Detaylar alınıyor: ${message.payload.current}/${message.payload.total}`
    });
    return false;
  }

  if (message.type === "DETAIL_ACTIVITY") {
    globalStateMachine.updateProgress({
      currentDetail: message.payload
    });
    return false;
  }

  if (message.type === "DETAIL_LOG_ENTRY") {
    const entry = message.payload;
    const currentStatus = globalStateMachine.getStatus();
    const existingLog = currentStatus.detailLog || [];
    const updatedLog = [...existingLog, entry].slice(-50); // Keep last 50
    globalStateMachine.updateProgress({
      detailLog: updatedLog
    });
    return false;
  }

  if (message.type === "SCRAPING_COMPLETED") {
    globalStateMachine.transition("completed", { activity: "Scraping finished successfully!", detailProgress: undefined, currentDetail: undefined });
    return false;
  }

  if (message.type === "SCRAPING_PAUSED") {
    globalStateMachine.transition("paused", { activity: "Scraping paused." });
    return false;
  }
  if (message.type === "SCRAPING_RESUMED") {
    globalStateMachine.transition("scraping", { activity: "Scraping resumed." });
    return false;
  }
  if (message.type === "SCRAPING_FAILED") {
    globalStateMachine.transition("failed", { error: message.error, activity: "Scraping failed.", currentDetail: undefined });
    return false;
  }

  return false;
});

globalStateMachine.subscribe((status) => {
  chrome.runtime.sendMessage({ type: "STATUS_UPDATED", payload: status }).catch(() => {});
});
