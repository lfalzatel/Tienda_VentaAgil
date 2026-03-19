import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartTab {
  id: string;
  name: string; // e.g., "1", "2", or "Juan Perez"
  clientId?: string;
  clientName?: string;
  items: CartItem[];
}

interface CartStore {
  tabs: CartTab[];
  activeTabId: string;
  tabCounter: number; // to generate new sequential names easily

  // Tab Management
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setTabClient: (tabId: string, clientId: string, clientName: string) => void;
  
  // Cart Management (applies to active tab)
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Getters (applies to active tab)
  items: CartItem[]; // Virtual property for backward compatibility where possible, or we can just access via active tab
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      tabs: [{ id: "tab-1", name: "", items: [] }],
      activeTabId: "tab-1",
      tabCounter: 0,

      // -- Tab Management --
      addTab: () => {
        set((state) => {
          const newCounter = state.tabCounter + 1;
          const newTabId = `tab-${Date.now()}`;
          return {
            tabCounter: newCounter,
            tabs: [...state.tabs, { id: newTabId, name: newCounter.toString(), items: [] }],
            activeTabId: newTabId
          };
        });
      },
      removeTab: (id) => {
        set((state) => {
          const currentTabs = state.tabs;
          if (currentTabs.length <= 1) {
             // If we close the last tab, reset to default icon-only tab
             const freshId = `tab-${Date.now()}`;
             return {
               tabCounter: 0,
               tabs: [{ id: freshId, name: "", items: [] }],
               activeTabId: freshId
             };
          }
          const activeIndex = currentTabs.findIndex(t => t.id === state.activeTabId);
          const newTabs = currentTabs.filter(t => t.id !== id);
          
          let nextActiveId = state.activeTabId;
          // If closing the active tab, pick another one
          if (id === state.activeTabId) {
            // Pick the one before it, or if it was first, pick the new first
            const nextIndex = Math.max(0, activeIndex - 1);
            nextActiveId = newTabs[nextIndex]?.id || newTabs[0].id;
          }

          return {
            tabs: newTabs,
            activeTabId: nextActiveId
          };
        });
      },
      setActiveTab: (id) => {
        set({ activeTabId: id });
      },
      setTabClient: (tabId, clientId, clientName) => {
        set((state) => ({
          tabs: state.tabs.map(tab => 
            tab.id === tabId 
              ? { ...tab, clientId, clientName, name: clientName } // Update name to clientName
              : tab
          )
        }));
      },

      // -- Cart Management --
      get items() {
        // Returns items for the currently active tab
        const state = get();
        return state.tabs.find(t => t.id === state.activeTabId)?.items || [];
      },
      addItem: (newItem) => {
        set((state) => {
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (!activeTab) return state;

          const existingItem = activeTab.items.find((item) => item.id === newItem.id);
          let newItems;
          if (existingItem) {
            newItems = activeTab.items.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            );
          } else {
            newItems = [...activeTab.items, newItem];
          }

          return {
            tabs: state.tabs.map(tab => 
              tab.id === state.activeTabId ? { ...tab, items: newItems } : tab
            )
          };
        });
      },
      removeItem: (id) => {
        set((state) => {
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (!activeTab) return state;

          const newItems = activeTab.items.filter((item) => item.id !== id);
          return {
            tabs: state.tabs.map(tab => 
              tab.id === state.activeTabId ? { ...tab, items: newItems } : tab
            )
          };
        });
      },
      updateQuantity: (id, quantity) => {
        set((state) => {
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (!activeTab) return state;

          const newItems = activeTab.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
          );
          return {
            tabs: state.tabs.map(tab => 
              tab.id === state.activeTabId ? { ...tab, items: newItems } : tab
            )
          };
        });
      },
      clearCart: () => {
        set((state) => {
          return {
            tabs: state.tabs.map(tab => 
              tab.id === state.activeTabId ? { ...tab, items: [] } : tab
            )
          };
        });
      },
      getTotal: () => {
        const state = get();
        const activeTab = state.tabs.find(t => t.id === state.activeTabId);
        if (!activeTab) return 0;
        return activeTab.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
      getItemCount: () => {
        const state = get();
        const activeTab = state.tabs.find(t => t.id === state.activeTabId);
        if (!activeTab) return 0;
        return activeTab.items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: "cart-storage-v2", // Updated persist name to prevent hydration crashes from v1
    }
  )
);
