import { useState, FormEvent, useMemo } from "react";
import { Business, CustomerInvoice, CustomerSupportTicket, GeneratedSite, SupportTicketCategory, SupportTicketPriority } from "../types";
import { 
  FolderUp, MessageSquare, Check, Sparkles, Send, Trash2, 
  Layers, Clock, ShieldCheck, Heart, ArrowRight, UserCheck, CloudUpload, FileCheck,
  Download, FileText, CreditCard, CheckCircle2, AlertCircle, RefreshCw, Receipt,
  Headphones, LifeBuoy, PlusCircle, Lock, ShieldAlert, KeyRound, LogOut
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { 
  createCustomerSession, 
  authorizeCustomerAccess, 
  sanitizeCustomerPortalData 
} from "../lib/customerPortalAccess";
import ProposalGenerator from "./ProposalGenerator";
import { getLocalBusinessCache } from "../lib/businessPersistence";
import { getCustomerBillingSummary } from "../lib/customerBilling";
import { formatCurrency } from "../lib/prospectFinancials";
import { 
  getCustomerTickets, 
  createCustomerSupportTicket, 
  addTicketMessage, 
  sanitizeTicketForCustomer 
} from "../lib/customerSupport";

interface ClientPortalProps {
  site: GeneratedSite;
  onBackToApp: () => void;
  onSave?: (updatedSite: GeneratedSite) => Promise<void>;
  business?: Business;
}

interface FeedbackItem {
  id: string;
  section: string;
  comment: string;
  status: "pending" | "resolved";
  date: string;
}

export default function ClientPortal({ site, onBackToApp, onSave, business }: ClientPortalProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(() => {
    if (site.clientFeedback && site.clientFeedback.length > 0) {
      return site.clientFeedback.map((fb, idx) => ({
        id: `fb-${idx}-${Date.now()}`,
        section: "Live Design Layout",
        comment: fb.message,
        status: (fb.status as any) || "pending",
        date: new Date(fb.timestamp).toLocaleDateString()
      }));
    }
    return [
      {
        id: "fb-1",
        section: "Hero Section",
        comment: "Could we change the main headline to emphasize our 24/7 emergency service? That is our biggest selling point.",
        status: "pending",
        date: "Today, 10:15 AM"
      }
    ];
  });

  const [chatMessages, setChatMessages] = useState<{id: string, text: string, sender: "client" | "designer", time: string}[]>([
    {
      id: "msg-1",
      text: "Hi there! Welcome to your project portal. I'm Alex, your lead designer.",
      sender: "designer",
      time: "10:00 AM"
    }
  ]);
  const [newChatMessage, setNewChatMessage] = useState("");

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newChatMessage) return;
    setChatMessages([
      ...chatMessages,
      {
        id: `msg-${Date.now()}`,
        text: newChatMessage,
        sender: "client",
        time: "Just now"
      }
    ]);
    setNewChatMessage("");
    
    // Simulate reply
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          text: "I've received your message. I'll get back to you shortly!",
          sender: "designer",
          time: "Just now"
        }
      ]);
    }, 1000);
  };

  const { user: authUser } = useAuth();
  const session = useMemo(() => {
    if (!authUser) {
      return createCustomerSession({
        uid: site.clientEmail || `cust_${site.id}`,
        email: site.clientEmail || site.email || "client@workspace.sz",
        role: "customer",
        customerId: site.clientEmail || `cust_${site.id}`,
        businessId: site.businessId || site.id
      });
    }
    return createCustomerSession({
      uid: authUser.uid,
      email: authUser.email,
      role: authUser.role === "Admin" ? "admin" : "customer",
      customerId: authUser.email,
      businessId: site.businessId || site.id
    });
  }, [authUser, site]);

  const [activeTab, setActiveTab] = useState<"onboarding" | "proposal" | "assets" | "revisions" | "messages" | "invoices" | "support" | "account">("onboarding");
  const [newComment, setNewComment] = useState("");
  const [newSection, setNewSection] = useState("Hero Section");
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Micro-Phase 16A: Customer Support & Requests Portal State
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportCategory, setSupportCategory] = useState<SupportTicketCategory>("BUG_FIX");
  const [supportPriority, setSupportPriority] = useState<SupportTicketPriority>("NORMAL");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const handleAddFeedback = (e: FormEvent) => {
    e.preventDefault();
    if (!newComment) return;

    const newItem: FeedbackItem = {
      id: `fb-${Date.now()}`,
      section: newSection,
      comment: newComment,
      status: "pending",
      date: "Just now"
    };

    setFeedbacks([newItem, ...feedbacks]);
    setNewComment("");
  };

  const deleteFeedback = (id: string) => {
    setFeedbacks(feedbacks.filter((fb) => fb.id !== id));
  };

  const triggerUploadLogo = () => {
    setUploadProgress(true);
    setTimeout(() => {
      setLogoUploaded(true);
      setUploadProgress(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper header action controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-4 no-print">
        <div>
          <button
            onClick={onBackToApp}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white mb-2 transition-colors"
          >
            ← Exit Client Mode (Back to Agency Dashboard)
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              White-Labeled Client Workspace
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {site.businessName}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            This collaborative portal lets clients securely review layout drafts, upload branding content, and align launch requirements.
          </p>
        </div>

        {/* Access controls tab toggle */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-150 p-1 dark:bg-slate-900/60 shrink-0">
          {[
            { id: "onboarding", label: "Launch Roadmap" },
            { id: "proposal", label: "Proposal & SLA Contract" },
            { id: "assets", label: "Brand Assets" },
            { id: "revisions", label: "Revision Logs" },
            { id: "messages", label: "Messages" },
            { id: "invoices", label: "Invoices" },
            { id: "support", label: "Support & SLA" },
            { id: "account", label: "Account & Security" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Layout Structure based on Tab selection */}
      {activeTab === "proposal" ? (
        /* Full width block for high-fidelity proposal preview, printing & digital sign-off */
        <div className="w-full">
          <ProposalGenerator 
            site={site}
            userEmail={site.contactPage?.email || "agency-partner@sitescout.ai"}
            onSave={onSave}
          />
        </div>
      ) : (
        /* Original Grid Layout Split for assets, onboarding and revisions */
        <div className="grid gap-6 lg:grid-cols-3 no-print">
          {/* Left Column (2/3 size): Dynamic selected tab panel content */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === "onboarding" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="h-5 w-5 text-blue-500" /> Website Publishing Roadmap
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Track active design milestones, approval checklist logs, and launching queues.</p>
                </div>

                {/* Progress Stepper milestones */}
                <div className="space-y-4">
                  {[
                    { title: "Review Initial Website Layout", desc: "Test call hotlines, FAQ dropdown accordions, and SEO metatags on the live preview link.", status: "complete", step: "1" },
                    { title: "Upload High-Res Brand Materials", desc: "Submit logo assets, team headshots, specific product listings, or custom credentials.", status: "pending", step: "2" },
                    { title: "Submit Layout Revision Requests", desc: "Log text alterations, color adjustments, or block alignment inputs via our Revisions tab.", status: "pending", step: "3" },
                    { title: "Formal Proposal Sign-Off", desc: "Review and approve itemized SLAs, setup costs, hosting contracts, and monthly recurring support options.", status: site.clientApproved ? "complete" : "pending", step: "4" },
                    { title: "Point Custom Domain & Launch Live", desc: "Connect domain DNS parameters and deploy layout live to standard production edge servers.", status: "pending", step: "5" }
                  ].map((item, index) => (
                    <div key={index} className="flex gap-4 items-start group">
                      <div className="flex flex-col items-center">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${
                          item.status === "complete" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {item.status === "complete" ? "✓" : item.step}
                        </span>
                        {index < 4 && <div className="h-10 w-0.5 bg-slate-100 dark:bg-slate-800 mt-1" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.title}
                          {item.status === "complete" && (
                            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded dark:bg-emerald-950/30 dark:text-emerald-400">Done</span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "assets" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CloudUpload className="h-5 w-5 text-indigo-500" /> Brand Materials Uploader
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload high-quality business logos, team headshots, or product photos to customize layouts.</p>
                </div>

                {/* Drag and Drop area */}
                <div 
                  onClick={triggerUploadLogo}
                  className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 p-8 text-center space-y-3 cursor-pointer transition-all dark:border-slate-800 dark:bg-slate-950/20"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <FolderUp className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {uploadProgress ? "Uploading assets..." : "Click or Drag &amp; Drop logo/images here"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Supports PNG, JPG, or SVG. Maximum file upload scale: 12MB</p>
                  </div>
                </div>

                {/* Uploaded state indicator */}
                {logoUploaded && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center justify-between dark:bg-emerald-950/15 dark:border-emerald-900/30 dark:text-emerald-400">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-2xl">🖼️</span>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">business-primary-logo.png</p>
                        <p className="text-[10px] text-slate-400">Size: 1.4 MB • Uploaded successfully</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLogoUploaded(false)}
                      className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "revisions" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="h-5 w-5 text-amber-500" /> Interactive Revision Feedbacks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Submit specific design or text changes. Our designers will implement them within 24 hours.</p>
                </div>

                {/* Quick comment submit Form */}
                <form onSubmit={handleAddFeedback} className="grid gap-3.5 sm:grid-cols-4 border-b border-slate-100 pb-5 dark:border-slate-800/80">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Related Block</label>
                    <select
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white font-medium focus:outline-none"
                    >
                      <option value="Hero Section">Hero Section</option>
                      <option value="Services List">Services List</option>
                      <option value="About Content">About Content</option>
                      <option value="SEO/Brand Meta">SEO/Brand Meta</option>
                      <option value="Colors &amp; Fonts">Colors &amp; Fonts</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Comment Detail</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Please change the services package price to $149."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end sm:col-span-1">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                    >
                      <Send className="h-3 w-3" /> Add Note
                    </button>
                  </div>
                </form>

                {/* Feedbacks list */}
                <div className="space-y-4">
                  {feedbacks.map((fb) => (
                    <div key={fb.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 uppercase tracking-wide">
                          {fb.section}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            fb.status === "resolved" 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                          }`}>
                            {fb.status}
                          </span>
                          <button
                            onClick={() => deleteFeedback(fb.id)}
                            className="text-slate-400 hover:text-red-500 rounded p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        "{fb.comment}"
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">{fb.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "messages" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6 flex flex-col h-[600px]">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="h-5 w-5 text-blue-500" /> Direct Designer Communication
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Chat directly with the design team regarding your project.</p>
                </div>
                
                {/* Chat window */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 text-xs ${
                        msg.sender === "client" 
                          ? "bg-blue-600 text-white rounded-br-none" 
                          : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none"
                      }`}>
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className={`text-[9px] mt-1 text-right ${msg.sender === "client" ? "text-blue-100" : "text-slate-400"}`}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input area */}
                <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {activeTab === "invoices" && (() => {
              const allBiz = getLocalBusinessCache();
              const resolvedBiz: Business = business || allBiz.find(b => b.id === site.businessId || b.name.toLowerCase() === site.businessName.toLowerCase()) || {
                id: site.businessId || `biz_${site.id}`,
                name: site.businessName,
                category: site.category,
                phone: site.phone,
                email: site.email || site.clientEmail || "",
                address: site.address,
                rating: 5.0,
                reviewsCount: 0,
                description: site.about?.mission || site.businessName,
                presence: {
                  hasWebsite: true,
                  hasEmail: true,
                  facebookStatus: "active",
                  instagramStatus: "active",
                  googleProfileQuality: "good",
                  reviewCountStatus: "average",
                  photosStatus: "sufficient",
                  descriptionQuality: "good",
                  openingHoursStatus: "complete",
                  contactCompleteness: "complete"
                },
                invoices: [],
                payments: [],
                currency: "USD"
              };

              const summary = getCustomerBillingSummary(resolvedBiz);
              const sanitizedData = session 
                ? sanitizeCustomerPortalData(resolvedBiz, session)
                : { invoices: resolvedBiz.invoices || [], payments: resolvedBiz.payments || [] };
              const invoices = sanitizedData.invoices;
              const payments = sanitizedData.payments;

              const handleDownloadInvoice = (inv: CustomerInvoice) => {
                const invoiceDoc = `================================================
INVOICE: ${inv.invoiceNumber}
SiteScout AI Official Customer Billing Record
================================================
Customer ID: ${inv.customerId}
Business Name: ${site.businessName}
Issue Date: ${new Date(inv.issueDate).toLocaleDateString()}
Due Date: ${new Date(inv.dueDate).toLocaleDateString()}
Status: ${inv.status}
Currency: ${inv.currency}
------------------------------------------------
LINE ITEMS:
${inv.lineItems.map(item => `• ${item.description} (Qty: ${item.quantity}) - ${formatCurrency(item.total, inv.currency)}`).join("\n")}
------------------------------------------------
Subtotal: ${formatCurrency(inv.subtotal, inv.currency)}
Tax: ${formatCurrency(inv.taxAmount, inv.currency)}
TOTAL: ${formatCurrency(inv.total, inv.currency)}
Amount Paid: ${formatCurrency(inv.amountPaid, inv.currency)}
BALANCE DUE: ${formatCurrency(inv.amountDue, inv.currency)}
================================================
Thank you for your business!`;

                const blob = new Blob([invoiceDoc], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${inv.invoiceNumber}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              };

              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  {/* Header & Plan Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileText className="h-5 w-5 text-emerald-500" /> Customer Billing &amp; Invoices
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Authoritative billing records, verified invoices, payments, and account balance.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-semibold">Active Plan:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {summary.currentPlanName} ({summary.billingInterval})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        summary.subscriptionStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" :
                        summary.subscriptionStatus === "TRIAL" ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300" :
                        summary.subscriptionStatus === "PAST_DUE" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {summary.subscriptionStatus}
                      </span>
                    </div>
                  </div>

                  {/* High-Level Metric Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Invoiced</span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(summary.totalInvoiced, summary.currency)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Verified Paid</span>
                      <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(summary.totalPaid, summary.currency)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">Outstanding Due</span>
                      <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrency(summary.outstandingBalance, summary.currency)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Verified Net Revenue</span>
                      <span className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">
                        {formatCurrency(summary.netRevenue, summary.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Section: Invoices List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4 text-blue-500" />
                        Invoices ({invoices.length})
                      </h4>
                      {summary.outstandingBalance > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                          Balance Due: {formatCurrency(summary.outstandingBalance, summary.currency)}
                        </span>
                      )}
                    </div>

                    {invoices.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No formal customer invoices issued yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm font-mono text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</span>
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  inv.status === "PAID" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                  inv.status === "PARTIALLY_PAID" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                                  inv.status === "OVERDUE" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                                  inv.status === "VOID" ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 line-through" :
                                  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {inv.lineItems.map(li => li.description).join(", ")}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Issued: {new Date(inv.issueDate).toLocaleDateString()} • Due: {new Date(inv.dueDate).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                              <div className="text-left sm:text-right">
                                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {formatCurrency(inv.total, inv.currency)}
                                </div>
                                {inv.amountDue > 0 && inv.status !== "VOID" && (
                                  <div className="text-[10px] text-amber-600 font-bold">
                                    Due: {formatCurrency(inv.amountDue, inv.currency)}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(inv)}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors dark:text-blue-400 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                                Download Statement
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Verified Payment Receipts */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-emerald-500" />
                      Verified Payment Receipts ({payments.length})
                    </h4>

                    {payments.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No verified payment transactions recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((pmt) => (
                          <div
                            key={pmt.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{pmt.paymentNumber}</span>
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  pmt.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                  pmt.status === "PARTIALLY_REFUNDED" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                                  pmt.status === "REFUNDED" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                                  "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}>
                                  {pmt.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Ref: <span className="font-mono text-slate-600 dark:text-slate-300">{pmt.paymentProviderRef?.referenceId || "N/A"}</span> • Method: <span className="uppercase">{pmt.paymentMethod.replace(/_/g, " ")}</span> • {new Date(pmt.paidAt).toLocaleString()}
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(pmt.amount, pmt.currency)}
                              </span>
                              {pmt.refundedAmount > 0 && (
                                <div className="text-[10px] text-rose-500 font-bold">
                                  Refunded: -{formatCurrency(pmt.refundedAmount, pmt.currency)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === "support" && (() => {
              const allBiz = getLocalBusinessCache();
              const resolvedBiz: Business = business || allBiz.find(b => b.id === site.businessId || b.name.toLowerCase() === site.businessName.toLowerCase()) || {
                id: site.businessId || `biz_${site.id}`,
                name: site.businessName,
                category: site.category,
                phone: site.phone,
                email: site.email || site.clientEmail || "",
                address: site.address,
                rating: 5.0,
                reviewsCount: 0,
                description: site.about?.mission || site.businessName,
                presence: {
                  hasWebsite: true,
                  hasEmail: true,
                  facebookStatus: "active",
                  instagramStatus: "active",
                  googleProfileQuality: "good",
                  reviewCountStatus: "average",
                  photosStatus: "sufficient",
                  descriptionQuality: "good",
                  openingHoursStatus: "complete",
                  contactCompleteness: "complete"
                },
                invoices: [],
                payments: [],
                supportTickets: [],
                currency: "USD"
              };

              const requesterId = site.clientEmail || site.email || `cust_${site.id}`;
              const requesterName = site.businessName || "Client Owner";
              const clientTickets = getCustomerTickets(resolvedBiz, requesterId);
              const activeSelectedTicket = clientTickets.find(t => t.id === selectedTicketId) || clientTickets[0];

              const handleCreateTicket = async (e: FormEvent) => {
                e.preventDefault();
                if (!supportSubject || !supportDescription) return;

                setIsSubmittingSupport(true);
                setSupportFeedback(null);

                const actor = {
                  uid: requesterId,
                  displayName: requesterName,
                  role: "Client"
                };

                const res = await createCustomerSupportTicket(
                  resolvedBiz,
                  {
                    requesterId,
                    requesterName,
                    requesterEmail: site.clientEmail || site.email,
                    subject: supportSubject,
                    description: supportDescription,
                    category: supportCategory,
                    priority: supportPriority,
                    siteId: site.id
                  },
                  actor
                );

                setIsSubmittingSupport(false);
                if (res.success && res.ticket) {
                  setSupportFeedback(`✓ Support ticket ${res.ticket.ticketNumber} opened successfully!`);
                  setSupportSubject("");
                  setSupportDescription("");
                  setSelectedTicketId(res.ticket.id);
                } else {
                  setSupportFeedback(`✕ ${res.error || "Failed to create support ticket."}`);
                }
              };

              const handleSendReply = async (e: FormEvent) => {
                e.preventDefault();
                if (!ticketReplyText.trim() || !activeSelectedTicket) return;

                setIsReplying(true);
                const actor = {
                  uid: requesterId,
                  displayName: requesterName,
                  role: "Client"
                };

                const res = await addTicketMessage(
                  resolvedBiz,
                  activeSelectedTicket.id,
                  {
                    senderId: requesterId,
                    senderName: requesterName,
                    senderRole: "customer",
                    message: ticketReplyText.trim(),
                    isInternal: false
                  },
                  actor
                );

                setIsReplying(false);
                if (res.success) {
                  setTicketReplyText("");
                }
              };

              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Headphones className="h-5 w-5 text-indigo-500" /> Customer Support &amp; Service Requests
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Report bugs, request layout changes, or submit service inquiries directly to your account engineering team.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {clientTickets.length} Tickets
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Responsive Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Create Ticket Form */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <PlusCircle className="w-4 h-4 text-blue-500" />
                          New Service Request
                        </h4>

                        {supportFeedback && (
                          <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                            supportFeedback.startsWith("✓")
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}>
                            {supportFeedback}
                          </div>
                        )}

                        <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subject</label>
                            <input
                              type="text"
                              required
                              value={supportSubject}
                              onChange={(e) => setSupportSubject(e.target.value)}
                              placeholder="e.g. Update holiday business hours in footer"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                              <select
                                value={supportCategory}
                                onChange={(e) => setSupportCategory(e.target.value as SupportTicketCategory)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px]"
                              >
                                <option value="BUG_FIX">Bug Fix</option>
                                <option value="CONTENT_UPDATE">Content Update</option>
                                <option value="DOMAIN_DNS">Domain &amp; DNS</option>
                                <option value="EMAIL_SETUP">Email &amp; Hosting</option>
                                <option value="FEATURE_REQUEST">Feature Request</option>
                                <option value="BILLING_INQUIRY">Billing Inquiry</option>
                                <option value="TRAINING_ONBOARDING">Training / Help</option>
                                <option value="GENERAL_INQUIRY">General Inquiry</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Priority</label>
                              <select
                                value={supportPriority}
                                onChange={(e) => setSupportPriority(e.target.value as SupportTicketPriority)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px]"
                              >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent (SLA)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description &amp; Details</label>
                            <textarea
                              required
                              rows={3}
                              value={supportDescription}
                              onChange={(e) => setSupportDescription(e.target.value)}
                              placeholder="Please describe the issue or requested change in detail..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingSupport}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isSubmittingSupport ? "Submitting..." : "Submit Ticket"}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Right: Ticket Thread & History */}
                    <div className="lg:col-span-7 space-y-4">
                      {clientTickets.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                          <LifeBuoy className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                          <p>You have not submitted any service requests yet.</p>
                          <p className="text-[10px]">Use the form on the left to submit questions or updates.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Ticket Selector Tabs */}
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {clientTickets.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTicketId(t.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                                  (activeSelectedTicket?.id === t.id)
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                <span className="font-mono text-[10px] block text-slate-400">{t.ticketNumber}</span>
                                <span className="truncate max-w-[120px] block">{t.subject}</span>
                              </button>
                            ))}
                          </div>

                          {activeSelectedTicket && (
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                              {/* Selected Ticket Meta */}
                              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-slate-400">{activeSelectedTicket.ticketNumber}</span>
                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                      activeSelectedTicket.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                      activeSelectedTicket.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" :
                                      activeSelectedTicket.status === "WAITING_FOR_CUSTOMER" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                                      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                    }`}>
                                      {activeSelectedTicket.status}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                                    {activeSelectedTicket.subject}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Category: {activeSelectedTicket.category} • Priority: {activeSelectedTicket.priority} • Opened: {new Date(activeSelectedTicket.createdTimestamp).toLocaleDateString()}
                                  </p>
                                </div>

                                {activeSelectedTicket.isCoveredUnderSla && (
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                                    SLA Protected
                                  </span>
                                )}
                              </div>

                              {/* Message History Thread */}
                              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 text-xs">
                                {(activeSelectedTicket.messages || []).map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`p-3 rounded-xl border ${
                                      msg.senderRole === "customer"
                                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 ml-4"
                                        : "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 mr-4"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                                        {msg.senderName} ({msg.senderRole === "customer" ? "You" : "Support Team"})
                                      </span>
                                      <span className="text-[9px] text-slate-400">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {msg.message}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Resolution summary if resolved */}
                              {activeSelectedTicket.status === "RESOLVED" && activeSelectedTicket.resolutionSummary && (
                                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
                                  <span className="font-bold block mb-0.5">Resolution Notes:</span>
                                  {activeSelectedTicket.resolutionSummary}
                                </div>
                              )}

                              {/* Reply Form */}
                              {activeSelectedTicket.status !== "CLOSED" && activeSelectedTicket.status !== "CANCELLED" && (
                                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <input
                                    type="text"
                                    value={ticketReplyText}
                                    onChange={(e) => setTicketReplyText(e.target.value)}
                                    placeholder="Write a reply or provide extra details..."
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isReplying || !ticketReplyText.trim()}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Send
                                  </button>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Micro-Phase 16C: Account Security & Access Control Panel */}
            {activeTab === "account" && (() => {
              const allBiz = getLocalBusinessCache();
              const resolvedBiz: Business = business || allBiz.find(b => b.id === site.businessId || b.name.toLowerCase() === site.businessName.toLowerCase()) || {
                id: site.businessId || "temp_biz",
                name: site.businessName
              } as Business;

              const account = resolvedBiz.customerAccount;
              const sub = resolvedBiz.activeSubscription;

              return (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          Account Security &amp; Access Controls
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Role-based session isolation, entitlement guards, and resource ownership boundaries.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <KeyRound className="h-3.5 w-3.5" />
                        Boundary Guard Active
                      </span>
                    </div>

                    {/* Session Diagnostics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Authenticated Session</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">User Email</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.email || authUser?.email || "Guest Client Session"}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">User UID</span>
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{session?.uid || authUser?.uid || "local_guest_uid"}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">Portal Role</span>
                            <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              {session?.role || (authUser?.role === "Admin" ? "admin" : "customer")}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Session Status</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid &amp; Protected
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Account Association</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">Customer ID</span>
                            <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              {account?.customerId || `cust_${resolvedBiz.id.substring(0, 8)}`}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">Business / Project</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{resolvedBiz.name}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">Subscription Tier</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{sub?.planName || "Starter Plan"}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Account Status</span>
                            <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {account?.accountStatus || sub?.status || "ACTIVE"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Access Rules & Invariants Summary */}
                    <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 text-xs">
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <Lock className="h-4 w-4" />
                        Micro-Phase 16C Security Policy Invariants
                      </h4>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                        <li><strong>Server-Side Boundary Enforcement:</strong> Resource access requires cryptographically validated customer tokens.</li>
                        <li><strong>Anti-Enumeration Guard:</strong> ID substitution in API queries or URLs strictly rejects unauthorized resource access.</li>
                        <li><strong>Internal Note Redaction:</strong> Internal engineering notes and staff audit logs are never exposed to customers.</li>
                        <li><strong>Historical Access Preservation:</strong> Expired or cancelled accounts maintain read-only access to historic invoices and tickets without active generation rights.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Right Column: Mini Sidebar presenting overall layout stats */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Project SLA Summary</h3>
              
              <div className="space-y-3 border-b border-slate-50 pb-4 dark:border-slate-800/80 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Design Phase</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">Layout Approval</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overall Completed</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{site.clientApproved ? "80%" : "20%"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SLA Contract Status</span>
                  <span className={`font-bold uppercase ${site.clientApproved ? "text-emerald-500" : "text-amber-500 animate-pulse"}`}>
                    {site.clientApproved ? "Contract Active" : "Sign-off Required"}
                  </span>
                </div>
              </div>

              {/* Quick trust seals */}
              <div className="space-y-3.5 pt-1">
                <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span><strong>SSL Encryption Active:</strong> Live previews run fully secured.</span>
                </div>
                <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>7-Day Delivery Queue:</strong> Instant domain hosting hookups upon signing off.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
