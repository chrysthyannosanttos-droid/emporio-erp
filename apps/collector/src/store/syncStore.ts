import { create } from 'zustand';

interface SyncState {
  isOffline: boolean;
  pendingSync: any[];
  setOffline: (status: boolean) => void;
  addPendingSync: (data: any) => void;
  clearPendingSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOffline: false,
  pendingSync: [],
  setOffline: (status) => set({ isOffline: status }),
  addPendingSync: (data) => set((state) => ({ pendingSync: [...state.pendingSync, data] })),
  clearPendingSync: () => set({ pendingSync: [] }),
}));
