import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  RotateCcw,
  Filter,
  Search,
  UserCheck,
  Star,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Activity,
  Check,
  X,
  Plus,
  Send,
  Eye,
  RefreshCw,
  Tag
} from "lucide-react";
import {
  BetaFeedbackCategory,
  BetaFeedbackRecord,
  BetaFeatureModule,
  BetaIssueRecord,
  BetaIssueSeverity,
  BetaIssueStatus,
  BetaWorkflowAnalyticsSummary,
  TaskAssignee,
  VisualQualityRating
} from "../types";
import {
  getAdminIssueDashboardData,
  createIssueFromFeedback,
  assignBetaIssue,
  updateBetaIssueSeverity,
  updateBetaIssueStatus,
  reopenBetaIssue,
  computeBetaWorkflowAnalytics,
  submitBetaFeedback,
  getBetaUserFeedbackList
} from "../lib/betaFeedbackIssueTracker";
import { useAuth } from "../lib/AuthContext";

const MODULE_OPTIONS: { value: BetaFeatureModule; label: string }[] = [
  { value: "business_discovery", label: "Business Discovery" },
  { value: "business_data_accuracy", label: "Business Data Accuracy" },
  { value: "website_verification", label: "Website Verification" },
  { value: "opportunity_scoring", label: "Opportunity Scoring" },
  { value: "ai_website_generation", label: "AI Website Generation" },
  { value: "image_relevance", label: "Image Relevance" },
  { value: "website_editing", label: "Website Editing" },
  { value: "website_previews", label: "Website Previews" },
  { value: "outreach_preparation", label: "Outreach Preparation" },
  { value: "crm", label: "CRM & Contacts" },
  { value: "sales_pipeline", label: "Sales Pipeline" },
  { value: "customer_onboarding", label: "Customer Onboarding" },
  { value: "billing_subscriptions", label: "Billing & Subscriptions" },
  { value: "general_usability", label: "General Usability" }
];

const CATEGORY_OPTIONS: { value: BetaFeedbackCategory; label: string }[] = [
  { value: "BUG", label: "Bug / Defect" },
  { value: "USABILITY", label: "Usability Problem" },
  { value: "DATA_QUALITY", label: "Data Quality" },
  { value: "VISUAL_QUALITY", label: "Visual Quality" },
  { value: "PERFORMANCE", label: "Performance & Latency" },
  { value: "SECURITY", label: "Security & Privacy" },
  { value: "FEATURE_REQUEST", label: "Feature Request" }
];

const SEVERITY_COLORS: Record<BetaIssueSeverity, string> = {
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  HIGH: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  MEDIUM: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  LOW: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
};

const STATUS_COLORS: Record<BetaIssueStatus, string> = {
  NEW: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300",
  TRIAGED: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300",
  IN_PROGRESS: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300",
  READY_FOR_RETEST: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400",
  REOPENED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
};

