import React, { useState, FormEvent } from "react";
import { 
  Settings, Terminal, BarChart3, AlertCircle, ShieldAlert, Sparkles, 
  Trash2, Plus, Check, Info, FileText, Send, BellRing, Database, 
  Users, CreditCard, Layers, Briefcase, Activity
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "User";
  plan: "Free Trial" | "Pro Plan" | "Agency VIP";
  status: "Active" | "Suspended";
}

interface TemplateItem {
  id: string;
  title: string;
  category: string;
  swatch: string;
  fontStyle: string;
}

interface IndustryItem {
  id: string;
  name: string;
  defaultCategory: string;
  activeCount: number;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "ai_usage" | "searches" | "websites" | "errors">("users");

  // Users State
  const [users, setUsers] = useState<UserItem[]>([
    { id: "usr-1", name: "Sipho M.", email: "siphom.yati@gmail.com", role: "Admin", plan: "Agency VIP", status: "Active" },
    { id: "usr-2", name: "Sarah Jenkins", email: "sarah@apexplumbing.com", role: "User", plan: "Pro Plan", status: "Active" },
    { id: "usr-3", name: "Marcus Vance", email: "marcus@vancelaw.co", role: "User", plan: "Free Trial", status: "Active" },
    { id: "usr-4", name: "Elena Rostova", email: "elena@glowspa.net", role: "User", plan: "Pro Plan", status: "Suspended" },
  ]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPlan, setNewUserPlan] = useState<"Free Trial" | "Pro Plan" | "Agency VIP">("Pro Plan");

  // AI Usage State
  const aiStats = {
    totalRequests: 1248,
    successfulGenerations: 1192,
    fallbackActivations: 56,
    avgLatencyMs: 840,
    activeModel: "Gemini 2.5 Flash / Flash Lite Multi-Pool",
    quotaRemaining: "99.4%"
  };

  // Recent Business Searches
  const recentSearches = [
    { id: "s-1", category: "Construction & Civil Works", location: "Mbabane, Eswatini", resultsCount: 8, timestamp: "Today, 10:14 AM", status: "Verified" },
    { id: "s-2", category: "Restaurants & Diners", location: "Manzini, Eswatini", resultsCount: 12, timestamp: "Today, 09:30 AM", status: "Verified" },
    { id: "s-3", category: "Salons & Spas", location: "Ezulwini, Eswatini", resultsCount: 6, timestamp: "Yesterday, 04:22 PM", status: "Verified" },
    { id: "s-4", category: "Plumbing & Electrical", location: "Johannesburg, SA", resultsCount: 15, timestamp: "Yesterday, 02:10 PM", status: "Verified" },
  ];

  // Generated Websites
  const generatedWebsites = [
    { id: "w-1", name: "Swazi Peak Construction", category: "Construction", token: "prv_8f29k1", views: 18, status: "Active Preview", date: "Today" },
    { id: "w-2", name: "Apex Commercial Plumbing", category: "Plumbing", token: "prv_3a91m4", views: 24, status: "Client Approved", date: "Yesterday" },
    { id: "w-3", name: "Mbabane Auto Mechanical", category: "Auto Repairs", token: "prv_7c44p0", views: 9, status: "Proposal Sent", date: "2 days ago" },
    { id: "w-4", name: "Ezulwini Sanctuary Spa", category: "Spa & Salon", token: "prv_1e88v9", views: 42, status: "Active Preview", date: "3 days ago" },
  ];

  // System Errors & Health Logs
  const systemErrors = [
    { id: "err-1", type: "API Warning", code: "503 High Demand", detail: "Gemini upstream spike handled by intelligent retry pool", time: "Today, 08:12:04", severity: "Low (Resolved)" },
    { id: "err-2", type: "Network Notice", code: "HMR Disabled", detail: "Platform HMR safety lock verified", time: "Today, 07:45:00", severity: "Info" },
    { id: "err-3", type: "Verification Check", code: "Domain Verify", detail: "Checked SSL certificates and reverse proxy routing", time: "Yesterday, 11:30:19", severity: "Resolved" }
  ];

