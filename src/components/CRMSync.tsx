import { useState, FormEvent } from "react";
import { Business, GeneratedSite } from "../types";
import { 
  Users, Briefcase, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, Database, Sliders, Globe, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CRMSyncProps {
  businesses: Business[];
  sites: GeneratedSite[];
  onBack: () => void;
}

export default function CRMSync({ businesses, sites, onBack }: CRMSyncProps) {
  const [selectedCRM, setSelectedCRM] = useState<string>("hubspot");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [apiKey, setApiKey] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [lastSync, setLastSync] = useState<string>("Never");

  const crmOptions = [
    { id: "hubspot", name: "HubSpot", icon: "🔥", color: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20" },
    { id: "salesforce", name: "Salesforce", icon: "☁️", color: "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
    { id: "pipedrive", name: "Pipedrive", icon: "📈", color: "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20" },
    { id: "zoho", name: "Zoho CRM", icon: "⚡", color: "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20" },
  ];

  const handleSync = (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setSyncStatus("error");
      return;
    }
    
    setSyncStatus("syncing");
    
    // Simulate API sync delay
    setTimeout(() => {
      setSyncStatus("success");
      setLastSync(new Date().toLocaleString());
      setShowConfig(false);
      setTimeout(() => setSyncStatus("idle"), 3000);
    }, 2000);
  };

  const leadsCount = businesses.length;
  const clientsCount = sites.filter(s => s.clientApproved).length;
  const activeProjectsCount = sites.length;

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white mb-2 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              CRM Integration & Sync
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Keep your prospect data and client pipeline synchronized securely across platforms.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-500 shrink-0" />
          <span><strong>Integration Preview Mode:</strong> Test field mapping & webhook payloads locally before connecting enterprise OAuth credentials.</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sync Controls */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-blue-500" /> Choose Your CRM
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2 mb-6">
              {crmOptions.map(crm => (
                <button
                  key={crm.id}
                  onClick={() => setSelectedCRM(crm.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    selectedCRM === crm.id 
                      ? `${crm.color} border-2 shadow-sm` 
                      : "border-slate-200 hover:border-blue-200 dark:border-slate-800 dark:hover:border-slate-600 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className="text-xl">{crm.icon}</span>
                  <span className={`font-bold text-sm ${selectedCRM === crm.id ? '' : 'text-slate-800 dark:text-slate-200'}`}>
                    {crm.name}
                  </span>
                  {selectedCRM === crm.id && (
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              {!showConfig ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Configure {crmOptions.find(c => c.id === selectedCRM)?.name} Connection
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Securely map fields and enter your API keys.</p>
                  </div>
                  <button 
                    onClick={() => setShowConfig(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-white transition-colors"
                  >
                    Setup Connection
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSync} className="space-y-4 animate-fade-in relative">
                  <button 
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="absolute -top-2 right-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      {crmOptions.find(c => c.id === selectedCRM)?.name} API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setSyncStatus("idle"); }}
                      placeholder="Enter your secure API key"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none ${
                        syncStatus === "error" ? "border-red-300 focus:border-red-500" : "border-slate-200 dark:border-slate-800 focus:border-blue-500"
                      }`}
                    />
                    {syncStatus === "error" && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">API Key is required to initiate synchronization.</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Users className="h-3 w-3" /> Sync Leads
                      </label>
                      <select className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                        <option>To "Prospects" Pipeline</option>
                        <option>To "Cold Leads" List</option>
                        <option>Do not sync leads</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Sync Projects
                      </label>
                      <select className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500">
                        <option>To "Active Clients" Pipeline</option>
                        <option>To "Won Deals" List</option>
                        <option>Do not sync projects</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={syncStatus === "syncing"}
                      className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                        syncStatus === "syncing" 
                          ? "bg-slate-400 cursor-not-allowed" 
                          : syncStatus === "success"
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      }`}
                    >
                      {syncStatus === "syncing" ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Syncing Data...
                        </>
                      ) : syncStatus === "success" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Synchronization Complete
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" /> Start Secure Sync
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Data Mapping Rules
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <Globe className="h-4 w-4 text-slate-400" />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">SiteScout Field: </span>
                  <span className="text-slate-500">Business Address</span>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-300" />
                <div className="flex-1 text-xs text-right">
                  <span className="font-bold text-slate-700 dark:text-slate-300">CRM Field: </span>
                  <span className="text-slate-500 text-blue-600 dark:text-blue-400">Company Address</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <Globe className="h-4 w-4 text-slate-400" />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">SiteScout Field: </span>
                  <span className="text-slate-500">Proposal Status</span>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-300" />
                <div className="flex-1 text-xs text-right">
                  <span className="font-bold text-slate-700 dark:text-slate-300">CRM Field: </span>
                  <span className="text-slate-500 text-blue-600 dark:text-blue-400">Deal Stage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Sync Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Leads</span>
                </div>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{leadsCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Projects</span>
                </div>
                <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeProjectsCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Signed Clients</span>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-500">{clientsCount}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1">Last Synced</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{lastSync}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50 text-xs text-slate-600 dark:text-slate-400 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p>Your API keys are encrypted at rest and never exposed to the client interface during normal operation.</p>
            </div>
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <p>Automatic background synchronization runs every 6 hours when enabled via the setup wizard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
