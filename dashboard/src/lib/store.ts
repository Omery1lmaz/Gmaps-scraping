import { create } from 'zustand';

interface UIState {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedLeadId: null,
  setSelectedLeadId: (id) => set({ selectedLeadId: id, isDrawerOpen: !!id }),
  isDrawerOpen: false,
  setDrawerOpen: (open) => set({ isDrawerOpen: open, selectedLeadId: open ? undefined : null }),
}));
