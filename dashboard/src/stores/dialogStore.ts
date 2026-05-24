import { create } from 'zustand';

type DialogOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

type PromptOptions = {
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
};

interface DialogState {
  confirmDialog: DialogOptions | null;
  promptDialog: PromptOptions | null;
  openConfirm: (options: DialogOptions) => void;
  openPrompt: (options: PromptOptions) => void;
  closeConfirm: () => void;
  closePrompt: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  confirmDialog: null,
  promptDialog: null,
  openConfirm: (options) => set({ confirmDialog: options }),
  openPrompt: (options) => set({ promptDialog: options }),
  closeConfirm: () => set({ confirmDialog: null }),
  closePrompt: () => set({ promptDialog: null }),
}));