export default function BetaFeedbackManager() {
  const { user } = useAuth();
  const currentActor: TaskAssignee = {
    uid: user?.uid || "admin_user",
    displayName: user?.name || "Administrator",
    role: (user?.role as any) || "Admin"
  };

  const [activeSubTab, setActiveSubTab] = useState<"issues" | "analytics" | "submit">("issues");
  const [issues, setIssues] = useState<BetaIssueRecord[]>([]);
  const [analytics, setAnalytics] = useState<BetaWorkflowAnalyticsSummary | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<BetaIssueRecord | null>(null);
  const [filterModule, setFilterModule] = useState<string>("ALL");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Status progression modal state
  const [statusModalIssue, setStatusModalIssue] = useState<BetaIssueRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<BetaIssueStatus>("IN_PROGRESS");
  const [rootCause, setRootCause] = useState("");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [resolutionEvidence, setResolutionEvidence] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Reopen modal state
  const [reopenModalIssue, setReopenModalIssue] = useState<BetaIssueRecord | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  // New feedback submission form state
  const [newModule, setNewModule] = useState<BetaFeatureModule>("ai_website_generation");
  const [newCategory, setNewCategory] = useState<BetaFeedbackCategory>("BUG");
  const [newSeverity, setNewSeverity] = useState<BetaIssueSeverity>("MEDIUM");
  const [newDescription, setNewDescription] = useState("");
  const [newRecordRef, setNewRecordRef] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [hasVisualRatings, setHasVisualRatings] = useState(false);
  const [visualRatings, setVisualRatings] = useState<VisualQualityRating>({
    professionalAppearance: 4,
    businessRelevance: 4,
    heroSectionQuality: 4,
    imageRelevance: 4,
    typography: 4,
    layout: 4,
    mobileResponsiveness: 4,
    contentAccuracy: 4,
    overallPresentationQuality: 4,
    subjectiveNotes: ""
  });

  const refreshData = () => {
    const filters: any = {};
    if (filterModule !== "ALL") filters.featureModule = filterModule;
    if (filterSeverity !== "ALL") filters.severity = filterSeverity;
    if (filterStatus !== "ALL") filters.status = filterStatus;
    if (searchQuery.trim()) filters.searchQuery = searchQuery.trim();

    const result = getAdminIssueDashboardData(filters, currentActor);
    if (result.success && result.issues) {
      setIssues(result.issues);
    }
    const ana = computeBetaWorkflowAnalytics({ includeTestEvents: false });
    setAnalytics(ana);
  };

  useEffect(() => {
    refreshData();
  }, [filterModule, filterSeverity, filterStatus, searchQuery]);

  const handleAssign = (issueId: string, assigneeName: string, role: any) => {
    const res = assignBetaIssue(
      issueId,
      { uid: `usr_${Date.now()}`, displayName: assigneeName, role },
      currentActor
    );
    if (res.success) {
      setFeedbackNotice(`Issue successfully assigned to ${assigneeName}.`);
      refreshData();
      if (selectedIssue && selectedIssue.id === res.issue?.id) {
        setSelectedIssue(res.issue);
      }
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleSeverityChange = (issueId: string, sev: BetaIssueSeverity) => {
    const res = updateBetaIssueSeverity(issueId, sev, currentActor, "Admin triage adjustment");
    if (res.success) {
      setFeedbackNotice(`Severity updated to ${sev}.`);
      refreshData();
      if (selectedIssue && selectedIssue.id === res.issue?.id) {
        setSelectedIssue(res.issue);
      }
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleExecuteStatusChange = () => {
    if (!statusModalIssue) return;
    const res = updateBetaIssueStatus(statusModalIssue.id, targetStatus, currentActor, {
      rootCause: targetStatus === "RESOLVED" ? rootCause : undefined,
      affectedComponent: targetStatus === "RESOLVED" ? affectedComponent : undefined,
      resolutionEvidence: targetStatus === "RESOLVED" ? resolutionEvidence : undefined,
      resolutionNotes: targetStatus === "RESOLVED" ? resolutionNotes : undefined
    });

    if (res.success) {
      setFeedbackNotice(`Status updated to ${targetStatus}.`);
      setStatusModalIssue(null);
      setRootCause("");
      setAffectedComponent("");
      setResolutionEvidence("");
      setResolutionNotes("");
      refreshData();
      if (selectedIssue && selectedIssue.id === res.issue?.id) {
        setSelectedIssue(res.issue);
      }
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleExecuteReopen = () => {
    if (!reopenModalIssue) return;
    const res = reopenBetaIssue(reopenModalIssue.id, currentActor, reopenReason);
    if (res.success) {
      setFeedbackNotice(`Issue ${reopenModalIssue.issueNumber} reopened for re-investigation.`);
      setReopenModalIssue(null);
      setReopenReason("");
      refreshData();
      if (selectedIssue && selectedIssue.id === res.issue?.id) {
        setSelectedIssue(res.issue);
      }
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleSubmitNewFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      setFeedbackNotice("Error: Description is required.");
      return;
    }

    const attachments = screenshotUrl.trim()
      ? [
          {
            fileName: "screenshot.png",
            fileType: "image/png",
            fileSize: 102400,
            storageUrl: screenshotUrl.trim()
          }
        ]
      : undefined;

    const res = submitBetaFeedback({
      betaUserId: currentActor.uid,
      betaUserName: currentActor.displayName,
      betaUserEmail: user?.email || "tester@sitescout.ai",
      featureModule: newModule,
      category: newCategory,
      severity: newSeverity,
      description: newDescription,
      relatedRecordRef: newRecordRef.trim() || undefined,
      attachments,
      visualRatings: hasVisualRatings ? visualRatings : undefined,
      isTestSubmission: false
    });

    if (res.success && res.feedback) {
      // Auto-create issue if BUG or CRITICAL
      if (newCategory === "BUG" || newSeverity === "CRITICAL" || newSeverity === "HIGH") {
        createIssueFromFeedback(
          [res.feedback.feedbackId],
          {
            title: `[${newCategory}] ${newDescription.slice(0, 60)}...`,
            description: newDescription,
            severity: newSeverity
          },
          currentActor,
          false
        );
      }

      setFeedbackNotice(`Feedback ${res.feedback.feedbackId} submitted successfully.`);
      setNewDescription("");
      setNewRecordRef("");
      setScreenshotUrl("");
      setActiveSubTab("issues");
      refreshData();
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Beta Feedback, Issue Tracking &amp; Continuous Improvement
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured beta evaluation, verified defect classification, auditable resolution lifecycle, and workflow analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("issues")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === "issues"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Issue Tracking ({issues.length})
            </button>
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === "analytics"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Workflow Analytics
            </button>
            <button
              onClick={() => setActiveSubTab("submit")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "submit"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Submit Feedback
            </button>
          </div>

          <button
            onClick={refreshData}
            title="Refresh issues"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Banner Notice */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            feedbackNotice.startsWith("Error")
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          <span>{feedbackNotice}</span>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="font-bold underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: ISSUES LIST & TRIAGE */}
      {activeSubTab === "issues" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Module
              </label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Modules (14)</option>
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Severity
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Lifecycle Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="TRIAGED">TRIAGED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="READY_FOR_RETEST">READY_FOR_RETEST</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="REOPENED">REOPENED</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Keyword or Issue #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Issues Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-emerald-500" />
                <p className="font-semibold text-sm">No issues matching the selected filters.</p>
                <p className="text-xs">
                  Submit feedback or adjust filters to review open beta defects.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Issue Number</th>
                      <th className="p-3">Title &amp; Module</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assignee</th>
                      <th className="p-3">Created</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {issues.map((issue) => (
                      <tr
                        key={issue.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          selectedIssue?.id === issue.id ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {issue.issueNumber}
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {issue.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                              {issue.featureModule.replace(/_/g, " ")}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-slate-500">
                              {issue.category}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              SEVERITY_COLORS[issue.severity]
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              STATUS_COLORS[issue.status]
                            }`}
                          >
                            {issue.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {issue.assignedTo ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium">
                              <UserCheck className="h-3 w-3 text-indigo-500" />
                              {issue.assignedTo.displayName}
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedIssue(issue)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => {
                              setStatusModalIssue(issue);
                              setTargetStatus(
                                issue.status === "NEW"
                                  ? "TRIAGED"
                                  : issue.status === "TRIAGED"
                                  ? "IN_PROGRESS"
                                  : issue.status === "IN_PROGRESS"
                                  ? "READY_FOR_RETEST"
                                  : "RESOLVED"
                              );
                            }}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Progress
                          </button>
                          {issue.status === "RESOLVED" && (
                            <button
                              onClick={() => {
                                setReopenModalIssue(issue);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selected Issue Detail Drawer / Panel */}
          {selectedIssue && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      {selectedIssue.issueNumber}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedIssue.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reported by {selectedIssue.reportedBy.displayName || selectedIssue.reportedBy.uid} on{" "}
                    {new Date(selectedIssue.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Details Column */}
                <div className="md:col-span-2 space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                      {selectedIssue.description}
                    </p>
                  </div>

                  {selectedIssue.rootCause && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        Root Cause
                      </label>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {selectedIssue.rootCause}
                      </p>
                    </div>
                  )}

                  {selectedIssue.affectedComponent && (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        Affected Component
                      </label>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-mono text-[11px]">
                        {selectedIssue.affectedComponent}
                      </p>
                    </div>
                  )}

                  {selectedIssue.resolutionEvidence && (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        Resolution Evidence &amp; Verification
                      </label>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {selectedIssue.resolutionEvidence}
                      </p>
                    </div>
                  )}

                  {selectedIssue.reopenedReason && (
                    <div className="pt-2 border-t border-rose-200 dark:border-rose-900/40">
                      <label className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                        Reopened Reason
                      </label>
                      <p className="text-rose-800 dark:text-rose-300 mt-0.5">
                        {selectedIssue.reopenedReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Audit & Action Column */}
                <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Triage Assignee</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "engineer") handleAssign(selectedIssue.id, "Staff Engineer", "Engineer");
                          if (val === "qa") handleAssign(selectedIssue.id, "QA Analyst", "Admin");
                          if (val === "lead") handleAssign(selectedIssue.id, "Product Lead", "Admin");
                        }}
                        className="w-full text-xs rounded border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Assign To...
                        </option>
                        <option value="engineer">Staff Engineer</option>
                        <option value="qa">QA Analyst</option>
                        <option value="lead">Product Lead</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Change Severity</label>
                    <div className="mt-1 flex gap-1">
                      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as BetaIssueSeverity[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSeverityChange(selectedIssue.id, s)}
                          className={`flex-1 py-1 text-[10px] font-black rounded border cursor-pointer ${
                            selectedIssue.severity === s
                              ? SEVERITY_COLORS[s]
                              : "border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {s[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Audit Trail ({selectedIssue.auditTrail.length})
                    </label>
                    <div className="mt-1.5 space-y-1.5 max-h-40 overflow-y-auto text-[10px]">
                      {selectedIssue.auditTrail.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-1.5 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-bold text-indigo-500">{entry.action}</span>
                            <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5">{entry.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WORKFLOW ANALYTICS */}
      {activeSubTab === "analytics" && analytics && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Tracked</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {analytics.totalOperations}
              </p>
              <span className="text-[10px] text-slate-400">Operations</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold uppercase text-indigo-500">Attempted</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {analytics.attempted}
              </p>
              <span className="text-[10px] text-slate-400">In-flight / Start</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-500">Successful</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics.successful}
              </p>
              <span className="text-[10px] text-emerald-500 font-bold">
                {analytics.totalOperations > 0
                  ? Math.round((analytics.successful / analytics.totalOperations) * 100)
                  : 100}
                % Success Rate
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold uppercase text-rose-500">Failed</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {analytics.failed}
              </p>
              <span className="text-[10px] text-slate-400">Error Caught</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold uppercase text-amber-500">Abandoned</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {analytics.abandoned}
              </p>
              <span className="text-[10px] text-slate-400">Incomplete Flow</span>
            </div>
          </div>

          {/* Workflow Operations Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Workflow Operational Health &amp; Completion Rates
                </h4>
                <p className="text-xs text-slate-500">
                  Granular breakdown of production beta workflows across discovery, generation, editing, outreach, and onboarding.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-mono font-bold">
                TEST EVENTS EXCLUDED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Workflow Operation</th>
                    <th className="p-3 text-center">Attempted</th>
                    <th className="p-3 text-center">Successful</th>
                    <th className="p-3 text-center">Failed</th>
                    <th className="p-3 text-center">Abandoned</th>
                    <th className="p-3 text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {Object.entries(analytics.operationsBreakdown).map(([opKey, stat]: [string, any]) => (
                    <tr key={opKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {opKey.replace(/_/g, " ").toUpperCase()}
                      </td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-300">{stat.attempted}</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">{stat.successful}</td>
                      <td className="p-3 text-center text-rose-500 font-bold">{stat.failed}</td>
                      <td className="p-3 text-center text-amber-500">{stat.abandoned}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        {stat.successRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBMIT BETA FEEDBACK FORM */}
      {activeSubTab === "submit" && (
        <form
          onSubmit={handleSubmitNewFeedback}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-indigo-500" />
              Submit Beta Tester Feedback
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Input will be sanitized for sensitive tokens. High severity items automatically generate tracked triage issues.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Feature / Module *
              </label>
              <select
                value={newModule}
                onChange={(e) => setNewModule(e.target.value as BetaFeatureModule)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200"
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Feedback Category *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BetaFeedbackCategory)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Severity Level *
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as BetaIssueSeverity)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="CRITICAL">CRITICAL (System Blocker)</option>
                <option value="HIGH">HIGH (Degraded Feature)</option>
                <option value="MEDIUM">MEDIUM (Standard Issue)</option>
                <option value="LOW">LOW (Cosmetic / Minor)</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Description &amp; Observed Problem *
            </label>
            <textarea
              rows={4}
              placeholder="Provide clear steps to reproduce, what you observed vs expected behavior..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Related Record Ref (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. prospect_123, site_abc, order_xyz"
                value={newRecordRef}
                onChange={(e) => setNewRecordRef(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Screenshot / Evidence URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://storage.googleapis.com/... or secure data URL"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Optional Visual Quality Rating Matrix */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVisualRatings}
                  onChange={(e) => setHasVisualRatings(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Attach 9-Dimension Visual Quality Evaluation
              </label>
              <span className="text-[10px] text-slate-400 italic">
                Subjective tester evaluation score
              </span>
            </div>

            {hasVisualRatings && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs">
                {[
                  { key: "professionalAppearance", label: "Professional Appearance" },
                  { key: "businessRelevance", label: "Business Relevance" },
                  { key: "heroSectionQuality", label: "Hero Section Quality" },
                  { key: "imageRelevance", label: "Image Relevance" },
                  { key: "typography", label: "Typography" },
                  { key: "layout", label: "Layout & Spacing" },
                  { key: "mobileResponsiveness", label: "Mobile Responsiveness" },
                  { key: "contentAccuracy", label: "Content Accuracy" },
                  { key: "overallPresentationQuality", label: "Overall Quality" }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{label}</span>
                    <select
                      value={(visualRatings as any)[key]}
                      onChange={(e) =>
                        setVisualRatings({
                          ...visualRatings,
                          [key]: parseInt(e.target.value, 10)
                        })
                      }
                      className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 text-xs font-bold"
                    >
                      <option value="5">5 ★</option>
                      <option value="4">4 ★</option>
                      <option value="3">3 ★</option>
                      <option value="2">2 ★</option>
                      <option value="1">1 ★</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("issues")}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Feedback
            </button>
          </div>
        </form>
      )}

      {/* STATUS PROGRESSION MODAL */}
      {statusModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Progress Issue: {statusModalIssue.issueNumber}
              </h4>
              <button
                onClick={() => setStatusModalIssue(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px] mb-1">
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as BetaIssueStatus)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs font-bold"
                >
                  <option value="TRIAGED">TRIAGED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="READY_FOR_RETEST">READY_FOR_RETEST</option>
                  <option value="RESOLVED">RESOLVED (Requires Evidence)</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              {targetStatus === "RESOLVED" && (
                <div className="space-y-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle className="h-4 w-4" />
                    Mandatory Continuous Improvement Resolution Details
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Root Cause *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Unhandled null in phone normalization"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Affected Component *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. src/lib/searchNormalization.ts"
                      value={affectedComponent}
                      onChange={(e) => setAffectedComponent(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Resolution Evidence *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Added null-check & 4 regression tests in unit.test.ts"
                      value={resolutionEvidence}
                      onChange={(e) => setResolutionEvidence(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Resolution Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified across 10 sample businesses"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStatusModalIssue(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteStatusChange}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN ISSUE MODAL */}
      {reopenModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Reopen Issue: {reopenModalIssue.issueNumber}
              </h4>
              <button
                onClick={() => setReopenModalIssue(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <label className="block font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                Reason for Reopening *
              </label>
              <textarea
                rows={3}
                placeholder="Explain why the fix was insufficient or regressed during retesting..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setReopenModalIssue(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReopen}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
