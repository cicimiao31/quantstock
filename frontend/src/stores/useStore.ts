import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StockQuote } from "@/lib/api";

interface WatchItem {
  code: string;
  name: string;
  position: number;
}

interface AppState {
  watchlist: WatchItem[];
  quotes: Record<string, StockQuote>;
  darkMode: boolean;
  addToWatchlist: (code: string, name: string) => void;
  removeFromWatchlist: (code: string) => void;
  reorderWatchlist: (items: WatchItem[]) => void;
  updateQuotes: (quotes: StockQuote[]) => void;
  toggleDarkMode: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      watchlist: [],
      quotes: {},
      darkMode: false,

      addToWatchlist: (code, name) =>
        set((state) => {
          if (state.watchlist.length >= 9) return state;
          if (state.watchlist.some((w) => w.code === code)) return state;
          return {
            watchlist: [...state.watchlist, { code, name, position: state.watchlist.length }],
          };
        }),

      removeFromWatchlist: (code) =>
        set((state) => ({
          watchlist: state.watchlist
            .filter((w) => w.code !== code)
            .map((w, i) => ({ ...w, position: i })),
        })),

      reorderWatchlist: (items) => set({ watchlist: items }),

      updateQuotes: (quotes) =>
        set((state) => {
          const updated = { ...state.quotes };
          for (const q of quotes) {
            updated[q.code] = q;
          }
          return { quotes: updated };
        }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "quantstock-store",
      partialize: (state) => ({
        watchlist: state.watchlist,
        darkMode: state.darkMode,
      }),
    }
  )
);
