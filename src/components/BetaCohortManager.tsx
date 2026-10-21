import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  CheckCircle,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Building2,
  Briefcase,
  Store,
  Layers,
  Activity,
  FileCheck,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  BetaCohort,
  BetaCohortDashboardData,
  BetaInvitation,
  BetaInvitationStatus,
  BetaOnboardingStatus,
  BetaParticipantRecord,
  BetaParticipantType,
  TaskAssignee
} from "../types";
import {
  getBetaCohortDashboard,
  getBetaCohortsList,
  prepareBetaInvitation,
  approveBetaInvitation,
  dispatchBetaInvitation,
  revokeBetaInvitation,
  generateInvitationLink,
  updateCohortTarget
} from "../lib/betaCohortRecruitment";
import { useAuth } from "../lib/AuthContext";

const TYPE_ICONS: Record<BetaParticipantType, any> = {
  DIGITAL_AGENCY: Briefcase,
  SMALL_BUSINESS: Store,
  MEDIUM_BUSINESS: Building2,
  INTERNAL_TESTER: Layers
};

const STATUS_BADGES: Record<BetaInvitationStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  SENT: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300",
  ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  DECLINED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300",
  EXPIRED: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  REVOKED: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
};

export default function BetaCohortManager() {
  const { user } = useAuth();
  const currentActor: TaskAssignee = {
    uid: user?.uid || "admin_user",
    displayName: user?.name || "Administrator",
    role: (user?.role as any) || "Admin"
  };

  const [dashboardData, setDashboardData] = useState<BetaCohortDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"invitations" | "participants" | "invite_form" | "terms_preview">("invitations");
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New invitation form states
  const [participantType, setParticipantType] = useState<BetaParticipantType>("DIGITAL_AGENCY");
  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [notes, setNotes] = useState("");

  // Revocation modal state
  const [revokingInvitation, setRevokingInvitation] = useState<BetaInvitation | null>(null);
  const [revocationReason, setRevocationReason] = useState("");

  const refreshData = () => {
    const res = getBetaCohortDashboard(undefined, currentActor, { includeTestAccounts: false });
    if (res.success && res.dashboard) {
      setDashboardData(res.dashboard);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCopyLink = (inv: BetaInvitation) => {
    const link = generateInvitationLink(inv);
    navigator.clipboard.writeText(link);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2500);
    setFeedbackNotice(`Secure invitation link copied for ${inv.organizationName}.`);
  };

  const handleApprove = (invitationId: string) => {
    const res = approveBetaInvitation(invitationId, currentActor);
    if (res.success) {
      setFeedbackNotice("Invitation approved. You can now securely share the invitation link.");
      refreshData();
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleConfirmSent = (invitationId: string) => {
    const res = dispatchBetaInvitation(invitationId, currentActor, {
      confirmDelivery: true,
      provider: "Direct Outreach / Manual Handover"
    });
    if (res.success) {
      setFeedbackNotice("Invitation marked as SENT. Delivery confirmed.");
      refreshData();
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleExecuteRevoke = () => {
    if (!revokingInvitation) return;
    const res = revokeBetaInvitation(revokingInvitation.id, revocationReason, currentActor);
    if (res.success) {
      setFeedbackNotice(`Invitation ${revokingInvitation.invitationCode} revoked successfully.`);
      setRevokingInvitation(null);
      setRevocationReason("");
      refreshData();
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

    const res = prepareBetaInvitation(
      {
        cohortId: dashboardData.cohort.id,
        participantType,
        organizationName,
        contactName,
        contactEmail,
        contactPhone: contactPhone.trim() || undefined,
        expiresInDays,
        notes: notes.trim() || undefined,
        isTestInvitation: false
      },
      currentActor
    );

    if (res.success && res.invitation) {
      setFeedbackNotice(
        `Invitation ${res.invitation.invitationCode} prepared for ${res.invitation.organizationName}.`
      );
      setOrganizationName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setNotes("");
      setActiveTab("invitations");
      refreshData();
    } else {
      setFeedbackNotice(`Error: ${res.error}`);
    }
  };

  if (!dashboardData) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
        <p className="text-xs">Loading Beta Tester Cohort Dashboard...</p>
      </div>
    );
  }

  const {
    cohort,
    targetParticipants,
    invitationsPrepared,
    invitationsSent,
    invitationsAccepted,
    activeParticipants,
    completedOnboarding,
    feedbackReceived,
    outstandingIssues,
    invitations,
    participants
  } = dashboardData;

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              {cohort.name}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {cohort.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {cohort.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("invite_form")}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Invited Tester
          </button>
          <button
            onClick={refreshData}
            title="Refresh Cohort Data"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notice Banner */}
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

      {/* Cohort Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Target Cohort</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {targetParticipants}
          </p>
          <span className="text-[10px] text-indigo-500 font-bold">Planned Participants</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400">Prepared</span>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
            {invitationsPrepared}
          </p>
          <span className="text-[10px] text-slate-400">Draft / Approved</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-sky-500">Invitations Sent</span>
          <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {invitationsSent}
          </p>
          <span className="text-[10px] text-slate-400">Dispatched Links</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-emerald-500">Accepted</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {invitationsAccepted}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold">
            {targetParticipants > 0 ? Math.round((invitationsAccepted / targetParticipants) * 100) : 0}% of Target
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-indigo-500">Active Testers</span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {activeParticipants}
          </p>
          <span className="text-[10px] text-slate-400">Using Platform</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase text-amber-500">Feedback Logged</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {feedbackReceived}
          </p>
          <span className="text-[10px] text-slate-400">{outstandingIssues} Issues Open</span>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab("invitations")}
          className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "invitations"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Invitations Pipeline ({invitations.length})
        </button>
        <button
          onClick={() => setActiveTab("participants")}
          className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "participants"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Enrolled Participants ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab("invite_form")}
          className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "invite_form"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Prepare New Invitation
        </button>
        <button
          onClick={() => setActiveTab("terms_preview")}
          className={`pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "terms_preview"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Beta Onboarding &amp; Terms
        </button>
      </div>

      {/* TAB 1: INVITATIONS PIPELINE */}
      {activeTab === "invitations" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <UserPlus className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm">No beta invitations prepared yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Add Invited Tester&quot; to prepare personalized invitations for agency and SMB candidates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Code / Organization</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Expires</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {invitations.map((inv) => {
                    const TypeIcon = TYPE_ICONS[inv.participantType] || Briefcase;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {inv.invitationCode}
                          </p>
                          <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                            {inv.organizationName}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <TypeIcon className="h-3.5 w-3.5 text-slate-400" />
                            {inv.participantType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="text-slate-800 dark:text-slate-200">{inv.contactName}</p>
                          <p className="text-[10px] text-slate-400">{inv.contactEmail}</p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              STATUS_BADGES[inv.status]
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {inv.status === "DRAFT" && (
                            <button
                              onClick={() => handleApprove(inv.id)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {(inv.status === "APPROVED" || inv.status === "SENT") && (
                            <>
                              <button
                                onClick={() => handleCopyLink(inv)}
                                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Copy Secure Invite Link"
                              >
                                {copiedToken === inv.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-slate-500" />
                                )}
                                Copy Link
                              </button>

                              {inv.status === "APPROVED" && (
                                <button
                                  onClick={() => handleConfirmSent(inv.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                  title="Mark as dispatched"
                                >
                                  Mark Sent
                                </button>
                              )}
                            </>
                          )}

                          {inv.status !== "ACCEPTED" && inv.status !== "REVOKED" && (
                            <button
                              onClick={() => setRevokingInvitation(inv)}
                              className="px-2 py-1 rounded hover:bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENROLLED PARTICIPANTS */}
      {activeTab === "participants" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {participants.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm">No participants enrolled yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                As invited testers accept their invitations and agree to beta terms, their live activity will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Tester / Organization</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Onboarding Status</th>
                    <th className="p-3 text-center">Searches</th>
                    <th className="p-3 text-center">Websites</th>
                    <th className="p-3 text-center">Feedback</th>
                    <th className="p-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {participants.map((part) => (
                    <tr key={part.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-white">{part.organizationName}</p>
                        <p className="text-[10px] text-slate-400">
                          {part.contactName} ({part.contactEmail})
                        </p>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300">
                        {part.participantType.replace(/_/g, " ")}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {part.onboardingStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-700 dark:text-slate-300 font-semibold">
                        {part.metrics.searchesCompleted}
                      </td>
                      <td className="p-3 text-center text-indigo-600 font-bold">
                        {part.metrics.websitesGenerated}
                      </td>
                      <td className="p-3 text-center text-amber-600 font-bold">
                        {part.metrics.feedbackSubmitted}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {new Date(part.lastActiveAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREPARE INVITATION FORM */}
      {activeTab === "invite_form" && (
        <form
          onSubmit={handleCreateInvitation}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-500" />
              Prepare Candidate Beta Tester Invitation
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Invitations are created in DRAFT status. They require administrative approval before secure link generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Participant Category *
              </label>
              <select
                value={participantType}
                onChange={(e) => setParticipantType(e.target.value as BetaParticipantType)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs font-semibold"
              >
                <option value="DIGITAL_AGENCY">Digital Agency (Agency VIP Pilot)</option>
                <option value="SMALL_BUSINESS">Small Business (SMB 1–10 employees)</option>
                <option value="MEDIUM_BUSINESS">Medium Business (10–50 employees)</option>
                <option value="INTERNAL_TESTER">Internal Operator / QA Tester</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Organization / Agency Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Digital Creatives or Ezulwini Spa"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Dlamini"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Contact Email Address *
              </label>
              <input
                type="email"
                placeholder="sarah@apexdigital.co.sz"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Contact Phone / WhatsApp (Optional)
              </label>
              <input
                type="tel"
                placeholder="+268 7600 0000"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Invitation Validity Window (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Internal Notes / Evaluation Criteria (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Focus on testing auto-repair discovery and proposal export quality..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("invitations")}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Prepare Invitation
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: BETA ONBOARDING & TERMS PREVIEW */}
      {activeTab === "terms_preview" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-indigo-500" />
              Tester Onboarding Information &amp; Beta Agreement
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              The mandatory disclosure and participation terms presented to invited testers prior to account activation.
            </p>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm">
              SiteScout AI Controlled Beta Tester Agreement
            </h5>
            <p>
              Welcome to the SiteScout AI Closed Pilot. By activating your account through a designated invitation link, you agree to evaluate pre-release software under the following terms:
            </p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>
                <strong>Purpose of Beta:</strong> The platform is made available for evaluation of AI-driven website generation, opportunity scoring, and SMB outreach workflows.
              </li>
              <li>
                <strong>Sandbox Payments:</strong> All financial and subscription features operate in test mode. Live credit cards will not be charged, and test transactions generate no commercial debt.
              </li>
              <li>
                <strong>Feedback Obligation:</strong> Participants agree to report functional defects, evaluate generated visual quality using the 9-dimension rating rubric, and participate in periodic review discussions.
              </li>
              <li>
                <strong>Data Privacy &amp; Confidentiality:</strong> All business findings and website mockups are restricted to the participant account. Testers shall not publish unreleased system vulnerabilities publicly.
              </li>
              <li>
                <strong>No Production Warranty:</strong> Pre-release services are provided &quot;as is&quot; with active monitoring and bounded automated recovery.
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Server-side gate enforces terms acknowledgement before granting session tokens.</span>
          </div>
        </div>
      )}

      {/* REVOCATION MODAL */}
      {revokingInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Revoke Invitation: {revokingInvitation.invitationCode}
              </h4>
              <button
                onClick={() => setRevokingInvitation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              Revoking this invitation for <strong>{revokingInvitation.organizationName}</strong> will immediately invalidate the secure invite link and prevent registration.
            </p>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                Revocation Reason *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Candidate no longer operating as digital agency, or duplicate record."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRevokingInvitation(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRevoke}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
