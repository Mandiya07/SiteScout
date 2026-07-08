import React, { useState, useMemo } from 'react';
import { Search, MapPin, HeartCrack, ArrowRight, Filter, AlertCircle, Building2 } from 'lucide-react';
import { Business, SearchFilters } from '../types';

interface BusinessFinderProps {
  businesses: Business[];
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
  onAnalyze: (business: Business) => void;
}

const CATEGORIES = [
  "Restaurants", "Plumbers", "Schools", "Churches", "Lawyers", 
  "Doctors", "Mechanics", "Beauty salons", "Construction companies", 
  "Hotels", "Real estate", "Funeral parlours", "Retail shops", 
  "Auto repair", "Cleaning companies"
];

export default function BusinessFinder({ businesses, loading, onSearch, onAnalyze }: BusinessFinderProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    country: 'USA',
    city: 'Austin',
    town: '',
    category: 'Plumbers',
    keywords: '',
    radius: '5'
  });

  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [filterWeakPresence, setFilterWeakPresence] = useState(false);
  const [sortOrder, setSortOrder] = useState<'rating_asc' | 'rating_desc'>('rating_desc');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const filteredAndSortedBusinesses = useMemo(() => {
    let result = [...businesses];

    if (filterNoWebsite) {
      result = result.filter(b => !b.presence.hasWebsite);
    }

    if (filterWeakPresence) {
      result = result.filter(b => 
        b.presence.googleProfileQuality === 'poor' || 
        b.presence.facebookStatus === 'none' ||
        b.presence.reviewCountStatus === 'few'
      );
    }

    result.sort((a, b) => {
      if (sortOrder === 'rating_asc') return a.rating - b.rating;
      return b.rating - a.rating;
    });

    return result;
  }, [businesses, filterNoWebsite, filterWeakPresence, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-400">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Business Search Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">Find leads lacking digital presence to offer web solutions.</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Country</label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., USA, UK"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Austin"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Town / Area (Optional)</label>
              <input
                type="text"
                value={filters.town}
                onChange={(e) => setFilters(f => ({ ...f, town: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Downtown"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Keywords (Optional)</label>
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => setFilters(f => ({ ...f, keywords: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., emergency, 24/7"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Radius (km)</label>
              <input
                type="number"
                value={filters.radius}
                onChange={(e) => setFilters(f => ({ ...f, radius: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                min="1" max="100"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 px-6 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Scan Directory
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Table & Filters */}
      {businesses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Results Found ({filteredAndSortedBusinesses.length})</h3>
              <p className="text-xs text-slate-500">Filter and analyze prospective clients.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterNoWebsite} 
                  onChange={(e) => setFilterNoWebsite(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Website</span>
              </label>
              
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterWeakPresence} 
                  onChange={(e) => setFilterWeakPresence(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Weak Presence</span>
              </label>

              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="rating_desc">Highest Rated</option>
                <option value="rating_asc">Lowest Rated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reviews & Rating</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedBusinesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{biz.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {biz.address.split(',')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {!biz.presence.hasWebsite && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 uppercase dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800">
                            No Website
                          </span>
                        )}
                        {!biz.presence.hasEmail && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                            No Email
                          </span>
                        )}
                        {biz.presence.facebookStatus === 'none' && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            No FB
                          </span>
                        )}
                         {biz.presence.reviewCountStatus === 'few' && (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-700 uppercase dark:bg-orange-900/30 dark:text-orange-400 border border-orange-100 dark:border-orange-800">
                            Few Reviews
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 text-[10px]">{"★".repeat(Math.round(biz.rating))}</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{biz.rating}</span>
                        <span className="text-[10px] text-slate-500">({biz.reviewsCount})</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onAnalyze(biz)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                      >
                        Analyze <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredAndSortedBusinesses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-semibold">No businesses found matching criteria.</p>
                      <p className="text-xs mt-1">Try adjusting your search filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
