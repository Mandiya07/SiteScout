import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Trash2, Globe, Clock, MapPin } from 'lucide-react';

export interface SearchHistoryItem {
  id: string;
  category: string;
  city: string;
  country: string;
  keywords?: string;
  resultCount: number;
  timestamp: string;
  source: string;
}

interface SearchHistorySidebarProps {
  onReExecuteSearch: (filters: { category: string; city: string; country: string; keywords?: string }) => void;
  currentFilters?: { category: string; city: string; country: string; keywords?: string };
}

const STORAGE_KEY = 'sitescout_search_history_v1';
const MAX_HISTORY_ITEMS = 5;

export function addSearchHistoryItem(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    let history: SearchHistoryItem[] = existingRaw ? JSON.parse(existingRaw) : [];

    // Ensure no synthetic/demo queries are added
    if (item.category?.toLowerCase().includes('demo') || item.city?.toLowerCase().includes('demo')) {
      return;
    }

    const newItem: SearchHistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...item,
      timestamp: new Date().toISOString()
    };

    // Deduplicate identical active queries (same category, city, country)
    history = history.filter(h => 
      !(h.category.toLowerCase() === newItem.category.toLowerCase() &&
        h.city.toLowerCase() === newItem.city.toLowerCase() &&
        (h.country || '').toLowerCase() === (newItem.country || '').toLowerCase())
    );

    // Prepend new item and keep only last 5
    history.unshift(newItem);
    history = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.warn("Failed to update search history in localStorage:", err);
  }
}

export const SearchHistorySidebar: React.FC<SearchHistorySidebarProps> = ({
  onReExecuteSearch,
  currentFilters
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out any mock/synthetic entries just in case
          const clean = parsed.filter(h => !h.category?.toLowerCase().includes('demo') && h.resultCount > 0);
          setHistory(clean.slice(0, MAX_HISTORY_ITEMS));
        }
      }
    } catch (err) {
      console.warn("Failed to load search history:", err);
    }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (err) {
      console.warn("Failed to clear history:", err);
    }
  };

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Recent Live Searches
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
          No recent search history yet. Execute a live directory search to populate your quick-access queries.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Recent Live Searches (Last {history.length})
          </h3>
        </div>
        <button
          onClick={clearHistory}
          className="text-[10px] font-semibold text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          title="Clear search history"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item) => {
          const isCurrent = currentFilters && 
            currentFilters.category.toLowerCase() === item.category.toLowerCase() &&
            currentFilters.city.toLowerCase() === item.city.toLowerCase();

          const timeAgo = (() => {
            try {
              const diffMin = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              if (diffMin < 1) return 'Just now';
              if (diffMin < 60) return `${diffMin}m ago`;
              const diffHr = Math.floor(diffMin / 60);
              if (diffHr < 24) return `${diffHr}h ago`;
              return `${Math.floor(diffHr / 24)}d ago`;
            } catch {
              return 'Recently';
            }
          })();

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isCurrent
                  ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40'
                  : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold shrink-0">
                    {item.resultCount} found
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    {item.city}{item.country ? `, ${item.country}` : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 shrink-0 text-[10px]">
                    <Clock className="h-2.5 w-2.5 text-slate-400" />
                    {timeAgo}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onReExecuteSearch({
                    category: item.category,
                    city: item.city,
                    country: item.country,
                    keywords: item.keywords
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Re-execute this live search"
              >
                <RefreshCw className="h-3 w-3" /> Re-run
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
