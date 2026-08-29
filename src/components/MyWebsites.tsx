import { useState } from "react";
import { GeneratedSite, Business } from "../types";
import { 
  Globe, ExternalLink, Edit3, MessageSquare, FileText, 
  Trash2, QrCode, Copy, Check, Sparkles, Share2, Eye, ShieldCheck, Clock
} from "lucide-react";

interface MyWebsitesProps {
  sites: GeneratedSite[];
  onEditSite: (site: GeneratedSite) => void;
  onOpenPreview: (site: GeneratedSite) => void;
  onOpenSalesAssistant: (site: GeneratedSite) => void;
  onOpenProposal: (site: GeneratedSite) => void;
  onDeleteSite: (siteId: string) => void;
  onCreateNewPreview: () => void;
}

export default function MyWebsites({
  sites,
  onEditSite,
  onOpenPreview,
  onOpenSalesAssistant,
  onOpenProposal,
  onDeleteSite,
  onCreateNewPreview
}: MyWebsitesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredSites = sites.filter(s => 
    s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyLink = (site: GeneratedSite) => {
    const origin = window.location.origin;
    const url = `${origin}/preview/${site.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(site.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            My Generated Websites & Previews
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage interactive live previews ready to share with business owners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search websites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-64"
          />

          <button
            onClick={onCreateNewPreview}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate New</span>
          </button>
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Globe className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No website previews created yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Find a business without a website in the Business Finder and click "Generate Website" to build your first live client preview.
          </p>
          <button
            onClick={onCreateNewPreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Find Businesses to Pitch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSites.map((site) => {
            const previewUrl = `${window.location.origin}/preview/${site.id}`;
            const isCopied = copiedId === site.id;

            return (
              <div
                key={site.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Color Header Banner */}
                  <div 
                    className="h-20 w-full p-4 flex items-start justify-between relative overflow-hidden"
                    style={{ backgroundColor: site.primaryColor || "#2563eb" }}
                  >
                    <div className="text-white">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded backdrop-blur-sm">
                        {site.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1 drop-shadow-sm line-clamp-1">
                        {site.businessName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[11px] text-white font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <p className="line-clamp-2">{site.hero?.subtitle || site.about?.mission || "Professional website preview."}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Services listed:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{site.services?.length || 3} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>WhatsApp CTA:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Live link:</span>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 truncate max-w-[170px]">/preview/{site.id.slice(0, 10)}...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 pt-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenPreview(site)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Live Preview</span>
                    </button>

                    <button
                      onClick={() => onEditSite(site)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Quick Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => handleCopyLink(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Copy Shareable Preview Link"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? "Copied" : "Copy Link"}</span>
                    </button>

                    <button
                      onClick={() => onOpenSalesAssistant(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors"
                      title="Generate sales outreach messages"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Pitch</span>
                    </button>

                    <button
                      onClick={() => onOpenProposal(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors"
                      title="Create quotation / proposal"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Proposal</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