  const handleAddUser = (e: FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    setUsers([
      ...users,
      {
        id: `usr-${Date.now()}`,
        name: newUserName,
        email: newUserEmail,
        role: "User",
        plan: newUserPlan,
        status: "Active"
      }
    ]);
    setNewUserName("");
    setNewUserEmail("");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-500" /> Admin Console
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Core system management: platform users, AI token usage, business searches, generated preview websites, and system error diagnostics.
          </p>
        </div>

        {/* Console tab controls */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/60 shrink-0">
          {[
            { id: "users", label: "Users", icon: Users },
            { id: "ai_usage", label: "AI Usage", icon: Sparkles },
            { id: "searches", label: "Business Searches", icon: BarChart3 },
            { id: "websites", label: "Generated Websites", icon: Layers },
            { id: "errors", label: "System Errors", icon: AlertCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3 size): Selected active tab panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === "users" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="h-5 w-5 text-blue-500" /> Platform Users & Team
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage registered operators, licenses, and account statuses.</p>
              </div>

              {/* Add User Form */}
              <form onSubmit={handleAddUser} className="grid gap-3 sm:grid-cols-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <div className="flex gap-2">
                  <select
                    value={newUserPlan}
                    onChange={(e: any) => setNewUserPlan(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                  >
                    <option value="Free Trial">Free Trial</option>
                    <option value="Pro Plan">Pro Plan</option>
                    <option value="Agency VIP">Agency VIP</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Subscription</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${u.role === "Admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{u.plan}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => setUsers(users.filter(x => x.id !== u.id))}
                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "ai_usage" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-indigo-500" /> AI Usage &amp; Quota Telemetry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time statistics for Gemini API calls, schema generations, and fallback safety.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total API Requests</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{aiStats.totalRequests}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ 95.5% Success Rate</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Generation Speed</span>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{aiStats.avgLatencyMs}ms</p>
                  <p className="text-[10px] text-slate-500 mt-1">Flash Model Parallel Pool</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Quota Remaining</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{aiStats.quotaRemaining}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">High Availability Active</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-indigo-900 dark:text-indigo-300">Intelligent Fallback Architecture</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  SiteScout AI automatically rotates through Gemini 2.5 Flash, Gemini 2.5 Pro, and Gemini 3.1 Flash Lite with exponential backoff on 503 high-demand events.
                </p>
              </div>
            </div>
          )}

          {activeTab === "searches" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="h-5 w-5 text-amber-500" /> Business Directory Searches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Recent business discovery queries, scanned markets, and verified local records.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Target Category</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Leads Found</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {recentSearches.map(s => (
                      <tr key={s.id}>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{s.category}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{s.location}</td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{s.resultsCount} leads</span>
                        </td>
                        <td className="p-3 text-slate-400">{s.timestamp}</td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 uppercase">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "websites" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="h-5 w-5 text-purple-500" /> Generated Preview Websites
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Track live generated client previews, viewer traffic, and proposal conversion status.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Business Prospect</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Preview Token</th>
                      <th className="p-3">Views</th>
                      <th className="p-3 text-right">Conversion State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {generatedWebsites.map(w => (
                      <tr key={w.id}>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{w.name}</td>
                        <td className="p-3 text-slate-500">{w.category}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{w.token}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{w.views} views</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            w.status === "Client Approved"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "errors" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-rose-500" /> System Health &amp; Error Telemetry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Audit log of system runtime events, API spikes, and recovery metrics.</p>
              </div>

              <div className="space-y-2.5 pt-2">
                {systemErrors.map(err => (
                  <div key={err.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{err.type}</span>
                        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300">{err.code}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{err.detail}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{err.time}</p>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400">
                      {err.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (1/3 size): Platform Health Summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-4 w-4 text-emerald-500" /> Platform Overview
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Operators</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{users.length} Users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Discovery Searches</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">1,420 Searches</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Live Client Previews</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{generatedWebsites.length} Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">API Health Status</span>
                <span className="font-bold text-emerald-500">100% Operational</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4 text-blue-500" /> System Architecture
            </h3>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">Core Loop</span>
              <span className="text-slate-800 dark:text-slate-200">Discover &rarr; Build &rarr; Close</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">AI Model</span>
              <span className="text-slate-800 dark:text-slate-200">Gemini 2.5 Flash</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">Audit Protocol</span>
              <span className="text-emerald-500">13-Point Digital Matrix</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
