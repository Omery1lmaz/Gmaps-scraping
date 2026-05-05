import type { AppState, ScraperStatus } from "../types";

export class StateMachine {
  private status: ScraperStatus = {
    state: "idle",
    leadsCount: 0,
    pageIndex: 0,
  };

  private listeners: ((status: ScraperStatus) => void)[] = [];

  constructor() {}

  getStatus(): ScraperStatus {
    return { ...this.status };
  }

  transition(newState: AppState, updates?: Partial<Omit<ScraperStatus, "state">>) {
    console.log(`Transitioning from ${this.status.state} to ${newState}`);
    this.status = {
      ...this.status,
      ...updates,
      state: newState,
    };
    this.notify();
  }

  updateProgress(updates: Partial<Omit<ScraperStatus, "state">>) {
    this.status = {
      ...this.status,
      ...updates,
    };
    this.notify();
  }

  subscribe(listener: (status: ScraperStatus) => void) {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.status));
  }
}

export const globalStateMachine = new StateMachine();
