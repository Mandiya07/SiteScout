import { useState, FormEvent } from "react";
import { GeneratedSite } from "../types";
import { 
  FolderUp, MessageSquare, Check, Sparkles, Send, Trash2, 
  Layers, Clock, ShieldCheck, Heart, ArrowRight, UserCheck, CloudUpload, FileCheck,
  Download, FileText
} from "lucide-react";
import ProposalGenerator from "./ProposalGenerator";

interface ClientPortalProps {
  site: GeneratedSite;
  onBackToApp: () => void;
  onSave?: (updatedSite: GeneratedSite) => Promise<void>;
}

interface FeedbackItem {
  id: string;
  section: string;
  comment: string;
  status: "pending" | "resolved";
  date: string;
}

export default function ClientPortal({ site, onBackToApp, onSave }: ClientPortalProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([
    {
      id: "fb-1",
      section: "Hero Section",
      comment: "Could we change the main headline to emphasize our 24/7 emergency service? That is our biggest selling point.",
      status: "pending",
      date: "Today, 10:15 AM"
    },
    {
      id: "fb-2",
      section: "Color Scheme",
      comment: "Looks great, but the accent blue is slightly too bright. Can we use a deeper navy color?",
      status: "resolved",
      date: "Yesterday, 2:40 PM"
    }
  ]);

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

  const [activeTab, setActiveTab] = useState<"onboarding" | "proposal" | "assets" | "revisions" | "messages" | "invoices">("onboarding");
  const [newComment, setNewComment] = useState("");
  const [newSection, setNewSection] = useState("Hero Section");
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

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
    
    // Trigger notification alert
    window.alert("Notification System: An email alert has been securely dispatched to your agency team regarding this feedback.");
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
            { id: "invoices", label: "Invoices" }
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

            {activeTab === "invoices" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="h-5 w-5 text-emerald-500" /> Billing & Invoices
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Download your past and upcoming project invoices.</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { id: "INV-2026-001", date: "Jul 1, 2026", amount: "$349.50", status: "Paid", description: "50% Upfront Retainer Deposit" },
                    { id: "INV-2026-002", date: "Jul 15, 2026", amount: "$349.50", status: "Pending", description: "50% Final Project Delivery" },
                  ].map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/20">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{invoice.id}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            invoice.status === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{invoice.description}</p>
                        <p className="text-[10px] text-slate-400">Issued: {invoice.date}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{invoice.amount}</span>
                        <button className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors dark:text-blue-400 dark:bg-blue-950/30 dark:hover:bg-blue-900/50">
                          <Download className="h-3 w-3" />
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
