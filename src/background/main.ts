import { globalStateMachine } from "../logic/StateMachine";
import type { Lead, ScraperSettings } from "../types";
import { API_BASE_URL } from "./config";

let currentSettings: ScraperSettings = { scrapeDetails: false };

const apiHeaders = (token: string, extra: Record<string, string> = {}): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  ...extra,
});

const getAuthToken = () => new Promise<string | null>((resolve) => {
  chrome.storage.local.get(["authToken"], (result: { [key: string]: any }) => {
    resolve(result.authToken || null);
  });
});

const getAuthData = () => new Promise<{ token: string | null; user: any | null }>((resolve) => {
  chrome.storage.local.get(["authToken", "authUser"], (result: { [key: string]: any }) => {
    resolve({
      token: result.authToken || null,
      user: result.authUser || null
    });
  });
});

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === "GET_STATUS") {
    sendResponse(globalStateMachine.getStatus());
    return false;
  }

  if (message.type === "GET_AUTH") {
    chrome.storage.local.get(["authToken", "authUser"], (result: { [key: string]: any }) => {
      sendResponse({ token: result.authToken || null, user: result.authUser || null });
    });
    return true;
  }

  if (message.type === "AUTH_LOGIN") {
    fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: message.email, password: message.password }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        chrome.storage.local.set({ authToken: data.token, authUser: data.user }, () => {
          sendResponse({ success: true, user: data.user });
        });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "AUTH_LOGOUT") {
    chrome.storage.local.remove(["authToken", "authUser"], () => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "START_SCRAPING") {
    if (message.settings) {
      currentSettings = message.settings;
    }

    // Fetch existing external IDs first to skip duplicates and read current plan details
    getAuthData().then(({ token, user }) => {
      if (!token) throw new Error("Please login before scraping.");
      
      const userPlan = user?.plan || 'free';
      const userSubStatus = user?.subscriptionStatus || 'active';

      return fetch(`${API_BASE_URL}/api/leads/external-ids`, {
        headers: apiHeaders(token)
      })
      .then(res => res.json())
      .then(existingIds => ({ existingIds, userPlan, userSubStatus }));
    })
    .then(({ existingIds, userPlan, userSubStatus }) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const tabId = activeTab?.id;

        if (!tabId) {
          globalStateMachine.transition("failed", { error: "No active browser tab found." });
          return;
        }

        const executeScrapeFlow = (targetTabId: number, leadsDbIds: any[]) => {
          globalStateMachine.transition("scraping", { 
            leadsCount: 0, 
            pageIndex: 0, 
            lastLeads: [], 
            activity: "Scraper is starting...", 
            detailProgress: undefined 
          });

          // Check if user entered search criteria
          if (currentSettings.searchKeyword) {
            const keyword = currentSettings.searchKeyword;
            const city = currentSettings.searchCity || "";
            const country = currentSettings.searchCountry || "";
            
            const queryParts = [keyword];
            if (city) queryParts.push(city);
            if (country) queryParts.push(country);
            
            const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(queryParts.join(' '))}`;

            globalStateMachine.updateProgress({ activity: "Navigating to Google Maps search..." });

            chrome.tabs.update(targetTabId, { url: searchUrl }, (tab) => {
              if (!tab) {
                globalStateMachine.transition("failed", { error: "Could not navigate to search URL." });
                return;
              }

              const onTabUpdated = (tabIdUpdated: number, changeInfo: any) => {
                if (tabIdUpdated === targetTabId && changeInfo.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(onTabUpdated);
                  
                  globalStateMachine.updateProgress({ activity: "Waiting for Maps feed to load..." });
                  
                  setTimeout(() => {
                    chrome.tabs.sendMessage(targetTabId, { 
                      type: "START_SCRAPING_CMD", 
                      scrapeDetails: currentSettings.scrapeDetails,
                      customCategory: currentSettings.customCategory,
                      defaultCity: currentSettings.defaultCity,
                      defaultCountry: currentSettings.defaultCountry,
                      existingIds: Array.isArray(leadsDbIds) ? leadsDbIds : [],
                      plan: userPlan,
                      subscriptionStatus: userSubStatus
                    }, (_response) => {
                      if (chrome.runtime.lastError) {
                        globalStateMachine.transition("failed", { error: "Failed to initialize content scraper. Refresh and try again." });
                      }
                    });
                  }, 3000); // Wait 3 seconds for Google Maps client-side components to render fully
                }
              };

              chrome.tabs.onUpdated.addListener(onTabUpdated);
            });
          } else {
            // Legacy / Default behavior: scrape existing active maps results tab
            chrome.tabs.get(targetTabId, (tab) => {
              const url = tab?.url || "";
              if (!url.includes("google.com/maps")) {
                globalStateMachine.transition("failed", { error: "Open Google Maps results first or enter search criteria." });
                return;
              }

              chrome.tabs.sendMessage(targetTabId, { 
                type: "START_SCRAPING_CMD", 
                scrapeDetails: currentSettings.scrapeDetails,
                customCategory: currentSettings.customCategory,
                defaultCity: currentSettings.defaultCity,
                defaultCountry: currentSettings.defaultCountry,
                existingIds: Array.isArray(leadsDbIds) ? leadsDbIds : [],
                plan: userPlan,
                subscriptionStatus: userSubStatus
              }, (_response) => {
                if (chrome.runtime.lastError) {
                  globalStateMachine.transition("failed", { error: "Please refresh the Google Maps page." });
                }
              });
            });
          }
        };

        executeScrapeFlow(tabId, existingIds);
      });
    })
    .catch(err => {
      console.error("Failed to fetch existing IDs:", err);
      if (String(err?.message || '').includes('login')) {
        globalStateMachine.transition("failed", { error: "Please login before scraping." });
        return;
      }
      // Proceed without deduplication
      getAuthData().then(({ user }) => {
        const userPlan = user?.plan || 'free';
        const userSubStatus = user?.subscriptionStatus || 'active';
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { 
              type: "START_SCRAPING_CMD", 
              scrapeDetails: currentSettings.scrapeDetails,
              customCategory: currentSettings.customCategory,
              existingIds: [],
              plan: userPlan,
              subscriptionStatus: userSubStatus
            });
          }
        });
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

      getAuthToken().then((token) => {
        if (!token) throw new Error("Not authenticated");
        return fetch(`${API_BASE_URL}/api/leads`, {
          method: 'POST',
          headers: apiHeaders(token),
          body: JSON.stringify(leads)
        });
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
    getAuthToken().then((token) => {
      if (!token) throw new Error("Not authenticated");
      return fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: apiHeaders(token),
      body: JSON.stringify(leads)
      });
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
    getAuthToken().then((token) => {
      if (!token) throw new Error("Not authenticated");
      return fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: apiHeaders(token),
      body: JSON.stringify([enrichedLead])
      });
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
