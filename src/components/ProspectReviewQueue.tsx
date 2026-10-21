import React, { useState, useMemo } from "react";
import { 
  Business, 
  ReviewActionType, 
  ReviewFilterReason, 
  UserSession,
  QualificationCriterionDetail 
} from "../types";
import { 
  getProspectReviewReasons, 
  filterProspectReviewQueue, 
  executeProspectReviewAction,
  isUserAuthorizedForReview 
} from "../lib/prospectReviewQueue";
import { 
  ClipboardCheck, AlertTriangle, ShieldCheck, 
  Clock, CheckCircle2, XCircle, Search, Filter,
  Building2, Phone, Globe, MapPin, Sparkles, User, RefreshCw,
  ExternalLink, Edit3, ShieldAlert
} from "lucide-react";

interface ProspectReviewQueueProps {
  businesses: Business[];
  onUpdateBusiness: (updated: Business) => void;
  currentUser?: UserSession | { uid: string; displayName?: string; email?: string; role?: string } | null;
  onNavigateToOutreach?: (business: Business) => void;
}

export default function ProspectReviewQueue({
  businesses,
  onUpdateBusiness,
  currentUser,
  onNavigateToOutreach
}: ProspectReviewQueueProps) {
  const [selectedBizId, setSelectedBizId] = useState<string | null>(() => {
    return businesses.length > 0 ? businesses[0].id : null;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<ReviewFilterReason>("all");
  const [selectedQualStatus, setSelectedQualStatus] = useState<string>("all");
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<"pending" | "reviewed" | "all">("pending");

  // Action Dialog States
  const [activeActionModal, setActiveActionModal] = useState<{
    type: ReviewActionType;
    field?: string;
    fieldCurrentValue?: any;
  } | null>(null);

  const [actionReason, setActionReason] = useState("");
  const [actionNewValue, setActionNewValue] = useState("");
  const [actionCitation, setActionCitation] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Active workspace tab
  const [workspaceTab, setWorkspaceTab] = useState<"fields" | "evidence" | "qualification" | "history">("fields");

  // Authorization Check
  const isAuthorized = isUserAuthorizedForReview(currentUser);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return filterProspectReviewQueue(businesses, {
      searchQuery,
      reason: selectedReason,
      qualificationStatus: selectedQualStatus,
      reviewStatus: selectedReviewStatus
    });
  }, [businesses, searchQuery, selectedReason, selectedQualStatus, selectedReviewStatus]);

  // Selected Business
  const selectedBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBizId) || (filteredQueue.length > 0 ? filteredQueue[0] : null);
  }, [businesses, selectedBizId, filteredQueue]);

  // Queue Statistics
  const queueStats = useMemo(() => {
    const total = businesses.length;
    let pendingReview = 0;
    let conflicting = 0;
    let unconfirmedWeb = 0;
    let stale = 0;
    let qualified = 0;
    let disqualified = 0;

    businesses.forEach(b => {
      const reasons = getProspectReviewReasons(b);
      if (b.reviewState === "REVIEWED") {
        if (b.qualificationStatus === "QUALIFIED") qualified++;
        if (b.qualificationStatus === "DISQUALIFIED") disqualified++;
      } else if (reasons.length > 0 || b.qualificationStatus === "NEEDS_REVIEW" || b.qualificationStatus === "UNQUALIFIED") {
        pendingReview++;
      }

      if (b.hasConflictingData || (b.conflicts && b.conflicts.length > 0)) conflicting++;
      if (b.websiteNeedStatus === "UNCONFIRMED_NEED" || b.presence?.websiteStatus === "WEBSITE_NOT_DISCOVERED") unconfirmedWeb++;
      
      const lastCheck = b.presence?.lastCheckedAt || b.evidence?.checkedAt;
      if (lastCheck) {
        const ageDays = (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 90) stale++;
      }
    });

    return { total, pendingReview, conflicting, unconfirmedWeb, stale, qualified, disqualified };
  }, [businesses]);

  const handleOpenActionModal = (type: ReviewActionType, field?: string, currentValue?: any) => {
    setActionError(null);
    setActionSuccessNotice(null);
    setActionReason("");
    setActionNewValue(currentValue ? String(currentValue) : "");
    setActionCitation("");
    setActiveActionModal({
      type,
      field,
      fieldCurrentValue: currentValue
    });
  };

  const handleExecuteAction = () => {
    if (!selectedBusiness) return;
    if (!activeActionModal) return;

    if (!actionReason || actionReason.trim().length < 5) {
      setActionError("Please provide a clear documented reason (at least 5 characters).");
      return;
    }

    const reviewerContext = {
      uid: currentUser?.uid || "usr_reviewer_default",
      displayName: (currentUser as any)?.displayName || (currentUser as any)?.name || currentUser?.email || "Lead Reviewer",
      email: currentUser?.email,
      role: (currentUser as any)?.role || "Lead Reviewer"
    };

    const res = executeProspectReviewAction(selectedBusiness, {
      action: activeActionModal.type,
      fieldChanged: activeActionModal.field,
      newValue: activeActionModal.field ? actionNewValue : undefined,
      reason: actionReason.trim(),
      evidenceCitation: actionCitation.trim() || undefined,
      user: reviewerContext
    });

    if (res.success) {
      onUpdateBusiness(res.business);
      setActionSuccessNotice(`Action "${activeActionModal.type.replace(/_/g, " ")}" recorded successfully.`);
      setActiveActionModal(null);
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } else {
      setActionError(res.error || "Failed to execute review action.");
    }
  };

  const currentReasons = selectedBusiness ? getProspectReviewReasons(selectedBusiness) : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Queue Summary */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Prospect Review Queue &amp; Qualification Console
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect unconfirmed evidence, resolve directory conflicts, verify coordinates, and enforce documented qualification criteria.
                </p>
              </div>
            </div>
          </div>

          {!isAuthorized && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Read-Only Mode: Sign in with reviewer privileges to submit qualification decisions.</span>
            </div>
          )}
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div 
            onClick={() => { setSelectedReviewStatus("pending"); setSelectedReason("all"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReviewStatus === "pending" && selectedReason === "all"
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Review</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{queueStats.pendingReview}</div>
          </div>

          <div 
            onClick={() => { setSelectedReviewStatus("all"); setSelectedReason("conflicting_data"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReason === "conflicting_data"
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Conflicts</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{queueStats.conflicting}</div>
          </div>

          <div 
            onClick={() => { setSelectedReviewStatus("all"); setSelectedReason("unconfirmed_website"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReason === "unconfirmed_website"
                ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unconfirmed Web</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">{queueStats.unconfirmedWeb}</div>
          </div>

          <div 
            onClick={() => { setSelectedReviewStatus("all"); setSelectedReason("stale_evidence"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReason === "stale_evidence"
                ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stale Audits</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{queueStats.stale}</div>
          </div>

          <div 
            onClick={() => { setSelectedReviewStatus("reviewed"); setSelectedQualStatus("QUALIFIED"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReviewStatus === "reviewed" && selectedQualStatus === "QUALIFIED"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Qualified</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{queueStats.qualified}</div>
          </div>

          <div 
            onClick={() => { setSelectedReviewStatus("reviewed"); setSelectedQualStatus("DISQUALIFIED"); }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedReviewStatus === "reviewed" && selectedQualStatus === "DISQUALIFIED"
                ? "border-slate-500 bg-slate-100 dark:bg-slate-800"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Disqualified</div>
            <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-0.5">{queueStats.disqualified}</div>
          </div>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Console Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Queue Items List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search queue by name, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Review Reason</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as ReviewFilterReason)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Reasons</option>
                  <option value="conflicting_data">Conflicting Data</option>
                  <option value="unconfirmed_website">Unconfirmed Website</option>
                  <option value="stale_evidence">Stale Evidence (&gt;90d)</option>
                  <option value="unlisted_contact">Unlisted Phone/Email</option>
                  <option value="low_confidence">Low Confidence</option>
                  <option value="out_of_scope">Out of Scope</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Qualification</label>
                <select
                  value={selectedQualStatus}
                  onChange={(e) => setSelectedQualStatus(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                  <option value="UNQUALIFIED">UNQUALIFIED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="DISQUALIFIED">DISQUALIFIED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Queue Prospect Cards */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
                <p className="text-sm font-semibold">No prospects matching queue filters</p>
                <p className="text-xs text-slate-400 mt-1">All filtered prospects are clear or outside selection criteria.</p>
              </div>
            ) : (
              filteredQueue.map((biz) => {
                const isSelected = selectedBusiness?.id === biz.id;
                const reasons = getProspectReviewReasons(biz);
                const qualStatus = biz.qualificationStatus || biz.qualificationResult?.status || "UNQUALIFIED";

                return (
                  <div
                    key={biz.id}
                    onClick={() => setSelectedBizId(biz.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                          {biz.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {biz.category} • {biz.address || "No address"}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 ${
                        qualStatus === "QUALIFIED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : qualStatus === "NEEDS_REVIEW"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                            : qualStatus === "DISQUALIFIED"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {qualStatus}
                      </span>
                    </div>

                    {/* Review Triggers Tags */}
                    {reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {reasons.slice(0, 2).map((r, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{r}</span>
                          </span>
                        ))}
                        {reasons.length > 2 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            +{reasons.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Review & Action Workspace (7 cols) */}
        <div className="lg:col-span-7">
          {selectedBusiness ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedBusiness.name}
                    </h2>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg uppercase tracking-wider ${
                      (selectedBusiness.qualificationStatus || "UNQUALIFIED") === "QUALIFIED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : (selectedBusiness.qualificationStatus || "UNQUALIFIED") === "NEEDS_REVIEW"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : (selectedBusiness.qualificationStatus || "UNQUALIFIED") === "DISQUALIFIED"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {selectedBusiness.qualificationStatus || "UNQUALIFIED"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ID: <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{selectedBusiness.id}</code> • Priority Rank: <strong className="text-slate-800 dark:text-slate-200">#{selectedBusiness.prioritizationRank ?? selectedBusiness.qualificationResult?.prioritizationRank ?? 0}/100</strong>
                  </p>
                </div>

                {/* Primary Decision Action Shortcuts */}
                {isAuthorized && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenActionModal("qualify_prospect")}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Qualify Prospect
                    </button>
                    <button
                      onClick={() => handleOpenActionModal("disqualify_prospect")}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Disqualify
                    </button>
                  </div>
                )}
              </div>

              {/* Active Review Triggers Callout */}
              {currentReasons.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Active Review Triggers ({currentReasons.length})</span>
                  </div>
                  <ul className="text-xs text-amber-900 dark:text-amber-200/90 space-y-1 pl-5 list-disc">
                    {currentReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Workspace Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
                <button
                  onClick={() => setWorkspaceTab("fields")}
                  className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                    workspaceTab === "fields"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Field Verification
                </button>

                <button
                  onClick={() => setWorkspaceTab("evidence")}
                  className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                    workspaceTab === "evidence"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Evidence &amp; Deficits
                </button>

                <button
                  onClick={() => setWorkspaceTab("qualification")}
                  className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                    workspaceTab === "qualification"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Qualification Criteria
                </button>

                <button
                  onClick={() => setWorkspaceTab("history")}
                  className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                    workspaceTab === "history"
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Decision History ({selectedBusiness.reviewDecisions?.length || 0})
                </button>
              </div>

              {/* Tab 1: Field Verification & Correction */}
              {workspaceTab === "fields" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confirm or correct key business coordinates. Corrections will attach an evidence citation and update the business truth profile.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Business Name */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Name</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.name}</div>
                      </div>
                      {isAuthorized && (
                        <button
                          onClick={() => handleOpenActionModal("correct_field", "name", selectedBusiness.name)}
                          className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium shrink-0"
                        >
                          Correct
                        </button>
                      )}
                    </div>

                    {/* Category */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.category}</div>
                      </div>
                      {isAuthorized && (
                        <button
                          onClick={() => handleOpenActionModal("correct_field", "category", selectedBusiness.category)}
                          className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium shrink-0"
                        >
                          Correct
                        </button>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Coordinate</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          {selectedBusiness.phone || "Unlisted"}
                        </div>
                      </div>
                      {isAuthorized && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenActionModal("confirm_field", "phone", selectedBusiness.phone)}
                            className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleOpenActionModal("correct_field", "phone", selectedBusiness.phone)}
                            className="px-2 py-1 text-[11px] rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium"
                          >
                            Correct
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Address</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {selectedBusiness.address || "Unlisted"}
                        </div>
                      </div>
                      {isAuthorized && (
                        <button
                          onClick={() => handleOpenActionModal("correct_field", "address", selectedBusiness.address)}
                          className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium shrink-0"
                        >
                          Correct
                        </button>
                      )}
                    </div>

                    {/* Website URL */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 md:col-span-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website URL</span>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-purple-500" />
                          {selectedBusiness.presence?.websiteUrl || selectedBusiness.sourceUrl || "No website domain indexed"}
                        </div>
                      </div>
                      {isAuthorized && (
                        <button
                          onClick={() => handleOpenActionModal("correct_field", "websiteUrl", selectedBusiness.presence?.websiteUrl || "")}
                          className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-medium shrink-0"
                        >
                          Update URL
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Evidence & Deficit Findings */}
              {workspaceTab === "evidence" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Technical Findings &amp; Evidence Flags
                    </h3>
                    {isAuthorized && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenActionModal("mark_evidence_stale")}
                          className="px-2.5 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-medium"
                        >
                          Mark Stale
                        </button>
                        <button
                          onClick={() => handleOpenActionModal("mark_evidence_conflicting")}
                          className="px-2.5 py-1 text-xs rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium"
                        >
                          Flag Conflict
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Presence Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Status</div>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.presence?.websiteStatus || "NONE"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Audited</div>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.presence?.isAudited ? "Yes (Live HTTP)" : "No (Pending)"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">SSL Certificate</div>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.presence?.sslStatus ? "Secure (HTTPS)" : "Unsecured"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Need Classification</div>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{selectedBusiness.websiteNeedStatus || "UNCONFIRMED_NEED"}</div>
                    </div>
                  </div>

                  {/* Evidence Items List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Supporting Evidence Citations</span>
                    {selectedBusiness.evidenceList && selectedBusiness.evidenceList.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedBusiness.evidenceList.map((ev, i) => (
                          <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-start justify-between gap-3 text-xs">
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{ev.title || ev.sourceType}</div>
                              <p className="text-slate-500 text-[11px] mt-0.5">{ev.evidenceText || ev.url}</p>
                              <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                                <span>Supports: {ev.supports.join(", ")}</span>
                                <span>•</span>
                                <span>Retrieved: {new Date(ev.retrievedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {ev.url && ev.url.startsWith("http") && (
                              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
                        No external evidence citations registered. Initial discovery from {selectedBusiness.directorySource || "Google Maps"}.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Qualification Criteria Matrix */}
              {workspaceTab === "qualification" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Standardized Qualification Matrix
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        Score: {selectedBusiness.qualificationScore ?? selectedBusiness.qualificationResult?.qualificationScore ?? 0}%
                      </span>
                    </div>

                    {selectedBusiness.qualificationResult?.criteria && (
                      <div className="space-y-2 pt-1">
                        {Object.entries(selectedBusiness.qualificationResult.criteria).map(([key, rawCrit]) => {
                          const crit = rawCrit as QualificationCriterionDetail;
                          return (
                          <div key={key} className="flex items-start justify-between gap-3 text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                {crit.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span>{crit.label}</span>
                                {crit.isMandatory && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                                    Mandatory
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 pl-5">{crit.explanation}</p>
                            </div>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                              +{crit.scoreContribution} pts
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual Override Action Controls */}
                  {isAuthorized && (
                    <div className="pt-2 flex flex-wrap gap-2.5">
                      <button
                        onClick={() => handleOpenActionModal("qualify_prospect")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Qualification
                      </button>

                      <button
                        onClick={() => handleOpenActionModal("disqualify_prospect")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-xs flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Disqualify Prospect
                      </button>

                      <button
                        onClick={() => handleOpenActionModal("request_reverification")}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Request Re-Audit
                      </button>

                      {selectedBusiness.qualificationResult?.isManualOverride && (
                        <button
                          onClick={() => handleOpenActionModal("revert_qualification")}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        >
                          Revert Manual Override
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Decision & Audit History */}
              {workspaceTab === "history" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Review Actions &amp; Audit Trail
                  </h3>

                  {selectedBusiness.reviewDecisions && selectedBusiness.reviewDecisions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedBusiness.reviewDecisions.map((dec) => (
                        <div key={dec.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white capitalize">
                              {dec.action.replace(/_/g, " ")} {dec.fieldChanged ? `(${dec.fieldChanged})` : ""}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(dec.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            &ldquo;{dec.reason}&rdquo;
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span>Reviewer: <strong>{dec.reviewerName}</strong> ({dec.reviewerRole})</span>
                            {dec.resultingStatus && (
                              <>
                                <span>•</span>
                                <span>Result: <strong>{dec.resultingStatus}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs text-center">
                      No review decisions recorded yet for this prospect.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              <ClipboardCheck className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Select a Prospect to Review</h3>
              <p className="text-xs text-slate-400 mt-1">Choose an item from the queue on the left to inspect evidence, correct fields, or submit a qualification decision.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Execution Modal */}
      {activeActionModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize">
                  {activeActionModal.type.replace(/_/g, " ")}
                </h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target Prospect: <strong className="text-slate-900 dark:text-white">{selectedBusiness.name}</strong>
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                {actionError}
              </div>
            )}

            {/* Field edit inputs if correcting field */}
            {activeActionModal.field && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  New Value for {activeActionModal.field}
                </label>
                <input
                  type="text"
                  value={actionNewValue}
                  onChange={(e) => setActionNewValue(e.target.value)}
                  placeholder={`Enter verified ${activeActionModal.field}...`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* Evidence Citation URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Evidence Source URL or Reference (Optional)
              </label>
              <input
                type="text"
                value={actionCitation}
                onChange={(e) => setActionCitation(e.target.value)}
                placeholder="e.g. https://yellowpages.sz/listing/104 or In-Person Visit"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Mandatory Structured Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Documented Reason / Review Rationale <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Document the verified justification for this decision (e.g. 'Verified active business via directory citation. Owner confirmed plumbing services.')."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
              >
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
