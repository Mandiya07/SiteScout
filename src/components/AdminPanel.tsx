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
  const [activeTab, setActiveTab] = useState<"users" | "subscriptions" | "templates" | "industries" | "prompts" | "analytics" | "announcements" | "security">("users");

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

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState([
    { id: "sub-1", client: "Sipho M. (Agency VIP)", plan: "Agency VIP ($299/mo)", renewal: "Aug 12, 2026", status: "Active" },
    { id: "sub-2", client: "Apex Plumbing", plan: "Pro Plan ($79/mo)", renewal: "Jul 28, 2026", status: "Active" },
    { id: "sub-3", client: "Vance Legal Counsel", plan: "Free Trial ($0)", renewal: "Expired", status: "Trial Expired" },
    { id: "sub-4", client: "Glow Spa & Wellness", plan: "Pro Plan ($79/mo)", renewal: "Aug 02, 2026", status: "Active" },
  ]);

  // Templates State
  const [templates, setTemplates] = useState<TemplateItem[]>([
    { id: "tpl-1", title: "Modern Home Trades", category: "Plumbing / HVAC", swatch: "bg-blue-600", fontStyle: "Space Grotesk" },
    { id: "tpl-2", title: "Executive Legal & Advisory", category: "Legal & Consulting", swatch: "bg-emerald-700", fontStyle: "Playfair Display" },
    { id: "tpl-3", title: "Minimalist Wellness Studio", category: "Spa & Salon", swatch: "bg-rose-500", fontStyle: "Inter Sans" },
    { id: "tpl-4", title: "Gourmet Bistro & Cafe", category: "Food & Hospitality", swatch: "bg-amber-600", fontStyle: "Outfit Modern" },
  ]);
  const [newTplTitle, setNewTplTitle] = useState("");
  const [newTplCategory, setNewTplCategory] = useState("");

  // Industries State
  const [industries, setIndustries] = useState<IndustryItem[]>([
    { id: "ind-1", name: "Emergency Plumbing & Drain", defaultCategory: "Home Services", activeCount: 142 },
    { id: "ind-2", name: "HVAC Installation & Repair", defaultCategory: "Home Services", activeCount: 98 },
    { id: "ind-3", name: "Corporate Legal Counsel", defaultCategory: "Professional Services", activeCount: 64 },
    { id: "ind-4", name: "Luxury Day Spa & Massage", defaultCategory: "Wellness & Beauty", activeCount: 85 },
  ]);
  const [newIndName, setNewIndName] = useState("");

  // Prompts State
  const [promptValue, setPromptValue] = useState(
    "Generate a complete small business website structure. Write high-converting sales copy, localized SEO meta title, description, and keywords based on the local presence audit details..."
  );

  // Announcements State
  const [announcementsList, setAnnouncementsList] = useState([
    { id: "ann-1", text: "Scheduled system upgrade on Saturday from 2:00 AM to 4:00 AM UTC.", date: "Today, 08:30 AM" }
  ]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Audit Logs
  const logs = [
    { id: "log-1", ip: "102.14.88.204", event: "Vite dev asset compilation request", status: "success", timestamp: "Today, 12:44:11" },
    { id: "log-2", ip: "192.168.1.10", event: "Firebase Authentication proxy sync", status: "success", timestamp: "Today, 12:42:05" },
    { id: "log-3", ip: "85.24.110.15", event: "Gemini AI API Model Flash proxy request", status: "success", timestamp: "Today, 12:35:50" },
    { id: "log-4", ip: "34.12.8.94", event: "Digital Presence score audit executed", status: "success", timestamp: "Today, 12:30:15" },
    { id: "log-5", ip: "102.14.88.204", event: "New admin dashboard login authorized", status: "authorized", timestamp: "Today, 12:00:01" }
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

  const handleAddTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!newTplTitle) return;
    setTemplates([
      ...templates,
      {
        id: `tpl-${Date.now()}`,
        title: newTplTitle,
        category: newTplCategory || "General Trade",
        swatch: "bg-indigo-600",
        fontStyle: "Inter Sans"
      }
    ]);
    setNewTplTitle("");
    setNewTplCategory("");
  };

  const handleAddIndustry = (e: FormEvent) => {
    e.preventDefault();
    if (!newIndName) return;
    setIndustries([
      ...industries,
      {
        id: `ind-${Date.now()}`,
        name: newIndName,
        defaultCategory: "Local Services",
        activeCount: 1
      }
    ]);
    setNewIndName("");
  };

  const handleDispatchAnnouncement = (e: FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement) return;
    setAnnouncementsList([
      { id: `ann-${Date.now()}`, text: newAnnouncement, date: "Just now" },
      ...announcementsList
    ]);
    setAnnouncementSuccess(true);
    setNewAnnouncement("");
    setTimeout(() => setAnnouncementSuccess(false), 3000);
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
            Full enterprise administrative suite: users, subscriptions, templates, industries, AI prompts, analytics, and audit logs.
          </p>
        </div>

        {/* Console tab controls */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/60 shrink-0">
          {[
            { id: "users", label: "Users", icon: Users },
            { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
            { id: "templates", label: "Templates", icon: Layers },
            { id: "industries", label: "Industries", icon: Briefcase },
            { id: "prompts", label: "AI Prompts", icon: Sparkles },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "announcements", label: "Announcements", icon: BellRing },
            { id: "security", label: "Audit Logs", icon: Terminal },
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="h-5 w-5 text-blue-500" /> Manage Platform Users
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Add, review, edit permissions, or suspend client accounts.</p>
                </div>
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
                            className="text-slate-400 hover:text-red-500 p-1"
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

          {activeTab === "subscriptions" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="h-5 w-5 text-emerald-500" /> Manage Subscriptions & Billing Tiers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Monitor active agency retainers, plan renewals, and payment statuses.</p>
              </div>

              <div className="space-y-3">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">{sub.client}</p>
                      <p className="text-slate-500">{sub.plan} • Renews: {sub.renewal}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        sub.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {sub.status}
                      </span>
                      <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                        Edit Tier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="h-5 w-5 text-indigo-500" /> Managed Industry Visual Templates
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure default themes, color swatches, and design structures.</p>
              </div>

              {/* Add Template Form */}
              <form onSubmit={handleAddTemplate} className="grid gap-3 sm:grid-cols-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">
                <input
                  type="text"
                  placeholder="Template Title"
                  required
                  value={newTplTitle}
                  onChange={(e) => setNewTplTitle(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Category (e.g., HVAC)"
                  value={newTplCategory}
                  onChange={(e) => setNewTplCategory(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add Template
                </button>
              </form>

              {/* Grid list of templates */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/25 flex items-center justify-between">
                    <div className="text-left space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{tpl.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{tpl.category} • Font: {tpl.fontStyle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full ${tpl.swatch} border-2 border-white shadow-sm`} />
                      <button 
                        onClick={() => setTemplates(templates.filter(t => t.id !== tpl.id))}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "industries" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Briefcase className="h-5 w-5 text-amber-500" /> Manage Industries & Trade Sectors
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Add or configure target trade industries for automated search & prospecting.</p>
              </div>

              {/* Add Industry Form */}
              <form onSubmit={handleAddIndustry} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">
                <input
                  type="text"
                  placeholder="Industry Name (e.g., Commercial Roofing)"
                  required
                  value={newIndName}
                  onChange={(e) => setNewIndName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add Industry
                </button>
              </form>

              {/* Industries list */}
              <div className="space-y-3">
                {industries.map(ind => (
                  <div key={ind.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{ind.name}</p>
                      <p className="text-[10px] text-slate-400">Category: {ind.defaultCategory} • {ind.activeCount} Businesses Indexed</p>
                    </div>
                    <button 
                      onClick={() => setIndustries(industries.filter(i => i.id !== ind.id))}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "prompts" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-blue-500" /> Global AI Generation Prompts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Adjust the global instructions passed to Gemini when compiling local website content.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">System Prompt Core Instructions</label>
                  <textarea
                    rows={6}
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white leading-relaxed font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => alert("Global prompt instructions saved successfully in cloud configuration memory!")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-4 transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
                  >
                    Save Prompts Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="h-5 w-5 text-emerald-500" /> Real-Time Platform Performance & Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Inspecting global system search statistics, API load factors, and subscription revenue totals.</p>
              </div>

              {/* Grid metrics stats layout */}
              <div className="grid gap-3.5 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35 text-left">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Monthly API Load</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">42,804</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">▲ 14.5% vs. Last Month</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35 text-left">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Avg Audit Speed</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">1.82s</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Optimized Node Cache</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/35 text-left">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Platform Revenue</span>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">$14,690</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">▲ Recurring active MRR</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BellRing className="h-5 w-5 text-indigo-500" /> Manage Announcements & Broadcasts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Dispatch system-wide announcements or platform updates directly to all active clients' portal dashboards.</p>
              </div>

              <form onSubmit={handleDispatchAnnouncement} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="E.g., System Maintenance Schedule scheduled on Saturday..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
                >
                  <Send className="h-3.5 w-3.5" /> Dispatch Announcement Broadcast
                </button>
              </form>

              {announcementSuccess && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center text-xs text-emerald-700 font-bold dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" /> Announcement dispatched successfully!
                </div>
              )}

              {/* Active Announcements List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Broadcast History</h4>
                {announcementsList.map(ann => (
                  <div key={ann.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{ann.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dispatched: {ann.date}</p>
                    </div>
                    <button 
                      onClick={() => setAnnouncementsList(announcementsList.filter(a => a.id !== ann.id))}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Terminal className="h-5 w-5 text-amber-500" /> Platform Security Log Audits
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time listing of server access indicators, database queries, and credentials lookup trails.</p>
              </div>

              {/* List of security logs */}
              <div className="space-y-2 pt-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-850 dark:bg-slate-950/20 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-left">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{log.event}</p>
                      <p className="text-[10px] text-slate-400">Host IP: {log.ip} • Timestamp: {log.timestamp}</p>
                    </div>
                    <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400 uppercase tracking-wide">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (1/3 size): Quick Stats & Storage */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-4 w-4 text-emerald-500" /> Platform Health Summary
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Registered Users</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{users.length} Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Managed Templates</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{templates.length} Styles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Industries</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{industries.length} Sectors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SSL Certificate Status</span>
                <span className="font-bold text-emerald-500">Auto-Renewed</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4 text-blue-500" /> DB Storage Allocation
            </h3>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">Total Queries Run</span>
              <span className="text-slate-800 dark:text-slate-200">148,409</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">Active Records</span>
              <span className="text-slate-800 dark:text-slate-200">2,840 Items</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-400">Cache Allocation</span>
              <span className="text-emerald-500">98% Efficient</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
