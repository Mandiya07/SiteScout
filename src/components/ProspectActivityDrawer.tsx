import React, { useState, useEffect, FormEvent } from "react";
import { 
  Business, CanonicalSalesStage, ProspectActivity, 
  ProspectNote, ProspectFollowUp, CapturedLead,
  PreviewApprovalStatus, ContractStatus, PaymentStatus, DealOutcome, LifecycleAuditEvent,
  QualificationAuditEvent, ProspectContactValidationProfile, OutreachApprovalStatus,
  OutreachDraft, OutreachDraftChannel, OutreachTone, OutreachDraftLength,
  FollowUpTask, FollowUpTaskType, FollowUpTaskStatus, FollowUpTaskPriority, TaskAssignee
} from "../types";
import { 
  getBusinessActivities, addBusinessActivity, 
  getBusinessNotes, addBusinessNote, deleteBusinessNote, updateBusinessNote,
  getBusinessFollowUps, addBusinessFollowUp, updateBusinessFollowUp, deleteBusinessFollowUp,
  getBusinessLeads, updateBusinessLeadStatus,
  getBusinessLifecycleAuditEvents, updatePreviewApprovalStatus, updateContractStatus, updatePaymentStatus, updateDealOutcome,
  CANONICAL_STAGES, toCanonicalStage, getStageMeta, canonicalToProspectStatus
} from "../lib/prospectCrm";
import { getProspectQualificationAuditTrail } from "../lib/prospectQualificationAudit";
import { 
  buildProspectContactProfile, 
  updateOutreachApproval,
  prepareProspectForOutreach 
} from "../lib/prospectContactValidation";
import { 
  generatePersonalizedOutreachDraft,
  saveDraftToBusiness,
  editDraftInBusiness,
  regenerateDraftInBusiness,
  approveDraftInBusiness,
  discardDraftInBusiness,
  submitDraftForReview,
  approveOutreachDraft,
  rejectOutreachDraft,
  scheduleOutreachDelivery,
  cancelScheduledDelivery,
  rescheduleOutreachDelivery,
  deliverOutreachMessage,
  validatePreflightDelivery,
  createCanonicalCommunicationRecord,
  recordCommunicationLifecycleEvent,
  recordInboundReply,
  getProspectCommunicationTimeline
} from "../lib/prospectOutreachDrafting";
import {
  createFollowUpTask,
  assignFollowUpTask,
  rescheduleFollowUpTask,
  updateFollowUpTaskStatus,
  createFollowUpFromCommunication,
  getProspectFollowUpTasks,
  isTaskOverdue,
  getEffectiveTaskStatus
} from "../lib/prospectFollowUpTasks";
import {
  FollowUpSequence,
  ProspectSequenceEnrollment,
  FollowUpSequenceStep
} from "../types";
import {
  getAvailableSequences,
  getSequenceById,
  enrollProspectInSequence,
  advanceSequenceEnrollment,
  pauseSequenceEnrollment,
  resumeSequenceEnrollment,
  cancelSequenceEnrollment,
  checkProspectSequenceEligibility
} from "../lib/prospectFollowUpSequences";
import {
  executePipelineStageTransition,
  updateDealCommercialTerms,
  CANONICAL_PIPELINE_STAGES,
  normalizePipelineStage
} from "../lib/prospectPipelineStages";
import { formatCurrency } from "../lib/prospectFinancials";
import {
  initiateCustomerOnboarding,
  updateOnboardingRequirement,
  advanceOnboardingStatus,
  pauseCustomerOnboarding
} from "../lib/customerOnboarding";
import {
  initializeCustomerProject,
  updateProjectTask,
  recordCustomerVersionApproval,
  submitProjectRevision,
  evaluateLaunchReadiness,
  advanceProjectStatus,
  recordProjectDeployment
} from "../lib/customerProjectDelivery";
import {
  verifyDeployedWebsite,
  initiateCustomerHandover,
  confirmCustomerHandover,
  completeCustomerProject,
  createSupportTicket
} from "../lib/websiteLaunchHandover";
import {
  createCustomerAccount,
  activatePaidSubscription,
  changeSubscriptionPlan,
  cancelSubscription,
  checkServiceEntitlement,
  CANONICAL_PLANS
} from "../lib/customerSubscription";
import { 
  X, Calendar, Clock, MessageSquare, Phone, Mail, 
  CheckCircle2, Plus, Pin, Trash2, Check, AlertCircle, 
  Sparkles, Send, FileText, UserCheck, ShieldCheck, ChevronRight,
  CreditCard, FileCheck, Layers, Award, RefreshCw, AlertTriangle,
  AtSign, Smartphone, MapPin, Radio, ShieldAlert, Copy, History,
  Edit3, ThumbsUp, XCircle, ChevronDown, CheckCheck, SendHorizontal,
  CalendarCheck, Ban, Lock, Play, Pause, Activity, Reply, Inbox, ArrowDownLeft, ArrowUpRight,
  Flag, User, CheckSquare, ListOrdered, GitBranch, Rocket, Globe, LifeBuoy, Headphones, Key
} from "lucide-react";

interface ProspectActivityDrawerProps {
  business: Business;
  onClose: () => void;
  onUpdateBusiness: (updated: Business) => void;
  userId?: string;
  userName?: string;
}

export default function ProspectActivityDrawer({
  business,
  onClose,
  onUpdateBusiness,
  userId,
  userName
}: ProspectActivityDrawerProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "communications" | "lifecycle" | "qualification" | "outreach" | "notes" | "followups" | "leads">("timeline");
  
  // Data states
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [followUps, setFollowUps] = useState<ProspectFollowUp[]>([]);
  const [leads, setLeads] = useState<CapturedLead[]>([]);
  const [lifecycleAudits, setLifecycleAudits] = useState<LifecycleAuditEvent[]>([]);
  const [qualAudits, setQualAudits] = useState<QualificationAuditEvent[]>(business.qualificationAuditTrail || []);
  const [qualAuditFilter, setQualAuditFilter] = useState<"ALL" | "AUTOMATED" | "HUMAN">("ALL");
  const [loading, setLoading] = useState<boolean>(true);

  // Micro-Phase 12D: Communication History & Inbound Reply State
  const [showReplyModal, setShowReplyModal] = useState<boolean>(false);
  const [replyBody, setReplyBody] = useState<string>("");
  const [replySender, setReplySender] = useState<string>("");
  const [replyParentId, setReplyParentId] = useState<string>("");
  const [commTimelineFilter, setCommTimelineFilter] = useState<"ALL" | "OUTBOUND" | "INBOUND">("ALL");

  // Micro-Phase 12A: Contact Validation & Outreach Profile State
  const [contactProfile, setContactProfile] = useState<ProspectContactValidationProfile>(() => 
    business.contactProfile || buildProspectContactProfile(business)
  );
  const [outreachApprovalNotes, setOutreachApprovalNotes] = useState("");
  const [outreachActionLoading, setOutreachActionLoading] = useState(false);
  const [outreachFeedback, setOutreachFeedback] = useState<string | null>(null);

  // Micro-Phase 12B & 12C: Personalized Outreach Draft Generation, Approval & Delivery State
  const [selectedDraftChannel, setSelectedDraftChannel] = useState<OutreachDraftChannel>("email");
  const [selectedDraftTone, setSelectedDraftTone] = useState<OutreachTone>("Consultative");
  const [selectedDraftLength, setSelectedDraftLength] = useState<OutreachDraftLength>("medium");
  const [activeDraft, setActiveDraft] = useState<OutreachDraft | null>(() => {
    if (business.outreachDrafts && business.outreachDrafts.length > 0) {
      if (business.activeOutreachDraftId) {
        return business.outreachDrafts.find(d => d.id === business.activeOutreachDraftId) || business.outreachDrafts[0];
      }
      return business.outreachDrafts[0];
    }
    return null;
  });
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);
  const [editDraftSubject, setEditDraftSubject] = useState<string>("");
  const [editDraftBody, setEditDraftBody] = useState<string>("");
  const [editDraftReason, setEditDraftReason] = useState<string>("");
  const [draftFeedback, setDraftFeedback] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [showDraftHistory, setShowDraftHistory] = useState<boolean>(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);

  // Micro-Phase 12C: Approval, Scheduling & Delivery Controls State
  const [activeDraftSubTab, setActiveDraftSubTab] = useState<"message" | "schedule" | "deliver" | "audit">("message");
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduleTime, setScheduleTime] = useState<string>("09:30");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>("");
  const [deliveryModeSelect, setDeliveryModeSelect] = useState<"PROTOCOL_CLIENT" | "DIRECT_INTEGRATION" | "SIMULATED">("PROTOCOL_CLIENT");
  const [simulateDeliveryFail, setSimulateDeliveryFail] = useState<boolean>(false);
  const [isExecutingDelivery, setIsExecutingDelivery] = useState<boolean>(false);

  // Lifecycle form states
  const [selectedPreviewStatus, setSelectedPreviewStatus] = useState<PreviewApprovalStatus>(business.previewApprovalStatus || "PENDING");
  const [previewNotes, setPreviewNotes] = useState("");
  const [selectedContractStatus, setSelectedContractStatus] = useState<ContractStatus>(business.contractStatus || "NOT_SENT");
  const [contractSignerName, setContractSignerName] = useState(business.contractSignedBy || "");
  const [contractNotes, setContractNotes] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>(business.paymentStatus || "UNPAID");
  const [paymentAmount, setPaymentAmount] = useState<number>(business.paidAmount || 0);
  const [totalContractValue, setTotalContractValue] = useState<number>(business.totalContractValue || 0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [dealClosureNotes, setDealClosureNotes] = useState("");
  const [lifecycleActionLoading, setLifecycleActionLoading] = useState(false);
  const [lifecycleFeedback, setLifecycleFeedback] = useState<string | null>(null);

  // Note form states
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"general" | "call_summary" | "objection" | "pricing" | "meeting">("general");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Micro-Phase 13A: Canonical Follow-Up Task Management State
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [followUpChannel, setFollowUpChannel] = useState<"whatsapp" | "phone" | "email" | "in_person" | "other">("whatsapp");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [taskPriority, setTaskPriority] = useState<FollowUpTaskPriority>("MEDIUM");
  const [taskType, setTaskType] = useState<FollowUpTaskType>("call");
  const [taskDueTime, setTaskDueTime] = useState("10:00");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "COMPLETED">("ALL");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [expandedTaskHistoryId, setExpandedTaskHistoryId] = useState<string | null>(null);

  // Micro-Phase 13B: Follow-Up Sequence States
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("seq_standard_multitouch");
  const [showEnrollSequenceModal, setShowEnrollSequenceModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceEnrollmentId, setAdvanceEnrollmentId] = useState<string | null>(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceApproveComm, setAdvanceApproveComm] = useState(false);
  const [expandedSequenceHistory, setExpandedSequenceHistory] = useState(false);

  // Micro-Phase 13C: Commercial Deal Terms States
  const [dealEstimatedValue, setDealEstimatedValue] = useState<string>(
    business.estimatedDealValue !== undefined ? String(business.estimatedDealValue) : (business.dealDetails?.estimatedValue !== undefined ? String(business.dealDetails.estimatedValue) : "")
  );
  const [dealAgreedValue, setDealAgreedValue] = useState<string>(
    business.agreedDealValue !== undefined ? String(business.agreedDealValue) : (business.dealDetails?.agreedValue !== undefined ? String(business.dealDetails.agreedValue) : "")
  );
  const [dealCurrency, setDealCurrency] = useState<string>(
    business.currency || business.dealDetails?.currency || "USD"
  );
  const [dealExpectedClose, setDealExpectedClose] = useState<string>(
    business.expectedCloseDate || business.dealDetails?.expectedCloseDate || ""
  );
  const [dealServicesText, setDealServicesText] = useState<string>(
    (business.proposedServices || business.dealDetails?.proposedServices || []).join(", ")
  );
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [termsSaveFeedback, setTermsSaveFeedback] = useState<string | null>(null);

  const currentStage = toCanonicalStage(business.salesStage || business.prospectStatus);
  const stageMeta = getStageMeta(currentStage);

  // Load subcollection data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [acts, nts, flws, lds, auds, qualRes] = await Promise.all([
          getBusinessActivities(business.id, userId),
          getBusinessNotes(business.id),
          getBusinessFollowUps(business.id),
          getBusinessLeads(business.id),
          getBusinessLifecycleAuditEvents(business.id),
          getProspectQualificationAuditTrail(business.id, { uid: userId || "user_local", role: "User" })
        ]);
        if (isMounted) {
          setActivities(acts);
          setNotes(nts);
          setFollowUps(flws);
          setLeads(lds);
          setLifecycleAudits(auds);
          // Merge with any in-memory business audit trail
          const combined = [
            ...(qualRes.success ? qualRes.auditTrail : []),
            ...(business.qualificationAuditTrail || [])
          ];
          const uniqueMap = new Map<string, QualificationAuditEvent>();
          combined.forEach(ev => { if (!uniqueMap.has(ev.id)) uniqueMap.set(ev.id, ev); });
          setQualAudits(Array.from(uniqueMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      } catch (err) {
        console.error("Failed to load prospect subcollections:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [business.id, userId]);

  // Lifecycle Dimension Handlers (Micro-Phase 8D)
  const handleUpdatePreview = async (e: FormEvent) => {
    e.preventDefault();
    setLifecycleActionLoading(true);
    setLifecycleFeedback(null);
    try {
      const res = await updatePreviewApprovalStatus(
        business,
        selectedPreviewStatus,
        userName || "Agency Lead",
        userId,
        previewNotes || undefined
      );
      if (res.success) {
        setLifecycleAudits(prev => [res.auditEvent, ...prev]);
        setLifecycleFeedback(`✓ Preview status updated to ${selectedPreviewStatus}`);
        onUpdateBusiness({
          ...business,
          previewApprovalStatus: selectedPreviewStatus,
          deploymentStatus: res.previewApprovalStatus === "APPROVED" ? "CLIENT_APPROVED" : business.deploymentStatus
        });
        setPreviewNotes("");
        const freshActs = await getBusinessActivities(business.id, userId);
        setActivities(freshActs);
      }
    } catch (err: any) {
      setLifecycleFeedback(`Error: ${err.message}`);
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const handleUpdateContract = async (e: FormEvent) => {
    e.preventDefault();
    setLifecycleActionLoading(true);
    setLifecycleFeedback(null);
    try {
      const res = await updateContractStatus(
        business,
        selectedContractStatus,
        userName || "Agency Lead",
        userId,
        contractNotes || undefined,
        contractSignerName || undefined
      );
      if (res.success) {
        setLifecycleAudits(prev => [res.auditEvent, ...prev]);
        setLifecycleFeedback(`✓ Contract status updated to ${selectedContractStatus}`);
        onUpdateBusiness({
          ...business,
          contractStatus: selectedContractStatus,
          contractSignedBy: contractSignerName || business.contractSignedBy,
          contractSignedAt: selectedContractStatus === "SIGNED" ? new Date().toISOString() : business.contractSignedAt
        });
        setContractNotes("");
        const freshActs = await getBusinessActivities(business.id, userId);
        setActivities(freshActs);
      }
    } catch (err: any) {
      setLifecycleFeedback(`Error: ${err.message}`);
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const handleUpdatePayment = async (e: FormEvent) => {
    e.preventDefault();
    setLifecycleActionLoading(true);
    setLifecycleFeedback(null);
    try {
      const res = await updatePaymentStatus(
        business,
        selectedPaymentStatus,
        Number(paymentAmount) || 0,
        Number(totalContractValue) || 0,
        userName || "Agency Finance",
        userId,
        paymentNotes || undefined
      );
      if (res.success) {
        setLifecycleAudits(prev => [res.auditEvent, ...prev]);
        setLifecycleFeedback(`✓ Payment status updated to ${selectedPaymentStatus}`);
        onUpdateBusiness({
          ...business,
          paymentStatus: selectedPaymentStatus,
          paidAmount: Number(paymentAmount) || 0,
          totalContractValue: Number(totalContractValue) || 0,
          paymentReceivedAt: (selectedPaymentStatus === "PAID" || selectedPaymentStatus === "PARTIALLY_PAID") ? new Date().toISOString() : business.paymentReceivedAt
        });
        setPaymentNotes("");
        const freshActs = await getBusinessActivities(business.id, userId);
        setActivities(freshActs);
      }
    } catch (err: any) {
      setLifecycleFeedback(`Error: ${err.message}`);
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  const handleExecuteDealClosure = async (outcome: DealOutcome) => {
    if (outcome === "WON") {
      const confirmed = window.confirm(
        `Confirm authorized deal closure: Mark "${business.name}" as CLOSED / WON? This is an explicit closure action.`
      );
      if (!confirmed) return;
    }

    setLifecycleActionLoading(true);
    setLifecycleFeedback(null);
    try {
      const res = await updateDealOutcome(
        business,
        outcome,
        userName || "Authorized Sales Lead",
        userId,
        dealClosureNotes || undefined,
        outcome === "WON" ? true : false
      );
      if (res.success && res.auditEvent) {
        setLifecycleAudits(prev => [res.auditEvent!, ...prev]);
        setLifecycleFeedback(`✓ Deal outcome set to ${outcome}`);
        onUpdateBusiness({
          ...business,
          dealOutcome: outcome,
          salesStage: outcome === "WON" ? "WON" : (outcome === "LOST" ? "LOST" : business.salesStage),
          prospectStatus: outcome === "WON" ? "Won" : (outcome === "LOST" ? "Lost" : business.prospectStatus),
          dealClosedAt: outcome === "WON" ? new Date().toISOString() : undefined,
          dealClosedBy: outcome === "WON" ? (userName || "Authorized Sales Lead") : undefined
        });
        setDealClosureNotes("");
        const freshActs = await getBusinessActivities(business.id, userId);
        setActivities(freshActs);
      } else {
        setLifecycleFeedback(res.message);
      }
    } catch (err: any) {
      setLifecycleFeedback(`Error: ${err.message}`);
    } finally {
      setLifecycleActionLoading(false);
    }
  };

  // Micro-Phase 12A: Outreach Approval Handler
  const handleExecuteOutreachApproval = async (newStatus: OutreachApprovalStatus) => {
    setOutreachActionLoading(true);
    setOutreachFeedback(null);
    try {
      const res = updateOutreachApproval(
        business,
        newStatus,
        { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
        outreachApprovalNotes || undefined
      );
      if (res.success) {
        setContactProfile(res.business.contactProfile || buildProspectContactProfile(res.business));
        setOutreachFeedback(`✓ Outreach approval set to ${newStatus}`);
        onUpdateBusiness(res.business);
        setOutreachApprovalNotes("");
        // Record audit activity
        await addBusinessActivity(business.id, {
          businessId: business.id,
          type: newStatus === "APPROVED" ? "outreach_approved" : "outreach_rejected",
          title: `Outreach Approval: ${newStatus}`,
          description: outreachApprovalNotes ? `Notes: ${outreachApprovalNotes}` : "Status transition recorded.",
          timestamp: new Date().toISOString(),
          actorId: userId || "user_local",
          metadata: { userName: userName || "Sales Agent", notes: outreachApprovalNotes }
        });
        const freshActs = await getBusinessActivities(business.id, userId);
        setActivities(freshActs);
      } else {
        setOutreachFeedback(res.error || "Failed to update outreach approval.");
      }
    } catch (err: any) {
      setOutreachFeedback(`Error: ${err.message}`);
    } finally {
      setOutreachActionLoading(false);
    }
  };

  // Micro-Phase 12B Draft Handlers
  const handleGenerateDraft = (overrideChannel?: OutreachDraftChannel, overrideTone?: OutreachTone) => {
    setIsGeneratingDraft(true);
    setDraftFeedback(null);
    try {
      const channel = overrideChannel || selectedDraftChannel;
      const tone = overrideTone || selectedDraftTone;
      const draft = generatePersonalizedOutreachDraft(business, {
        channel,
        tone,
        length: selectedDraftLength,
        senderName: userName || "SiteScout Digital Specialist",
        userId: userId || "user_local",
        userRole: "Sales Agent"
      });
      const { business: updatedBiz } = saveDraftToBusiness(business, draft);
      setActiveDraft(draft);
      onUpdateBusiness(updatedBiz);
      setDraftFeedback(`✓ New ${channel.toUpperCase()} draft generated (${draft.truthfulnessScore}% Grounded)`);
    } catch (err: any) {
      setDraftFeedback(`Error generating draft: ${err.message}`);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleStartEditDraft = () => {
    if (!activeDraft) return;
    setEditDraftSubject(activeDraft.subject || "");
    setEditDraftBody(activeDraft.body);
    setEditDraftReason("");
    setIsEditingDraft(true);
  };

  const handleSaveEditedDraft = () => {
    if (!activeDraft) return;
    const res = editDraftInBusiness(
      business,
      activeDraft.id,
      {
        subject: editDraftSubject || undefined,
        body: editDraftBody,
        reason: editDraftReason || "Manual edit by agent"
      },
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setIsEditingDraft(false);
      setDraftFeedback(`✓ Draft v${res.draft.version} saved (${res.draft.truthfulnessScore}% Grounded)`);
    } else {
      setDraftFeedback(res.error || "Failed to save draft edits.");
    }
  };

  const handleRegenerateDraft = () => {
    if (!activeDraft) {
      handleGenerateDraft();
      return;
    }
    const res = regenerateDraftInBusiness(
      business,
      activeDraft.id,
      {
        channel: selectedDraftChannel,
        tone: selectedDraftTone,
        length: selectedDraftLength,
        senderName: userName || "SiteScout Digital Specialist"
      },
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setDraftFeedback(`✓ Draft regenerated to v${res.draft.version}`);
    } else {
      setDraftFeedback(res.error || "Failed to regenerate draft.");
    }
  };

  const handleApproveDraft = () => {
    if (!activeDraft) return;
    const res = approveOutreachDraft(
      business,
      activeDraft.id,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      "Approved by user for delivery readiness."
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setDraftFeedback("✓ Draft approved for delivery readiness (Message saved, awaiting schedule or manual dispatch).");
    } else {
      setDraftFeedback(res.error || "Failed to approve draft.");
    }
  };

  const handleSubmitForReview = () => {
    if (!activeDraft) return;
    const res = submitDraftForReview(
      business,
      activeDraft.id,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      "Submitted draft for review and approval."
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setDraftFeedback("✓ Draft submitted for managerial review.");
    } else {
      setDraftFeedback(res.error || "Failed to submit draft for review.");
    }
  };

  const handleRejectDraft = () => {
    if (!activeDraft) return;
    if (!rejectReasonInput.trim()) {
      setDraftFeedback("Please provide a reason for rejecting the draft.");
      return;
    }
    const res = rejectOutreachDraft(
      business,
      activeDraft.id,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      rejectReasonInput.trim()
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setShowRejectModal(false);
      setRejectReasonInput("");
      setDraftFeedback("Draft returned for revisions (status: REJECTED).");
    } else {
      setDraftFeedback(res.error || "Failed to reject draft.");
    }
  };

  const handleScheduleDraft = () => {
    if (!activeDraft) return;
    const targetIso = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    const res = scheduleOutreachDelivery(
      business,
      activeDraft.id,
      {
        scheduledAt: targetIso,
        autoSend: true
      },
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setShowScheduleModal(false);
      setDraftFeedback(`✓ Message scheduled for ${new Date(targetIso).toLocaleString()} (Safe idempotency key registered)`);
    } else {
      setDraftFeedback(res.error || "Failed to schedule delivery.");
    }
  };

  const handleCancelSchedule = () => {
    if (!activeDraft) return;
    const res = cancelScheduledDelivery(
      business,
      activeDraft.id,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      "Cancelled by user"
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setDraftFeedback("✓ Scheduled delivery cancelled safely. Draft remains approved.");
    } else {
      setDraftFeedback(res.error || "Failed to cancel scheduled delivery.");
    }
  };

  const handleDeliverOutreach = () => {
    if (!activeDraft) return;
    setIsExecutingDelivery(true);
    try {
      const res = deliverOutreachMessage(
        business,
        activeDraft.id,
        {
          mode: deliveryModeSelect,
          simulateFailure: simulateDeliveryFail,
          failureReason: simulateDeliveryFail ? "Simulated test failure: Provider timeout (HTTP 504)" : undefined
        },
        { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
      );

      if (res.success && res.draft) {
        setActiveDraft(res.draft);
        onUpdateBusiness(res.business);
        if (res.protocolUrl) {
          window.open(res.protocolUrl, "_blank");
          setDraftFeedback(`✓ Dispatched client protocol (${res.draft.channel}). Protocol client launched.`);
        } else if (res.deliveryResult?.isSimulated) {
          setDraftFeedback(`✓ Sandbox simulated delivery recorded (${res.deliveryResult.providerMessageId}).`);
        } else {
          setDraftFeedback(`✓ Outreach message confirmed sent (${res.deliveryResult?.provider || "provider"}).`);
        }
      } else {
        if (res.draft) {
          setActiveDraft(res.draft);
          onUpdateBusiness(res.business);
        }
        setDraftFeedback(`Delivery Error: ${res.error || "Failed to deliver outreach message."}`);
      }
    } catch (err: any) {
      setDraftFeedback(`Dispatch Exception: ${err.message}`);
    } finally {
      setIsExecutingDelivery(false);
    }
  };

  const handleRecordInboundReply = () => {
    if (!replyParentId || !replyBody.trim()) {
      setDraftFeedback("Please provide a reply message and parent communication ID.");
      return;
    }
    const res = recordInboundReply(
      business,
      replyParentId,
      {
        senderAddress: replySender.trim() || business.email || business.phone || "prospect@domain.local",
        body: replyBody.trim(),
        isSimulated: false
      },
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success && res.replyRecord) {
      onUpdateBusiness(res.business);
      setShowReplyModal(false);
      setReplyBody("");
      setReplySender("");
      setReplyParentId("");
      setDraftFeedback(`✓ Inbound reply recorded and linked to thread (ID: ${res.replyRecord.id})`);
    } else {
      setDraftFeedback(res.error || "Failed to record inbound reply.");
    }
  };

  const handleDiscardDraft = () => {
    if (!activeDraft) return;
    const res = discardDraftInBusiness(
      business,
      activeDraft.id,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      "Discarded by agent"
    );
    if (res.success && res.draft) {
      setActiveDraft(res.draft);
      onUpdateBusiness(res.business);
      setDraftFeedback("Draft marked as discarded.");
    } else {
      setDraftFeedback(res.error || "Failed to discard draft.");
    }
  };

  const handleCopyDraft = () => {
    if (!activeDraft) return;
    const textToCopy = activeDraft.subject 
      ? `Subject: ${activeDraft.subject}\n\n${activeDraft.body}`
      : activeDraft.body;
    navigator.clipboard.writeText(textToCopy);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  // Stage change handler (Micro-Phase 13C)
  const handleStageChange = async (newStage: CanonicalSalesStage) => {
    const actor: TaskAssignee = {
      uid: userId || "user_local",
      displayName: userName || "Sales Agent",
      role: "Sales Agent"
    };

    const res = await executePipelineStageTransition(
      business,
      newStage,
      actor,
      {
        commercialTermsConfirmed: true,
        reason: `Manually transitioned to ${newStage} via activity drawer.`
      }
    );

    if (res.success) {
      onUpdateBusiness(res.business);
      const newAct = await addBusinessActivity(business.id, {
        businessId: business.id,
        type: newStage === "WON" ? "deal_won" : "follow_up_sent",
        title: `Pipeline Stage Updated: ${getStageMeta(newStage).label}`,
        description: `Transitioned prospect to ${getStageMeta(newStage).label}`,
        timestamp: new Date().toISOString(),
        actorId: userId
      }, userId);

      setActivities(prev => [newAct, ...prev]);
    }
  };

  // Add Note Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    setIsSubmittingNote(true);

    try {
      const added = await addBusinessNote(business.id, {
        businessId: business.id,
        content: newNoteContent.trim(),
        category: newNoteCategory,
        isPinned: newNotePinned
      }, userId, userName);

      setNotes(prev => [added, ...prev]);
      setNewNoteContent("");
      setNewNotePinned(false);

      // Refresh activities
      const acts = await getBusinessActivities(business.id, userId);
      setActivities(acts);
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Delete Note Handler
  const handleDeleteNote = async (noteId: string) => {
    await deleteBusinessNote(business.id, noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Pin Note Handler
  const handleTogglePinNote = async (note: ProspectNote) => {
    const updatedPinned = !note.isPinned;
    await updateBusinessNote(business.id, note.id, { isPinned: updatedPinned });
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isPinned: updatedPinned } : n));
  };

  // Micro-Phase 13A: Add Follow-Up Task Handler
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDueDate) return;

    try {
      const taskRes = createFollowUpTask(
        business,
        {
          title: followUpTitle.trim(),
          description: followUpNotes.trim() || undefined,
          dueDate: followUpDueDate,
          dueTime: taskDueTime || "10:00",
          type: taskType,
          priority: taskPriority,
          assignedTo: { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
          reminder: { enabled: true, remindBeforeMinutes: 60 }
        },
        { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
      );

      const added = await addBusinessFollowUp(business.id, {
        businessId: business.id,
        title: followUpTitle.trim(),
        dueDate: followUpDueDate,
        channel: followUpChannel,
        status: "pending",
        notes: followUpNotes.trim() || undefined
      }, userId);

      setFollowUps(prev => [added, ...prev]);
      setFollowUpTitle("");
      setFollowUpNotes("");
      setShowAddFollowUp(false);

      const updatedBiz = taskRes.success ? taskRes.business : {
        ...business,
        nextFollowUpDate: followUpDueDate
      };

      onUpdateBusiness(updatedBiz);

      const acts = await getBusinessActivities(business.id, userId);
      setActivities(acts);
    } catch (err) {
      console.error("Error scheduling follow-up:", err);
    }
  };

  // Toggle Follow-Up Status
  const handleToggleFollowUp = async (flw: ProspectFollowUp) => {
    const nextStatus = flw.status === "completed" ? "pending" : "completed";
    await updateBusinessFollowUp(business.id, flw.id, { status: nextStatus }, userId);
    setFollowUps(prev => prev.map(f => f.id === flw.id ? { ...f, status: nextStatus, completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined } : f));

    // Also update canonical follow-up tasks if present
    const matchingTask = (business.followUpTasks || []).find(t => t.title === flw.title || t.id === flw.id);
    if (matchingTask) {
      const res = updateFollowUpTaskStatus(
        business,
        matchingTask.id,
        nextStatus === "completed" ? "COMPLETED" : "OPEN",
        { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
      );
      if (res.success) {
        onUpdateBusiness(res.business);
      }
    }

    // Refresh activities
    const acts = await getBusinessActivities(business.id, userId);
    setActivities(acts);
  };

  // Reschedule Canonical Task Handler
  const handleExecuteReschedule = (taskId: string) => {
    if (!rescheduleDate) return;
    const res = rescheduleFollowUpTask(
      business,
      taskId,
      {
        dueDate: rescheduleDate,
        dueTime: rescheduleTime || "10:00"
      },
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      rescheduleReason || undefined
    );
    if (res.success) {
      onUpdateBusiness(res.business);
      setShowRescheduleModal(false);
      setRescheduleTaskId(null);
      setRescheduleReason("");
    }
  };

  // Delete Follow-Up Handler
  const handleDeleteFollowUp = async (followUpId: string) => {
    await deleteBusinessFollowUp(business.id, followUpId);
    setFollowUps(prev => prev.filter(f => f.id !== followUpId));

    if (business.followUpTasks) {
      const updatedTasks = business.followUpTasks.filter(t => t.id !== followUpId);
      onUpdateBusiness({ ...business, followUpTasks: updatedTasks });
    }
  };

  // Micro-Phase 13B: Follow-Up Sequence Handlers
  const handleEnrollSequence = (seqId: string) => {
    const res = enrollProspectInSequence(
      business,
      seqId,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success) {
      onUpdateBusiness(res.business);
      setShowEnrollSequenceModal(false);
      if (res.task) {
        setFollowUps(prev => [
          {
            id: res.task!.id,
            businessId: business.id,
            title: res.task!.title,
            dueDate: res.task!.dueDate,
            dueTime: res.task!.dueTime,
            channel: res.task!.type === "call" ? "phone" : res.task!.type === "email" ? "email" : res.task!.type === "whatsapp" ? "whatsapp" : "other",
            status: "pending",
            notes: res.task!.description,
            createdAt: res.task!.createdAt
          },
          ...prev
        ]);
      }
    }
  };

  const handleAdvanceSequence = (enrollmentId: string, approveComm?: boolean, note?: string) => {
    const res = advanceSequenceEnrollment(
      business,
      enrollmentId,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      { isMessageApproved: approveComm, customNote: note }
    );
    if (res.success) {
      onUpdateBusiness(res.business);
      setShowAdvanceModal(false);
      setAdvanceEnrollmentId(null);
      setAdvanceNote("");
      setAdvanceApproveComm(false);
      if (res.task) {
        setFollowUps(prev => [
          {
            id: res.task!.id,
            businessId: business.id,
            title: res.task!.title,
            dueDate: res.task!.dueDate,
            dueTime: res.task!.dueTime,
            channel: res.task!.type === "call" ? "phone" : res.task!.type === "email" ? "email" : res.task!.type === "whatsapp" ? "whatsapp" : "other",
            status: "pending",
            notes: res.task!.description,
            createdAt: res.task!.createdAt
          },
          ...prev
        ]);
      }
    }
  };

  const handlePauseSequence = (enrollmentId: string) => {
    const res = pauseSequenceEnrollment(
      business,
      enrollmentId,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success) {
      onUpdateBusiness(res.business);
    }
  };

  const handleResumeSequence = (enrollmentId: string) => {
    const res = resumeSequenceEnrollment(
      business,
      enrollmentId,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
    );
    if (res.success) {
      onUpdateBusiness(res.business);
    }
  };

  const handleCancelSequence = (enrollmentId: string) => {
    const res = cancelSequenceEnrollment(
      business,
      enrollmentId,
      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" },
      "Cancelled by user in prospect drawer."
    );
    if (res.success) {
      onUpdateBusiness(res.business);
    }
  };

  // Micro-Phase 13C: Commercial Deal Terms Save Handler
  const handleSaveCommercialTerms = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTerms(true);
    setTermsSaveFeedback(null);

    const parsedEst = dealEstimatedValue.trim() ? parseFloat(dealEstimatedValue) : undefined;
    const parsedAgreed = dealAgreedValue.trim() ? parseFloat(dealAgreedValue) : undefined;
    const services = dealServicesText.split(",").map(s => s.trim()).filter(Boolean);

    const actor: TaskAssignee = {
      uid: userId || "user_local",
      displayName: userName || "Sales Agent",
      role: "Sales Agent"
    };

    const res = updateDealCommercialTerms(
      business,
      {
        estimatedValue: isNaN(parsedEst as number) ? undefined : parsedEst,
        agreedValue: isNaN(parsedAgreed as number) ? undefined : parsedAgreed,
        currency: dealCurrency || "USD",
        proposedServices: services.length > 0 ? services : undefined,
        expectedCloseDate: dealExpectedClose || undefined,
        assignedOwner: actor
      },
      actor
    );

    setIsSavingTerms(false);
    if (res.success) {
      onUpdateBusiness(res.business);
      setTermsSaveFeedback("Commercial terms saved successfully.");
      setTimeout(() => setTermsSaveFeedback(null), 3000);
    } else {
      setTermsSaveFeedback(`Failed: ${res.error || "Unable to save terms."}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-xs">
                {business.name}
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${stageMeta.badgeBg}`}>
                {stageMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{business.category}</span>
              <span>•</span>
              <span>{business.phone || "No direct phone"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Stage Quick Selector */}
        <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            Pipeline Stage:
          </span>
          <select
            value={currentStage}
            onChange={(e) => handleStageChange(e.target.value as CanonicalSalesStage)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full max-w-xs cursor-pointer"
          >
            {CANONICAL_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.description})
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 pt-2 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "timeline"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Activity Timeline ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab("communications")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "communications"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Inbox className="w-4 h-4 text-purple-500" />
            Communications ({(business.communicationHistory || []).length})
          </button>
          <button
            onClick={() => setActiveTab("lifecycle")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "lifecycle"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            Lifecycle &amp; Deals
          </button>
          <button
            onClick={() => setActiveTab("qualification")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "qualification"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Qualification &amp; Audit ({qualAudits.length})
          </button>
          <button
            onClick={() => setActiveTab("outreach")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "outreach"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Send className="w-4 h-4 text-cyan-500" />
            Outreach &amp; Contacts ({contactProfile.readinessScore}%)
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "notes"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "followups"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Follow-Ups ({followUps.filter(f => f.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === "leads"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Enquiries ({leads.length})
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Loading CRM subcollections...
            </div>
          ) : (
            <>
              {/* TAB: LIFECYCLE & DEALS (Micro-Phase 8D) */}
              {activeTab === "lifecycle" && (
                <div className="space-y-6">
                  {lifecycleFeedback && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs font-semibold text-blue-800 dark:text-blue-200 flex items-center justify-between">
                      <span>{lifecycleFeedback}</span>
                      <button onClick={() => setLifecycleFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                  )}

                  {/* Summary Overview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Preview</span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 block">
                        {business.previewApprovalStatus || "PENDING"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Contract</span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 block">
                        {business.contractStatus || "NOT_SENT"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Payment</span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 block">
                        {business.paymentStatus || "UNPAID"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">4. Deal Outcome</span>
                      <span className={`text-xs font-black mt-1 block ${business.dealOutcome === "WON" ? "text-emerald-600" : business.dealOutcome === "LOST" ? "text-rose-600" : "text-blue-600"}`}>
                        {business.dealOutcome || "OPEN"}
                      </span>
                    </div>
                  </div>

                  {/* Micro-Phase 13C: Commercial Deal Terms & Deal Progress */}
                  <form onSubmit={handleSaveCommercialTerms} className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-slate-900/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Commercial Deal Terms &amp; Scope
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        Pipeline Value
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Track quoted packages, distinguish estimated value from agreed commercial value, and document proposed services.
                    </p>

                    {termsSaveFeedback && (
                      <div className="p-2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
                        {termsSaveFeedback}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Currency</label>
                        <select
                          value={dealCurrency}
                          onChange={(e) => setDealCurrency(e.target.value)}
                          className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="ZAR">ZAR (R)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="AUD">AUD ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estimated Value</label>
                        <input
                          type="number"
                          placeholder="e.g. 1200"
                          value={dealEstimatedValue}
                          onChange={(e) => setDealEstimatedValue(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Agreed Value</label>
                        <input
                          type="number"
                          placeholder="e.g. 950"
                          value={dealAgreedValue}
                          onChange={(e) => setDealAgreedValue(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Proposed Services (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Custom Website, SEO, Booking Widget, WhatsApp Integration"
                          value={dealServicesText}
                          onChange={(e) => setDealServicesText(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Close Date</label>
                        <input
                          type="date"
                          value={dealExpectedClose}
                          onChange={(e) => setDealExpectedClose(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingTerms}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                      >
                        {isSavingTerms ? "Saving Terms..." : "Save Commercial Terms"}
                      </button>
                    </div>
                  </form>

                  {/* Section 1: Preview Approval Status */}
                  <form onSubmit={handleUpdatePreview} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        1. Preview Approval Status
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">Independent Event</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tracks client feedback on the design layout. Approving the preview does NOT sign contracts or mark the deal as WON.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Approval State</label>
                        <select
                          value={selectedPreviewStatus}
                          onChange={(e) => setSelectedPreviewStatus(e.target.value as PreviewApprovalStatus)}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="PENDING">PENDING - Awaiting Client Review</option>
                          <option value="APPROVED">APPROVED - Design Accepted</option>
                          <option value="CHANGES_REQUESTED">CHANGES_REQUESTED - Revision Required</option>
                          <option value="REJECTED">REJECTED - Concept Declined</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notes / Adjustments</label>
                        <input
                          type="text"
                          value={previewNotes}
                          onChange={(e) => setPreviewNotes(e.target.value)}
                          placeholder="e.g. Client liked hero, requested minor color tweak"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={lifecycleActionLoading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Update Preview Status
                    </button>
                  </form>

                  {/* Section 2: Contract Lifecycle */}
                  <form onSubmit={handleUpdateContract} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-500" />
                        2. Contract / Agreement
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">Independent Event</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tracks legal proposal and agreement signatures. Signing does NOT confirm payment and does NOT automatically close the deal as WON.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contract State</label>
                        <select
                          value={selectedContractStatus}
                          onChange={(e) => setSelectedContractStatus(e.target.value as ContractStatus)}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="NOT_SENT">NOT_SENT - Draft Only</option>
                          <option value="SENT">SENT - Dispatched to Client</option>
                          <option value="SIGNED">SIGNED - Agreement Executed</option>
                          <option value="DECLINED">DECLINED - Terms Rejected</option>
                          <option value="EXPIRED">EXPIRED - Quote Lapsed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Signer Full Name</label>
                        <input
                          type="text"
                          value={contractSignerName}
                          onChange={(e) => setContractSignerName(e.target.value)}
                          placeholder="e.g. Sipho Dlamini (Managing Director)"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Terms Notes</label>
                        <input
                          type="text"
                          value={contractNotes}
                          onChange={(e) => setContractNotes(e.target.value)}
                          placeholder="Custom clause / 12-mo SLA"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    {business.contractSignedAt && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Signed on {new Date(business.contractSignedAt).toLocaleDateString()} by {business.contractSignedBy || "Client"}
                      </p>
                    )}

                    {/* Micro-Phase 14A: Commercial Documents & Versioned Agreements */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Versioned Commercial Documents ({(business.commercialDocuments || []).length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Audit &amp; Lifecycle Controlled
                        </span>
                      </div>
                      {(business.commercialDocuments || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No formal versioned documents issued yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(business.commercialDocuments || []).map((doc, dIdx) => (
                            <div key={doc.id || dIdx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {doc.documentNumber}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                    v{doc.currentVersion}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    doc.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                                    doc.status === "SENT" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                                    doc.status === "APPROVED" ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" :
                                    doc.status === "REJECTED" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" :
                                    "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                  }`}>
                                    {doc.status}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(doc.totalValue, doc.currency)}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                <span className="truncate max-w-[260px]">{doc.currentVersionSnapshot.title}</span>
                                <span>{doc.currentVersionSnapshot.items.length} items</span>
                              </div>
                              {doc.status === "ACCEPTED" && doc.currentVersionSnapshot.acceptance && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  ✓ Accepted by {doc.currentVersionSnapshot.acceptance.acceptedBy} ({doc.currentVersionSnapshot.acceptance.method})
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={lifecycleActionLoading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Update Contract Status
                    </button>
                  </form>

                  {/* Section 3: Payment Tracking */}
                  <form onSubmit={handleUpdatePayment} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-500" />
                        3. Payment &amp; Deposit
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">Independent Event</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tracks financial disbursements (deposits, partial payments, full settlements, refunds). Receiving payment does NOT automatically mark a deal as WON.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment State</label>
                        <select
                          value={selectedPaymentStatus}
                          onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="UNPAID">UNPAID - No Deposit</option>
                          <option value="PENDING">PENDING - Invoice Dispatched</option>
                          <option value="PARTIALLY_PAID">PARTIALLY_PAID - Deposit Paid</option>
                          <option value="PAID">PAID - Fully Settled</option>
                          <option value="FAILED">FAILED - Transaction Rejected</option>
                          <option value="REFUNDED">REFUNDED - Reimbursement</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Paid Amount ($/R)</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="e.g. 350.00"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total Contract Value ($/R)</label>
                        <input
                          type="number"
                          value={totalContractValue}
                          onChange={(e) => setTotalContractValue(parseFloat(e.target.value) || 0)}
                          placeholder="e.g. 700.00"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    {business.paymentReceivedAt && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Latest transaction recorded on {new Date(business.paymentReceivedAt).toLocaleDateString()}
                      </p>
                    )}

                    {/* Micro-Phase 13D: Financial Ledger History Display */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Financial Ledger &amp; Audit Entries ({(business.financialLedger || []).length})
                      </span>
                      {(business.financialLedger || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No financial ledger entries recorded yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(business.financialLedger || []).map((entry, eIdx) => (
                            <div key={entry.id || eIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {entry.type.replace(/_/g, " ")}
                                  </span>
                                  {entry.reference && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                      {entry.reference}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {new Date(entry.timestamp).toLocaleString()} • {entry.actor?.displayName || "Agent"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`font-mono font-bold ${entry.type === "REFUND_ISSUED" ? "text-rose-600" : entry.type === "PAYMENT_RECEIVED" ? "text-emerald-600" : "text-blue-600"}`}>
                                  {formatCurrency(entry.amount, entry.currency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={lifecycleActionLoading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Update Payment Status
                    </button>
                  </form>

                  {/* Section 4: Authorized Deal Outcome & Closure */}
                  <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        4. Authorized Deal Closure
                      </h4>
                      <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                        Outcome Governance
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      A deal becomes <strong>WON</strong> only through an explicit, authorized closure action under business rules. Deals cannot be closed merely from preview approvals, contract sending, or CRM syncs.
                    </p>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Closure Notes / Reference</label>
                      <input
                        type="text"
                        value={dealClosureNotes}
                        onChange={(e) => setDealClosureNotes(e.target.value)}
                        placeholder="e.g. Custom scope approved, deposit cleared via Stripe, production domain linked"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleExecuteDealClosure("WON")}
                        disabled={lifecycleActionLoading || business.dealOutcome === "WON"}
                        className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                          business.dealOutcome === "WON"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {business.dealOutcome === "WON" ? "✓ Deal Confirmed WON" : "Authorize & Mark as WON"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteDealClosure("LOST")}
                        disabled={lifecycleActionLoading || business.dealOutcome === "LOST"}
                        className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          business.dealOutcome === "LOST"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        Mark as LOST
                      </button>

                      {business.dealOutcome !== "OPEN" && (
                        <button
                          type="button"
                          onClick={() => handleExecuteDealClosure("OPEN")}
                          disabled={lifecycleActionLoading}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                        >
                          Re-open Deal
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section 5: Customer Onboarding & Delivery Handoff (Micro-Phase 14B) */}
                  {(business.onboardingRecord || business.dealOutcome === "WON") && (
                    <div className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                            5. Customer Onboarding &amp; Delivery Handoff
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          business.onboardingRecord?.status === "READY_FOR_DELIVERY" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                          business.onboardingRecord?.status === "ACTIVE" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                          business.onboardingRecord?.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" :
                          business.onboardingRecord?.status === "ON_HOLD" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                          "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {business.onboardingRecord?.status || "NOT_INITIATED"}
                        </span>
                      </div>

                      {business.onboardingRecord ? (
                        <div className="space-y-3 text-xs">
                          {/* Commercial & Contact Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">AGREED VALUE</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {formatCurrency(business.onboardingRecord.agreedCommercialValue, business.onboardingRecord.currency)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">PRIMARY CONTACT</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {business.onboardingRecord.contacts[0]?.name || "Client Lead"} ({business.onboardingRecord.contacts[0]?.email || "No email"})
                              </span>
                            </div>
                          </div>

                          {/* Missing Requirements Flag Box */}
                          {business.onboardingRecord.missingRequirements.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                              <span className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Incomplete Handoff ({business.onboardingRecord.missingRequirements.length} requirements missing):
                              </span>
                              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                                {business.onboardingRecord.missingRequirements.map((req, rIdx) => (
                                  <li key={rIdx}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Requirements Checklist */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              Handoff Requirements Checklist
                            </span>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {business.onboardingRecord.requirementsChecklist.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={async (e) => {
                                      const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                      const res = await updateOnboardingRequirement(
                                        business,
                                        item.id,
                                        e.target.checked,
                                        actor,
                                        e.target.checked ? "Verified via activity drawer" : undefined
                                      );
                                      if (res.success && onUpdateBusiness) {
                                        onUpdateBusiness(res.business);
                                      }
                                    }}
                                    className="mt-0.5 rounded border-slate-300 text-emerald-600 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-semibold ${item.isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                                        {item.label}
                                      </span>
                                      {item.isRequired && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold uppercase">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {item.description}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Status Advancement Actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {business.onboardingRecord.status === "PENDING" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceOnboardingStatus(business, "IN_PROGRESS", actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Begin Onboarding (IN_PROGRESS)
                              </button>
                            )}

                            {business.onboardingRecord.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceOnboardingStatus(business, "READY_FOR_DELIVERY", actor);
                                  if (!res.success) {
                                    alert(res.error);
                                  } else if (onUpdateBusiness) {
                                    onUpdateBusiness(res.business);
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Ready for Delivery Handoff
                              </button>
                            )}

                            {business.onboardingRecord.status === "READY_FOR_DELIVERY" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceOnboardingStatus(business, "ACTIVE", actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Kickoff Active Project Delivery
                              </button>
                            )}

                            {business.onboardingRecord.status === "ACTIVE" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceOnboardingStatus(business, "COMPLETED", actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Complete Onboarding
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-500">
                            Deal has been won. You can now initialize the formal customer onboarding record to gather assets, verify credentials, and schedule delivery.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                              const res = await initiateCustomerOnboarding(business, actor);
                              if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Initialize Customer Onboarding
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 6: Customer Project & Website Delivery Management (Micro-Phase 14C) */}
                  {(business.customerProject || business.onboardingRecord?.status === "READY_FOR_DELIVERY" || business.onboardingRecord?.status === "ACTIVE" || business.onboardingRecord?.status === "COMPLETED") && (
                    <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                            6. Customer Project &amp; Website Delivery
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            business.customerProject?.status === "LIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" :
                            business.customerProject?.status === "APPROVED_FOR_LAUNCH" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                            business.customerProject?.status === "REVISION_REQUIRED" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" :
                            business.customerProject?.status === "CUSTOMER_REVIEW" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                            business.customerProject?.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                            "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {business.customerProject?.status || "NOT_INITIALIZED"}
                          </span>
                        </div>
                      </div>

                      {business.customerProject ? (
                        <div className="space-y-3 text-xs">
                          {/* Project Metadata Banner */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">CURRENT RELEASE</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                Version {business.customerProject.currentWebsiteVersion}.0
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">TARGET DOMAIN / HOST</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {business.customerProject.customDomain || business.presence?.websiteUrl || "edge-cluster.sitescout.ai"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">LAUNCH STATE</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                                {business.customerProject.launchStatus}
                              </span>
                            </div>
                          </div>

                          {/* Live Deployment Evidence Card */}
                          {business.customerProject.status === "LIVE" && business.customerProject.deploymentEvidence && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="font-bold block">Verified Live Production Deployment</span>
                                  <span className="text-[10px] text-slate-500">
                                    Host: {business.customerProject.deploymentEvidence.host} • HTTP {business.customerProject.deploymentEvidence.httpStatus} • SSL Active
                                  </span>
                                </div>
                              </div>
                              <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-200/60 dark:bg-emerald-900 rounded font-bold">
                                200 OK
                              </span>
                            </div>
                          )}

                          {/* Launch Readiness Summary */}
                          {(() => {
                            const readiness = evaluateLaunchReadiness(business);
                            return (
                              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    Pre-Flight Launch Readiness
                                  </span>
                                  <span className={`text-[10px] font-bold ${readiness.isReady ? "text-emerald-600" : "text-amber-600"}`}>
                                    {readiness.isReady ? "✓ All 6 Launch Criteria Met" : `${readiness.blockers.length} Blockers Remaining`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px]">
                                  <div className={`p-1 rounded ${readiness.checks.tasksCompleted ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.tasksCompleted ? "✓ Tasks Complete" : "○ Incomplete Tasks"}
                                  </div>
                                  <div className={`p-1 rounded ${readiness.checks.customerApprovalPresent ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.customerApprovalPresent ? "✓ Version Approved" : "○ Needs Approval"}
                                  </div>
                                  <div className={`p-1 rounded ${readiness.checks.commercialTermsSatisfied ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.commercialTermsSatisfied ? "✓ Commercial Terms" : "○ Terms Pending"}
                                  </div>
                                  <div className={`p-1 rounded ${readiness.checks.hostingAndDomainConfigured ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.hostingAndDomainConfigured ? "✓ Domain Mapped" : "○ No Domain"}
                                  </div>
                                  <div className={`p-1 rounded ${readiness.checks.contentAndContactMechanismsValid ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.contentAndContactMechanismsValid ? "✓ Contacts Valid" : "○ Missing Contact"}
                                  </div>
                                  <div className={`p-1 rounded ${readiness.checks.qaScanClean ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30" : "text-slate-500 bg-slate-100 dark:bg-slate-800"}`}>
                                    {readiness.checks.qaScanClean ? "✓ Assets Complete" : "○ Assets Missing"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Project Tasks */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              Delivery Tasks &amp; Milestones ({business.customerProject.tasks.filter(t => t.isCompleted).length}/{business.customerProject.tasks.length} Completed)
                            </span>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {business.customerProject.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                                >
                                  <input
                                    type="checkbox"
                                    checked={task.isCompleted}
                                    onChange={async (e) => {
                                      const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                      const res = await updateProjectTask(
                                        business,
                                        task.id,
                                        e.target.checked,
                                        actor,
                                        e.target.checked ? "Verified via activity drawer" : undefined
                                      );
                                      if (!res.success) {
                                        alert(res.error);
                                      } else if (onUpdateBusiness) {
                                        onUpdateBusiness(res.business);
                                      }
                                    }}
                                    className="mt-0.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-semibold ${task.isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                                        {task.title}
                                      </span>
                                      {task.isRequired && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold uppercase">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                    {task.description && (
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {task.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Approval & Version Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {business.customerProject.status === "NOT_STARTED" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceProjectStatus(business, "IN_PROGRESS", actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Begin Production (IN_PROGRESS)
                              </button>
                            )}

                            {business.customerProject.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await advanceProjectStatus(business, "CUSTOMER_REVIEW", actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Submit for Customer Review
                              </button>
                            )}

                            {(business.customerProject.status === "CUSTOMER_REVIEW" || business.customerProject.status === "REVISION_REQUIRED") && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const res = await recordCustomerVersionApproval(
                                    business,
                                    {
                                      versionNumber: business.customerProject!.currentWebsiteVersion,
                                      status: "APPROVED",
                                      approverName: business.contractSignedBy || "Client Principal",
                                      approverEmail: business.email || "client@domain.com",
                                      approvalMethod: "CLIENT_DIRECT",
                                      feedbackNotes: "Approved layout without revisions."
                                    },
                                    actor
                                  );
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Record Customer Approval (v{business.customerProject.currentWebsiteVersion})
                              </button>
                            )}

                            {business.customerProject.status === "APPROVED_FOR_LAUNCH" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const mockEvidence = {
                                    verified: true,
                                    host: business.customerProject?.customDomain || "edge-production.sitescout.ai",
                                    liveUrl: `https://${business.customerProject?.customDomain || "site.sitescout.ai"}`,
                                    verifiedAt: new Date().toISOString(),
                                    httpStatus: 200,
                                    sslActive: true,
                                    deployer: actor
                                  };
                                  const res = await recordProjectDeployment(business, mockEvidence, actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <Rocket className="w-3.5 h-3.5" />
                                Deploy Live to Production
                              </button>
                            )}

                            {business.customerProject.status === "LIVE" && (
                              <div className="w-full space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                                {/* Launch Verification Action */}
                                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <div>
                                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block">
                                      Website Launch Verification
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      Status: <strong className={business.customerProject.verificationStatus === "VERIFIED_LIVE" ? "text-emerald-600" : "text-amber-600"}>
                                        {business.customerProject.verificationStatus || "PENDING_VERIFICATION"}
                                      </strong>
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                      const res = await verifyDeployedWebsite(business, actor);
                                      if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    Verify Live HTTP 200
                                  </button>
                                </div>

                                {/* Customer Handover Package */}
                                {business.customerProject.handoverRecord ? (
                                  <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[11px] space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-blue-900 dark:text-blue-200">
                                        Client Handover Package
                                      </span>
                                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {business.customerProject.handoverRecord.handoverStatus}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                                      Portal: <span className="font-mono text-indigo-600 dark:text-indigo-400">{business.customerProject.handoverRecord.accessCredentials.clientPortalUrl}</span> • Tier: <strong>{business.customerProject.handoverRecord.supportInformation.supportTier}</strong> ({business.customerProject.handoverRecord.supportInformation.slaResponseHours}h SLA)
                                    </p>
                                    {business.customerProject.handoverRecord.handoverStatus === "HANDED_OVER" && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                          const res = await confirmCustomerHandover(business, actor, {
                                            acceptedBy: business.contractSignedBy || "Client Principal",
                                            clientFeedback: "Signed off on handover package."
                                          });
                                          if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                        }}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] cursor-pointer"
                                      >
                                        Record Client Handover Acceptance
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  business.customerProject.verificationStatus === "VERIFIED_LIVE" && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                        const res = await initiateCustomerHandover(business, actor);
                                        if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                      }}
                                      className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                                    >
                                      Generate Client Handover Package
                                    </button>
                                  )
                                )}

                                {/* Formal Project Completion */}
                                {business.customerProject.verificationStatus === "VERIFIED_LIVE" && business.customerProject.handoverRecord && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                      const res = await completeCustomerProject(business, actor, "Delivery completed successfully.");
                                      if (!res.success) {
                                        alert(res.error);
                                      } else if (onUpdateBusiness) {
                                        onUpdateBusiness(res.business);
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                                  >
                                    Formally Complete Project
                                  </button>
                                )}
                              </div>
                            )}

                            {business.customerProject.status === "COMPLETED" && (
                              <div className="w-full p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Project Delivery COMPLETED
                                </div>
                                <p className="text-[10px] text-slate-500">
                                  Concluded at {business.customerProject.completionEvidence?.completedAt?.split("T")[0]}. Final Version: v{business.customerProject.completionEvidence?.finalVersion}.0.
                                </p>
                              </div>
                            )}

                            {/* Post-Launch SLA Support Tickets */}
                            {(business.customerProject.status === "LIVE" || business.customerProject.status === "COMPLETED") && (
                              <div className="w-full space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Headphones className="w-3 h-3 text-indigo-500" />
                                    Post-Launch Support Tickets ({business.customerProject.supportTickets?.length || 0})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                      const res = await createSupportTicket(
                                        business,
                                        {
                                          title: "Menu & Service Update Request",
                                          description: "Client requested price update for Q4 seasonal items.",
                                          category: "CONTENT_UPDATE",
                                          priority: "MEDIUM",
                                          reportedBy: business.contractSignedBy || "Client Principal"
                                        },
                                        actor
                                      );
                                      if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    + Open Ticket
                                  </button>
                                </div>
                                {business.customerProject.supportTickets && business.customerProject.supportTickets.length > 0 ? (
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {business.customerProject.supportTickets.map((t) => (
                                      <div key={t.id} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] flex items-center justify-between">
                                        <div>
                                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{t.ticketNumber}: {t.title}</span>
                                          <span className="text-slate-500">{t.category} • {t.slaTargetResolution}</span>
                                        </div>
                                        <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                          {t.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic">No active support tickets.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-500">
                            Onboarding requirements confirmed. Initialize customer project to track component engineering, client version sign-offs, and live deployment.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                              const res = await initializeCustomerProject(business, actor);
                              if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Initialize Customer Project
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 7: Customer Account, Subscription & Service Entitlements (Micro-Phase 15A) */}
                  <div className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          7. Customer Account &amp; Plan Entitlements
                        </h4>
                      </div>
                      {business.customerAccount && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          business.activeSubscription?.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" :
                          business.activeSubscription?.status === "TRIAL" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                          business.activeSubscription?.status === "PAST_DUE" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" :
                          "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {business.activeSubscription?.status || "NO_SUBSCRIPTION"}
                        </span>
                      )}
                    </div>

                    {business.customerAccount ? (
                      <div className="space-y-3 text-xs">
                        {/* Account & Subscription Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">CUSTOMER ID</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {business.customerAccount.customerId}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">ACTIVE PLAN</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 truncate block">
                              {business.activeSubscription?.planName || "Trial Plan"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">BILLING / RENEWAL</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300 block">
                              {business.activeSubscription?.billingInterval} ({business.activeSubscription?.currentPeriodEnd ? business.activeSubscription.currentPeriodEnd.split("T")[0] : "Active"})
                            </span>
                          </div>
                        </div>

                        {/* Service Entitlements Matrix */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Active Service Entitlements (Canonical Gate)
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                            {[
                              { key: "website_generation" as const, label: "Site Generator" },
                              { key: "website_editing" as const, label: "Live Editor" },
                              { key: "hosting" as const, label: "Cloud Hosting" },
                              { key: "custom_domain" as const, label: "Custom Domain" },
                              { key: "lead_capture" as const, label: "Lead Capture" },
                              { key: "crm" as const, label: "CRM Sync" },
                              { key: "analytics" as const, label: "Web Analytics" },
                              { key: "support_sla" as const, label: "SLA Support" },
                              { key: "ai_generation" as const, label: "AI Copy Engine" }
                            ].map((ent) => {
                              const check = checkServiceEntitlement(business, ent.key);
                              return (
                                <div
                                  key={ent.key}
                                  className={`p-1.5 rounded-lg border flex items-center justify-between ${
                                    check.entitled
                                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                                  }`}
                                  title={check.reason || "Entitled"}
                                >
                                  <span className="font-semibold">{ent.label}</span>
                                  <span className="font-mono text-[9px] font-bold">
                                    {check.entitled ? "✓ ACTIVE" : "— LOCKED"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Subscription Management Controls */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {business.activeSubscription?.status === "TRIAL" && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const paymentRef = {
                                    provider: "stripe" as const,
                                    referenceId: `ch_${Date.now()}`,
                                    paymentMethodType: "card",
                                    lastPaymentVerifiedAt: new Date().toISOString(),
                                    amountPaid: 29,
                                    currency: "USD"
                                  };
                                  const res = await activatePaidSubscription(business, "plan_starter", "MONTHLY", paymentRef, actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Activate Starter ($29/mo)
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                  const paymentRef = {
                                    provider: "stripe" as const,
                                    referenceId: `ch_${Date.now()}`,
                                    paymentMethodType: "card",
                                    lastPaymentVerifiedAt: new Date().toISOString(),
                                    amountPaid: 79,
                                    currency: "USD"
                                  };
                                  const res = await activatePaidSubscription(business, "plan_pro", "MONTHLY", paymentRef, actor);
                                  if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Upgrade to Pro ($79/mo)
                              </button>
                            </>
                          )}

                          {business.activeSubscription?.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={async () => {
                                const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                                const res = await cancelSubscription(business, actor, "Client requested cancellation");
                                if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                              }}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 rounded font-semibold text-[10px] cursor-pointer transition-colors"
                            >
                              Cancel Subscription
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                          Create a formal customer account and provision an initial 14-day free trial or paid subscription to govern service access and feature entitlements.
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            const actor: TaskAssignee = { uid: userId || "user_default", displayName: userName || "Sales Rep", role: "Sales Rep" };
                            const res = await createCustomerAccount(business, userId || "owner_default", actor);
                            if (res.success && onUpdateBusiness) onUpdateBusiness(res.business);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Initialize Customer Account (14-Day Trial)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section 8: Lifecycle Audit Trail */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Lifecycle Audit Trail ({lifecycleAudits.length} Events)
                    </h4>
                    {lifecycleAudits.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No lifecycle transition audits recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {lifecycleAudits.map((aud) => (
                          <div key={aud.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {aud.eventType.replace(/_/g, " ").toUpperCase()}: {aud.previousState} → {aud.newState}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Actor: {aud.actor} {aud.metadata?.notes ? `• "${aud.metadata.notes}"` : ""}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(aud.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: QUALIFICATION DECISION HISTORY & AUDIT TRAIL (Micro-Phase 11D) */}
              {activeTab === "qualification" && (
                <div className="space-y-4">
                  {/* Section 1: Current Qualification State Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          business.qualificationStatus === "QUALIFIED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : business.qualificationStatus === "NEEDS_REVIEW"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                            : business.qualificationStatus === "DISQUALIFIED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {business.qualificationStatus || "UNQUALIFIED"}
                        </span>
                        {business.qualificationResult?.isManualOverride && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            MANUAL OVERRIDE ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Priority Rank: {business.prioritizationRank ?? 0}/100
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Score: {business.qualificationScore ?? 0}%
                        </div>
                      </div>
                    </div>
                    {business.qualificationResult?.qualificationReason && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        {business.qualificationResult.qualificationReason}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Tamper-evident qualification history • Append-only audit record</span>
                    </div>
                  </div>

                  {/* Section 2: Audit Filter Bar */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Decision History ({qualAudits.length})
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setQualAuditFilter("ALL")}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          qualAuditFilter === "ALL"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualAuditFilter("AUTOMATED")}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          qualAuditFilter === "AUTOMATED"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        Automated ({qualAudits.filter(a => a.isAutomated).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualAuditFilter("HUMAN")}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          qualAuditFilter === "HUMAN"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        Human ({qualAudits.filter(a => !a.isAutomated).length})
                      </button>
                    </div>
                  </div>

                  {/* Section 3: Chronological Decision Audit Events */}
                  {qualAudits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No qualification events recorded yet.</p>
                      <p>Run directory discovery, HTTP verification, or review actions to establish an audit trail.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qualAudits
                        .filter(a => {
                          if (qualAuditFilter === "AUTOMATED") return a.isAutomated;
                          if (qualAuditFilter === "HUMAN") return !a.isAutomated;
                          return true;
                        })
                        .map((evt) => {
                          const isAuto = evt.isAutomated;
                          return (
                            <div
                              key={evt.id}
                              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                            >
                              {/* Header: Decision Type, Actor & Timestamp */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                    evt.decisionType === "MANUAL_OVERRIDE"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                      : evt.decisionType === "REVIEW_APPROVAL"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                      : evt.decisionType === "REVIEW_DISQUALIFICATION"
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                      : evt.decisionType === "OVERRIDE_REVERSAL"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                                      : evt.decisionType === "INITIAL_EVALUATION"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                  }`}>
                                    {evt.decisionType.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    {isAuto ? "🤖 Automated Engine" : `👤 ${evt.actor.displayName} (${evt.actor.role || "Reviewer"})`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {new Date(evt.timestamp).toLocaleString()}
                                </span>
                              </div>

                              {/* State Transition Badges */}
                              <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status:</span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">{evt.previousStatus}</span>
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-bold text-slate-900 dark:text-white">{evt.newStatus}</span>
                                </div>
                                <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold">Score:</span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">{evt.previousScore}%</span>
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-bold text-slate-900 dark:text-white">{evt.newScore}%</span>
                                </div>
                                <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold">Rank:</span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">{evt.previousPrioritizationRank}</span>
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                  <span className="font-bold text-slate-900 dark:text-white">{evt.newPrioritizationRank}</span>
                                </div>
                              </div>

                              {/* Reason / Rationale */}
                              <div className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                                "{evt.reason}"
                              </div>

                               {/* Criteria Snapshot Tags */}
                              {evt.criteriaSnapshot && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="text-[10px] text-slate-400 font-bold">Criteria:</span>
                                  {Object.entries(evt.criteriaSnapshot).map(([k, rawVal]) => {
                                    const val = rawVal as { passed?: boolean; scoreContribution?: number } | undefined;
                                    return (
                                      <span
                                        key={k}
                                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                          val?.passed
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        }`}
                                      >
                                        {k.replace(/([A-Z])/g, "_$1").toUpperCase()}: {val?.passed ? "PASS" : "FAIL"} ({val?.scoreContribution || 0}pt)
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Evidence Citations */}
                              {evt.evidenceReferences && evt.evidenceReferences.length > 0 && (
                                <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span className="font-bold">Supporting Evidence:</span>
                                  {evt.evidenceReferences.slice(0, 2).map((ref, idx) => (
                                    <p key={idx} className="truncate text-slate-600 dark:text-slate-400 font-mono">
                                      • {ref}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Immutability Footer */}
                              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                                <span>Audit ID: {evt.id}</span>
                                <span>Immutable Record</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: OUTREACH & CONTACT VALIDATION (Micro-Phase 12A) */}
              {activeTab === "outreach" && (
                <div className="space-y-4">
                  {outreachFeedback && (
                    <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60 text-xs font-semibold text-cyan-800 dark:text-cyan-200 flex items-center justify-between">
                      <span>{outreachFeedback}</span>
                      <button onClick={() => setOutreachFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                  )}

                  {/* Section 1: Outreach Readiness & Confidence Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          contactProfile.isOutreachReady
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                        }`}>
                          {contactProfile.isOutreachReady ? "✓ OUTREACH READY" : "⚠️ REVIEW REQUIRED"}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          contactProfile.contactConfidence === "HIGH"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : contactProfile.contactConfidence === "MEDIUM"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        }`}>
                          CONFIDENCE: {contactProfile.contactConfidence}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Readiness Score: {contactProfile.readinessScore}/100
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Approval: {contactProfile.outreachApprovalStatus || "NOT_REQUESTED"}
                        </div>
                      </div>
                    </div>

                    {/* Grounding & Anti-Fabrication Notice */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Evidence Grounded Contacts:</span>{" "}
                        All contact details are strictly extracted from verified public directory sources. Synthetic or invented email/phone placeholders are strictly prohibited.
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Available Outreach Channels & Validated Coordinates */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-500" />
                      Validated Contact Channels ({contactProfile.allContacts.length})
                    </h4>

                    {contactProfile.allContacts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No direct contact coordinates available in public listings.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {contactProfile.allContacts.map((cnt) => (
                          <div 
                            key={cnt.id} 
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {cnt.type === "phone" && <Phone className="w-4 h-4 text-blue-500" />}
                                {cnt.type === "email" && <Mail className="w-4 h-4 text-purple-500" />}
                                {cnt.type === "in_person" && <MapPin className="w-4 h-4 text-rose-500" />}
                                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                  {cnt.value}
                                </span>
                                {cnt.whatsappCapable && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    WhatsApp
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cnt.status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : cnt.status === "FORMAT_VALID"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : cnt.status === "INVALID"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              }`}>
                                {cnt.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                              <span>Scope: <strong className="text-slate-700 dark:text-slate-300">{cnt.contactScope}</strong></span>
                              <span>Source: <strong className="text-slate-700 dark:text-slate-300">{cnt.source}</strong></span>
                              <span>Method: <strong className="text-slate-700 dark:text-slate-300">{cnt.verificationMethod || "UNVERIFIED"}</strong></span>
                            </div>

                            {cnt.validationErrors && cnt.validationErrors.length > 0 && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded">
                                {cnt.validationErrors.join("; ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Warnings & Data Hygiene */}
                  {(contactProfile.readinessFlags.unverifiedWarnings.length > 0 || contactProfile.readinessFlags.conflicts.length > 0) && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        Outreach Verification Warnings
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {contactProfile.readinessFlags.unverifiedWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                        {contactProfile.readinessFlags.conflicts.map((c, i) => (
                          <li key={i}>Conflict: {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Section 4: Personalized Outreach Draft Generator & Truthfulness Controls (Micro-Phase 12B) */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Personalized Outreach Drafter
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Evidence-Grounded AI
                      </span>
                    </div>

                    {/* Generator Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Channel</label>
                        <select
                          value={selectedDraftChannel}
                          onChange={(e) => {
                            const newChan = e.target.value as OutreachDraftChannel;
                            setSelectedDraftChannel(newChan);
                            handleGenerateDraft(newChan, selectedDraftTone);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="email">Email</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="sms">SMS</option>
                          <option value="phone_script">Cold Call Script</option>
                          <option value="linkedin">LinkedIn DM</option>
                          <option value="in_person">In-Person Pitch</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tone</label>
                        <select
                          value={selectedDraftTone}
                          onChange={(e) => {
                            const newTone = e.target.value as OutreachTone;
                            setSelectedDraftTone(newTone);
                            handleGenerateDraft(selectedDraftChannel, newTone);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="Consultative">Consultative (Observation-First)</option>
                          <option value="Direct Gap Audit">Direct Audit (Data-Driven)</option>
                          <option value="Friendly Local">Friendly Local (Warm Neighbor)</option>
                          <option value="Executive">Executive (Strategic)</option>
                          <option value="Urgent Opportunity">Urgent Opportunity</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Length</label>
                        <select
                          value={selectedDraftLength}
                          onChange={(e) => setSelectedDraftLength(e.target.value as OutreachDraftLength)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="short">Short &amp; Punchy</option>
                          <option value="medium">Standard (Balanced)</option>
                          <option value="detailed">Detailed Diagnostic</option>
                        </select>
                      </div>
                    </div>

                    {draftFeedback && (
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{draftFeedback}</span>
                      </div>
                    )}

                    {/* Active Draft Card */}
                    {activeDraft ? (
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                        {/* Approval & Delivery Lifecycle Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Approval Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              activeDraft.isApproved || activeDraft.approvalStatus === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                : activeDraft.approvalStatus === "PENDING_REVIEW"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                                : activeDraft.approvalStatus === "REJECTED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            }`}>
                              <ShieldCheck className="w-3 h-3" />
                              Approval: {activeDraft.approvalStatus || (activeDraft.isApproved ? "APPROVED" : "DRAFT")}
                            </span>

                            {/* Delivery Status Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              activeDraft.deliveryStatus === "SENT" || activeDraft.status === "SENT"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                                : activeDraft.deliveryStatus === "SCHEDULED" || activeDraft.status === "SCHEDULED"
                                ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800"
                                : activeDraft.deliveryStatus === "PROTOCOL_DISPATCHED"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                                : activeDraft.deliveryStatus === "FAILED" || activeDraft.status === "FAILED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}>
                              <Activity className="w-3 h-3" />
                              Delivery: {activeDraft.deliveryStatus || "NOT_SCHEDULED"}
                            </span>

                            <span className="text-[10px] font-mono text-slate-500">
                              v{activeDraft.version}
                            </span>
                          </div>

                          {/* Sub-tab Switcher */}
                          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setActiveDraftSubTab("message")}
                              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                activeDraftSubTab === "message"
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              Message
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDraftSubTab("schedule")}
                              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                activeDraftSubTab === "schedule"
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              Schedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDraftSubTab("deliver")}
                              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                activeDraftSubTab === "deliver"
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              Deliver
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDraftSubTab("audit")}
                              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                                activeDraftSubTab === "audit"
                                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              Audit Trail ({activeDraft.auditTrail?.length || activeDraft.history?.length || 1})
                            </button>
                          </div>
                        </div>

                        {/* Evidence References Badges */}
                        {activeDraft.evidenceReferences && activeDraft.evidenceReferences.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400">Grounded In:</span>
                            {activeDraft.evidenceReferences.map((ref, rIdx) => (
                              <span key={rIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                📌 {ref}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* SUB-TAB: MESSAGE */}
                        {activeDraftSubTab === "message" && (
                          <>
                            {isEditingDraft ? (
                              <div className="space-y-2.5 pt-1">
                                {(activeDraft.isApproved || activeDraft.deliveryStatus === "SCHEDULED") && (
                                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Warning: Material edits will invalidate previous approval and reset scheduled state.</span>
                                  </div>
                                )}

                                {activeDraft.channel === "email" && (
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subject Line</label>
                                    <input
                                      type="text"
                                      value={editDraftSubject}
                                      onChange={(e) => setEditDraftSubject(e.target.value)}
                                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Message Body</label>
                                  <textarea
                                    rows={8}
                                    value={editDraftBody}
                                    onChange={(e) => setEditDraftBody(e.target.value)}
                                    className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Edit Reason (for Version Trail)</label>
                                  <input
                                    type="text"
                                    value={editDraftReason}
                                    onChange={(e) => setEditDraftReason(e.target.value)}
                                    placeholder="e.g. Adjusted greeting for local phrasing"
                                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedDraft}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Save v{activeDraft.version + 1}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingDraft(false)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {/* Subject preview */}
                                {activeDraft.subject && (
                                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Subject Line</span>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white pt-0.5">{activeDraft.subject}</p>
                                  </div>
                                )}

                                {/* Alternative subjects */}
                                {activeDraft.alternativeSubjects && activeDraft.alternativeSubjects.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alternative Subjects:</span>
                                    <div className="space-y-1 pl-1">
                                      {activeDraft.alternativeSubjects.map((alt, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => {
                                            setEditDraftSubject(alt);
                                            const res = editDraftInBusiness(
                                              business,
                                              activeDraft.id,
                                              { subject: alt, body: activeDraft.body, reason: "Selected alternative subject" },
                                              { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
                                            );
                                            if (res.success && res.draft) {
                                              setActiveDraft(res.draft);
                                              onUpdateBusiness(res.business);
                                            }
                                          }}
                                          className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1.5"
                                        >
                                          <span>•</span> {alt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Body preview */}
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                                    {activeDraft.body}
                                  </pre>
                                </div>

                                {/* Follow-up snippet */}
                                {activeDraft.followUpBody && (
                                  <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                      +3 Days Follow-Up Draft ({activeDraft.followUpSubject || "Follow up"})
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {activeDraft.followUpBody}
                                    </p>
                                  </div>
                                )}

                                {/* Claims & Provenance Breakdown */}
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                    Content Provenance &amp; Verification Checks ({activeDraft.claims?.length || 0} claims)
                                  </span>
                                  <div className="space-y-1">
                                    {activeDraft.claims?.map((clm) => (
                                      <div
                                        key={clm.id}
                                        className={`text-[10px] px-2.5 py-1 rounded-md border flex items-center justify-between gap-2 ${
                                          clm.isSupported
                                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                                            : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
                                        }`}
                                      >
                                        <span>{clm.claimText}</span>
                                        <span className="font-mono font-bold shrink-0 uppercase">{clm.provenance}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-slate-200 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={handleCopyDraft}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {copiedDraft ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedDraft ? "Copied to Clipboard!" : "Copy Message"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleStartEditDraft}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit Draft
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleRegenerateDraft}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Regenerate
                                  </button>

                                  {/* Review & Approval Controls */}
                                  {activeDraft.approvalStatus === "DRAFT" || !activeDraft.approvalStatus ? (
                                    <button
                                      type="button"
                                      onClick={handleSubmitForReview}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      Submit for Review
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={handleApproveDraft}
                                    disabled={activeDraft.isApproved && activeDraft.approvalStatus === "APPROVED"}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer ${
                                      activeDraft.isApproved && activeDraft.approvalStatus === "APPROVED"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    }`}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    {activeDraft.isApproved && activeDraft.approvalStatus === "APPROVED" ? "✓ Approved" : "Approve Draft"}
                                  </button>

                                  {activeDraft.approvalStatus !== "REJECTED" && (
                                    <button
                                      type="button"
                                      onClick={() => setShowRejectModal(true)}
                                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      Reject / Revisions
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={handleDiscardDraft}
                                    disabled={activeDraft.status === "discarded"}
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Discard
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* SUB-TAB: SCHEDULE */}
                        {activeDraftSubTab === "schedule" && (
                          <div className="space-y-3 pt-1">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <CalendarCheck className="w-4 h-4 text-cyan-600" />
                                  Outreach Delivery Scheduling
                                </h5>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  activeDraft.deliveryStatus === "SCHEDULED"
                                    ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}>
                                  {activeDraft.deliveryStatus === "SCHEDULED" ? "SCHEDULED FOR DELIVERY" : "NOT CURRENTLY SCHEDULED"}
                                </span>
                              </div>

                              {activeDraft.scheduleConfig ? (
                                <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 space-y-2 text-xs">
                                  <div className="flex items-center justify-between text-cyan-900 dark:text-cyan-200">
                                    <span>Scheduled Dispatch Time:</span>
                                    <span className="font-mono font-bold">{new Date(activeDraft.scheduleConfig.scheduledAt).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-cyan-700 dark:text-cyan-300">
                                    <span>Timezone:</span>
                                    <span className="font-mono">{activeDraft.scheduleConfig.timeZone}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-cyan-700 dark:text-cyan-300">
                                    <span>Scheduled By:</span>
                                    <span>{activeDraft.scheduleConfig.scheduledBy}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                                    <span>Idempotency Lock:</span>
                                    <span>{activeDraft.scheduleConfig.idempotencyKey}</span>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2 border-t border-cyan-200 dark:border-cyan-800">
                                    <button
                                      type="button"
                                      onClick={handleCancelSchedule}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      Cancel Scheduled Delivery
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowScheduleModal(true)}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Schedule this approved message to be dispatched automatically at a future time. Scheduling performs full pre-flight validation to confirm prospect qualification, contact validity, and approval integrity.
                                  </p>

                                  {!activeDraft.isApproved ? (
                                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>Approval Required: You must approve this draft before scheduling delivery.</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setShowScheduleModal(true)}
                                      className="px-3 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <CalendarCheck className="w-4 h-4" />
                                      Schedule Outreach Delivery
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUB-TAB: DELIVER */}
                        {activeDraftSubTab === "deliver" && (
                          <div className="space-y-3 pt-1">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <SendHorizontal className="w-4 h-4 text-purple-600" />
                                Delivery Readiness &amp; Dispatch Controls
                              </h5>

                              {/* Pre-flight status banner */}
                              {(() => {
                                const preflight = validatePreflightDelivery(business, activeDraft, {
                                  uid: userId || "user_local",
                                  displayName: userName || "Sales Agent",
                                  role: "Sales Agent"
                                });
                                return (
                                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                    preflight.eligible
                                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                                  }`}>
                                    <div className="flex items-center justify-between font-bold">
                                      <span className="flex items-center gap-1.5">
                                        {preflight.eligible ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                                        Pre-Flight Check: {preflight.eligible ? "ELIGIBLE FOR DISPATCH" : "BLOCKED"}
                                      </span>
                                      <span className="font-mono text-[10px]">Target: {preflight.recipientAddress || "Unassigned"}</span>
                                    </div>

                                    {preflight.blockers.length > 0 && (
                                      <ul className="list-disc pl-4 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
                                        {preflight.blockers.map((b, bIdx) => (
                                          <li key={bIdx}>{b}</li>
                                        ))}
                                      </ul>
                                    )}

                                    {preflight.warnings.length > 0 && (
                                      <ul className="list-disc pl-4 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                                        {preflight.warnings.map((w, wIdx) => (
                                          <li key={wIdx}>Warning: {w}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Delivery Mode Selector */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Integration Mode</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col gap-1 ${
                                    deliveryModeSelect === "PROTOCOL_CLIENT"
                                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
                                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="radio"
                                        name="deliveryMode"
                                        checked={deliveryModeSelect === "PROTOCOL_CLIENT"}
                                        onChange={() => setDeliveryModeSelect("PROTOCOL_CLIENT")}
                                        className="text-purple-600"
                                      />
                                      <span className="font-bold">Client Protocol</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">Opens native Mailto, WhatsApp, or SMS app</span>
                                  </label>

                                  <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col gap-1 ${
                                    deliveryModeSelect === "DIRECT_INTEGRATION"
                                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
                                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="radio"
                                        name="deliveryMode"
                                        checked={deliveryModeSelect === "DIRECT_INTEGRATION"}
                                        onChange={() => setDeliveryModeSelect("DIRECT_INTEGRATION")}
                                        className="text-purple-600"
                                      />
                                      <span className="font-bold">Direct Provider</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">Verified SMTP / API Delivery</span>
                                  </label>

                                  <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col gap-1 ${
                                    deliveryModeSelect === "SIMULATED"
                                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200"
                                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="radio"
                                        name="deliveryMode"
                                        checked={deliveryModeSelect === "SIMULATED"}
                                        onChange={() => setDeliveryModeSelect("SIMULATED")}
                                        className="text-purple-600"
                                      />
                                      <span className="font-bold">Sandbox Simulated</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">Test mode (no live messages sent)</span>
                                  </label>
                                </div>
                              </div>

                              {/* Test simulation failure checkbox */}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  id="simFailCheck"
                                  checked={simulateDeliveryFail}
                                  onChange={(e) => setSimulateDeliveryFail(e.target.checked)}
                                  className="rounded text-purple-600"
                                />
                                <label htmlFor="simFailCheck" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                  Simulate Gateway Failure (Test error logging and retry handling)
                                </label>
                              </div>

                              {/* Dispatch Action Button */}
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={handleDeliverOutreach}
                                  disabled={isExecutingDelivery || !activeDraft.isApproved}
                                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer ${
                                    !activeDraft.isApproved
                                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                                      : "bg-purple-600 hover:bg-purple-500 text-white"
                                  }`}
                                >
                                  {isExecutingDelivery ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  {isExecutingDelivery ? "Dispatching..." : `Execute Delivery (${deliveryModeSelect})`}
                                </button>

                                {activeDraft.lastDeliveryResult && (
                                  <div className="text-[11px] text-slate-500">
                                    Last Result: <strong>{activeDraft.lastDeliveryResult.deliveryStatus}</strong> ({new Date(activeDraft.lastDeliveryResult.dispatchedAt).toLocaleTimeString()})
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SUB-TAB: AUDIT TRAIL */}
                        {activeDraftSubTab === "audit" && (
                          <div className="space-y-3 pt-1">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                Outreach Event Audit Trail (Approval, Scheduling &amp; Delivery)
                              </span>

                              {activeDraft.auditTrail && activeDraft.auditTrail.length > 0 ? (
                                <div className="space-y-2 text-xs">
                                  {activeDraft.auditTrail.map((item, aIdx) => (
                                    <div key={item.id || aIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                                          {item.action.replace(/_/g, " ")}
                                        </span>
                                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-700 dark:text-slate-300">{item.details}</p>
                                      <p className="text-[10px] text-slate-400">Actor: {item.actor} ({item.actorRole})</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-2 text-xs">
                                  {activeDraft.history?.map((hist, hIdx) => (
                                    <div key={hIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                          v{hist.version} • {hist.action.toUpperCase()}
                                        </span>
                                        <span>{new Date(hist.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                        Actor: <strong>{hist.actor || "System"}</strong> ({hist.actorRole || "Agent"})
                                      </p>
                                      {hist.reason && (
                                        <p className="text-[10px] text-slate-500 italic">"{hist.reason}"</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                        <Sparkles className="w-8 h-8 mx-auto text-purple-400 opacity-60" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          No outreach draft generated yet for this prospect.
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Click below to create an evidence-grounded message personalized using confirmed Google ratings, verified contacts, and website diagnostic findings.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleGenerateDraft()}
                          disabled={isGeneratingDraft}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isGeneratingDraft ? "Generating Evidence Grounded Draft..." : "Generate Personalized Draft"}
                        </button>
                      </div>
                    )}

                    {/* Schedule Modal */}
                    {showScheduleModal && (
                      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <CalendarCheck className="w-4 h-4 text-cyan-600" />
                              Schedule Outreach Delivery
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowScheduleModal(false)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Specify the future delivery date and time. An immutable scheduling audit record and idempotency key will be registered.
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                              <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Time</label>
                              <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                            Timezone: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowScheduleModal(false)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleScheduleDraft}
                              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm Schedule
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reject Modal */}
                    {showRejectModal && (
                      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Ban className="w-4 h-4 text-rose-600" />
                              Reject Draft &amp; Request Revisions
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowRejectModal(false)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rejection Reason / Revision Instructions</label>
                            <textarea
                              rows={3}
                              value={rejectReasonInput}
                              onChange={(e) => setRejectReasonInput(e.target.value)}
                              placeholder="e.g. Please soften the urgency hook and emphasize Google reviews."
                              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowRejectModal(false)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleRejectDraft}
                              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Outreach Approval & Governance */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-500" />
                        Outreach Approval &amp; Authorization
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">Human-In-The-Loop</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Authorizing outreach marks this contact coordinates profile as reviewed for sales communication. SiteScout AI does not automatically dispatch unscheduled messages.
                    </p>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Approval Notes / Reviewer Comments</label>
                      <input
                        type="text"
                        value={outreachApprovalNotes}
                        onChange={(e) => setOutreachApprovalNotes(e.target.value)}
                        placeholder="e.g. Confirmed phone number with reception, approved for WhatsApp preview outreach."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    {business.outreachApprovedBy && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Last review: {business.outreachApprovalStatus} by {business.outreachApprovedBy} on {new Date(business.outreachApprovedAt || "").toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleExecuteOutreachApproval("APPROVED")}
                        disabled={outreachActionLoading || business.outreachApprovalStatus === "APPROVED"}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                          business.outreachApprovalStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {business.outreachApprovalStatus === "APPROVED" ? "✓ Approved for Outreach" : "Approve Outreach"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteOutreachApproval("PENDING_APPROVAL")}
                        disabled={outreachActionLoading}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Request Review
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteOutreachApproval("BLOCKED")}
                        disabled={outreachActionLoading || business.outreachApprovalStatus === "BLOCKED"}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 cursor-pointer"
                      >
                        Block Outreach
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: TIMELINE */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Interaction History & Auto-Logs
                  </div>

                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No activity recorded yet for this prospect.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {activities.map((act) => (
                        <div key={act.id} className="relative group">
                          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-sm" />
                          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {act.title}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(act.timestamp).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            {act.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 1B: COMMUNICATIONS */}
              {activeTab === "communications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Inbox className="w-4 h-4 text-purple-600" />
                        Communication History &amp; Message Timeline
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Tracks outbound outreach, provider delivery confirmations, bounce events, and inbound prospect replies.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setCommTimelineFilter("ALL")}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            commTimelineFilter === "ALL"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          All ({(business.communicationHistory || []).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommTimelineFilter("OUTBOUND")}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            commTimelineFilter === "OUTBOUND"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Outbound ({(business.communicationHistory || []).filter(c => c.direction === "OUTBOUND").length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommTimelineFilter("INBOUND")}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            commTimelineFilter === "INBOUND"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Replies ({(business.communicationHistory || []).filter(c => c.direction === "INBOUND").length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const filteredHistory = (business.communicationHistory || []).filter(c => {
                      if (commTimelineFilter === "OUTBOUND") return c.direction === "OUTBOUND";
                      if (commTimelineFilter === "INBOUND") return c.direction === "INBOUND";
                      return true;
                    });

                    if (filteredHistory.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                          <Inbox className="w-8 h-8 mx-auto text-purple-400 opacity-40" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No communication messages recorded yet.</p>
                          <p className="text-xs text-slate-500">Approved messages dispatched via the Outreach tab will appear here along with delivery status receipts and replies.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filteredHistory.map((comm) => (
                          <div 
                            key={comm.id} 
                            className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                              comm.direction === "INBOUND"
                                ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                                  comm.direction === "INBOUND"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                                }`}>
                                  {comm.direction === "INBOUND" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {comm.direction}
                                </span>

                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                                  {comm.channel}
                                </span>

                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  comm.deliveryStatus === "DELIVERED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : comm.deliveryStatus === "ACCEPTED"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : comm.deliveryStatus === "REPLIED"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                    : comm.deliveryStatus === "BOUNCED" || comm.deliveryStatus === "FAILED"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}>
                                  {comm.deliveryStatus}
                                </span>

                                {comm.isSimulated && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono">
                                    SIMULATED
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono">
                                {new Date(comm.createdAt).toLocaleString()}
                              </div>
                            </div>

                            {comm.subject && (
                              <div className="font-bold text-slate-900 dark:text-white">
                                {comm.subject}
                              </div>
                            )}

                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {comm.body}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2 pt-1">
                              <div>
                                <span>From: <strong>{comm.senderAddress || "SiteScout Agent"}</strong></span>
                                <span className="mx-2">•</span>
                                <span>To: <strong>{comm.recipientAddress}</strong></span>
                                <span className="mx-2">•</span>
                                <span>Provider: <strong className="font-mono">{comm.provider}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const defaultDate = new Date();
                                    defaultDate.setDate(defaultDate.getDate() + 2);
                                    const dateStr = defaultDate.toISOString().split("T")[0];
                                    const taskRes = createFollowUpFromCommunication(
                                      business,
                                      comm.id,
                                      {
                                        title: `Follow up on ${comm.direction.toLowerCase()} ${comm.channel} with ${business.name}`,
                                        dueDate: dateStr,
                                        dueTime: "10:00",
                                        priority: "MEDIUM"
                                      },
                                      { uid: userId || "user_local", displayName: userName || "Sales Agent", role: "Sales Agent" }
                                    );
                                    if (taskRes.success) {
                                      onUpdateBusiness(taskRes.business);
                                      setActiveTab("followups");
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Schedule follow-up task for this message"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Follow-up Task
                                </button>

                                {comm.direction === "OUTBOUND" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyParentId(comm.id);
                                      setReplySender(comm.recipientAddress);
                                      setShowReplyModal(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Reply className="w-3 h-3" />
                                    Log Inbound Reply
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Lifecycle events timeline */}
                            {comm.events && comm.events.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-1">
                                <span className="font-bold text-slate-400 uppercase block">Delivery Lifecycle Events:</span>
                                <div className="space-y-1 pl-1">
                                  {comm.events.map((ev, evIdx) => (
                                    <div key={ev.id || evIdx} className="flex items-center justify-between text-slate-500">
                                      <span>• <strong>{ev.eventType.toUpperCase()}</strong> ({ev.status}): {ev.details || "Event recorded"}</span>
                                      <span className="font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-5">
                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Add CRM Note
                      </span>
                      <select
                        value={newNoteCategory}
                        onChange={(e) => setNewNoteCategory(e.target.value as any)}
                        className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                      >
                        <option value="general">General</option>
                        <option value="call_summary">Call Summary</option>
                        <option value="objection">Objection</option>
                        <option value="pricing">Pricing Discussion</option>
                        <option value="meeting">Meeting Notes</option>
                      </select>
                    </div>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Enter call notes, client objections, owner preferences..."
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newNotePinned}
                          onChange={(e) => setNewNotePinned(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Pin className="w-3 h-3" />
                        Pin to top
                      </label>
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNoteContent.trim()}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Save Note
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No notes saved yet. Add your first call observation above.
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div 
                          key={note.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            note.isPinned 
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs" 
                              : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {note.isPinned && (
                                <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
                              )}
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {note.category?.replace("_", " ")}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(note.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleTogglePinNote(note)}
                                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                                  note.isPinned ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                                }`}
                                title={note.isPinned ? "Unpin" : "Pin to top"}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FOLLOW-UPS & TASK MANAGEMENT (Micro-Phase 13A & 13B) */}
              {activeTab === "followups" && (
                <div className="space-y-4">
                  {/* Micro-Phase 13B: Follow-Up Sequences & Sales Pipeline Automation */}
                  {(() => {
                    const enrollments = business.sequenceEnrollments || [];
                    const activeEnrollment = enrollments.find(e => e.status === "ACTIVE" || e.status === "PAUSED") || enrollments[0];
                    const eligibility = checkProspectSequenceEligibility(business);
                    const availableSeqs = getAvailableSequences();

                    return (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              Sales Pipeline Sequence
                            </span>
                          </div>

                          {activeEnrollment && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              activeEnrollment.status === "ACTIVE" 
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : activeEnrollment.status === "PAUSED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : activeEnrollment.status === "COMPLETED"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {activeEnrollment.status}
                            </span>
                          )}
                        </div>

                        {activeEnrollment && (activeEnrollment.status === "ACTIVE" || activeEnrollment.status === "PAUSED") ? (
                          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {activeEnrollment.sequenceName}
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Step {activeEnrollment.currentStepNumber} • {activeEnrollment.completedStepNumbers.length} completed
                                </p>
                              </div>
                              {activeEnrollment.nextScheduledStepAt && (
                                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                                  Next: {new Date(activeEnrollment.nextScheduledStepAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Actions toolbar */}
                            <div className="flex items-center gap-1.5 pt-1">
                              {activeEnrollment.status === "ACTIVE" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdvanceEnrollmentId(activeEnrollment.id);
                                      setShowAdvanceModal(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    Advance Step
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePauseSequence(activeEnrollment.id)}
                                    className="px-2 py-1 text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pause className="w-3 h-3" />
                                    Pause
                                  </button>
                                </>
                              )}

                              {activeEnrollment.status === "PAUSED" && (
                                <button
                                  type="button"
                                  onClick={() => handleResumeSequence(activeEnrollment.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Resume Sequence
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCancelSequence(activeEnrollment.id)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>

                              {activeEnrollment.history && activeEnrollment.history.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedSequenceHistory(!expandedSequenceHistory)}
                                  className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <History className="w-3 h-3" />
                                  {expandedSequenceHistory ? "Hide Log" : "Audit Log"}
                                </button>
                              )}
                            </div>

                            {/* Advance Step Confirmation Modal */}
                            {showAdvanceModal && advanceEnrollmentId === activeEnrollment.id && (
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-900/60 space-y-2 mt-2">
                                <h6 className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                                  Advance to Next Sequence Step
                                </h6>
                                <p className="text-[10px] text-slate-500">
                                  Completes current step and automatically schedules the next touchpoint according to sequence rules.
                                </p>
                                <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={advanceApproveComm}
                                    onChange={(e) => setAdvanceApproveComm(e.target.checked)}
                                    className="rounded border-slate-300 text-purple-600"
                                  />
                                  <span>Confirm manual approval for any automated communication step</span>
                                </label>
                                <input
                                  type="text"
                                  value={advanceNote}
                                  onChange={(e) => setAdvanceNote(e.target.value)}
                                  placeholder="Optional note for audit trail (e.g. left voicemail)"
                                  className="w-full text-xs p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setShowAdvanceModal(false)}
                                    className="px-2 py-1 text-xs text-slate-500 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceSequence(activeEnrollment.id, advanceApproveComm, advanceNote)}
                                    className="px-3 py-1 text-xs font-bold bg-purple-600 text-white rounded cursor-pointer"
                                  >
                                    Confirm Advance
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Expandable Sequence History */}
                            {expandedSequenceHistory && activeEnrollment.history && (
                              <div className="p-2.5 bg-white dark:bg-slate-900/90 rounded border border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
                                <div className="font-bold text-slate-700 dark:text-slate-300">Sequence Audit Log:</div>
                                {activeEnrollment.history.map(h => (
                                  <div key={h.id} className="text-slate-500 flex justify-between gap-2">
                                    <span>• {h.details}</span>
                                    <span className="font-mono text-[9px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                            {!eligibility.eligible ? (
                              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Sequence Enrollment Blocked: {eligibility.blockers.join("; ")}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select
                                  value={selectedSequenceId}
                                  onChange={(e) => setSelectedSequenceId(e.target.value)}
                                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  {availableSeqs.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.steps.length} steps)
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleEnrollSequence(selectedSequenceId)}
                                  className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg whitespace-nowrap cursor-pointer shadow-xs"
                                >
                                  Enroll Prospect
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Follow-Up Task Management
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Organize follow-up calls, emails, review tasks, and prospect sales activities.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Filter Pills */}
                      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setTaskFilter("ALL")}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            taskFilter === "ALL"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          All ({followUps.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskFilter("ACTIVE")}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            taskFilter === "ACTIVE"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Active ({followUps.filter(f => f.status !== "completed" && f.status !== "cancelled").length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskFilter("OVERDUE")}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            taskFilter === "OVERDUE"
                              ? "bg-rose-500 text-white shadow-xs"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          Overdue ({followUps.filter(f => f.status !== "completed" && f.status !== "cancelled" && new Date(f.dueDate) < new Date(new Date().toDateString())).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskFilter("COMPLETED")}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            taskFilter === "COMPLETED"
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          Done ({followUps.filter(f => f.status === "completed").length})
                        </button>
                      </div>

                      <button
                        onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {showAddFollowUp ? "Cancel" : "New Task"}
                      </button>
                    </div>
                  </div>

                  {/* Add Follow-Up Form */}
                  {showAddFollowUp && (
                    <form onSubmit={handleAddFollowUp} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Task Title
                        </label>
                        <input
                          type="text"
                          value={followUpTitle}
                          onChange={(e) => setFollowUpTitle(e.target.value)}
                          placeholder="e.g., Call owner to review live website prototype"
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={followUpDueDate}
                            onChange={(e) => setFollowUpDueDate(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Due Time
                          </label>
                          <input
                            type="time"
                            value={taskDueTime}
                            onChange={(e) => setTaskDueTime(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Activity Type
                          </label>
                          <select
                            value={taskType}
                            onChange={(e) => {
                              const t = e.target.value as FollowUpTaskType;
                              setTaskType(t);
                              setFollowUpChannel(t === "call" ? "phone" : t === "email" ? "email" : t === "whatsapp" ? "whatsapp" : t === "in_person" ? "in_person" : "other");
                            }}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          >
                            <option value="call">Phone Call</option>
                            <option value="email">Email</option>
                            <option value="meeting">Meeting / Demo</option>
                            <option value="review">Manual Review</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="in_person">In-Person Visit</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Priority
                          </label>
                          <select
                            value={taskPriority}
                            onChange={(e) => setTaskPriority(e.target.value as FollowUpTaskPriority)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1 font-semibold"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Description &amp; Action Notes
                        </label>
                        <input
                          type="text"
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          placeholder="e.g., Address pricing objections, present mobile audit report"
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddFollowUp(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          Save Task
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reschedule Modal */}
                  {showRescheduleModal && rescheduleTaskId && (
                    <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Reschedule Follow-Up Task
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowRescheduleModal(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            New Date
                          </label>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            New Time
                          </label>
                          <input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Reschedule Reason (Logged to Audit Trail)
                        </label>
                        <input
                          type="text"
                          value={rescheduleReason}
                          onChange={(e) => setRescheduleReason(e.target.value)}
                          placeholder="e.g., Prospect requested contact after Thursday board meeting"
                          className="w-full text-xs p-2 rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRescheduleModal(false)}
                          className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteReschedule(rescheduleTaskId)}
                          className="px-3.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg cursor-pointer"
                        >
                          Confirm Reschedule
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-2.5">
                    {(() => {
                      const filteredList = followUps.filter((flw) => {
                        const isCompleted = flw.status === "completed";
                        const isCancelled = flw.status === "cancelled";
                        const isOverdue = !isCompleted && !isCancelled && new Date(flw.dueDate) < new Date(new Date().toDateString());

                        if (taskFilter === "ACTIVE") return !isCompleted && !isCancelled;
                        if (taskFilter === "OVERDUE") return isOverdue;
                        if (taskFilter === "COMPLETED") return isCompleted;
                        return true;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                            <CheckSquare className="w-8 h-8 mx-auto text-blue-400 opacity-40" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">No tasks matching filter "{taskFilter}".</p>
                            <p className="text-slate-500 text-[11px]">Click "New Task" above to organize prospect follow-ups.</p>
                          </div>
                        );
                      }

                      return filteredList.map((flw) => {
                        const isCompleted = flw.status === "completed";
                        const isCancelled = flw.status === "cancelled";
                        const isOverdue = !isCompleted && !isCancelled && new Date(flw.dueDate) < new Date(new Date().toDateString());

                        const canonicalTask = (business.followUpTasks || []).find(t => t.id === flw.id || t.title === flw.title);
                        const isHistoryExpanded = expandedTaskHistoryId === (canonicalTask?.id || flw.id);

                        return (
                          <div
                            key={flw.id}
                            className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                              isCompleted
                                ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70"
                                : isOverdue
                                  ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60"
                                  : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFollowUp(flw)}
                                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                    isCompleted
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                                  }`}
                                  title={isCompleted ? "Mark Open" : "Mark Completed"}
                                >
                                  {isCompleted && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <div className={`text-xs font-bold ${isCompleted ? "line-through text-slate-500" : "text-slate-900 dark:text-white"}`}>
                                    {flw.title}
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                    <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                                      isCompleted
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : isOverdue 
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold" 
                                          : "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    }`}>
                                      {isCompleted ? "COMPLETED" : isOverdue ? "OVERDUE" : "OPEN"}
                                    </span>

                                    <span>•</span>

                                    <span className={`font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : ""}`}>
                                      Due: {flw.dueDate} {flw.dueTime ? `@ ${flw.dueTime}` : ""}
                                    </span>

                                    <span>•</span>

                                    <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                                      {flw.channel}
                                    </span>

                                    {canonicalTask?.priority && (
                                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                        canonicalTask.priority === "URGENT"
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                          : canonicalTask.priority === "HIGH"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                      }`}>
                                        {canonicalTask.priority}
                                      </span>
                                    )}

                                    {canonicalTask?.assignedTo && (
                                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" />
                                        {canonicalTask.assignedTo.displayName || canonicalTask.assignedTo.uid}
                                      </span>
                                    )}
                                  </div>

                                  {flw.notes && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg leading-relaxed">
                                      {flw.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRescheduleTaskId(canonicalTask?.id || flw.id);
                                      setRescheduleDate(flw.dueDate);
                                      setShowRescheduleModal(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors cursor-pointer"
                                    title="Reschedule Task"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {canonicalTask?.history && canonicalTask.history.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTaskHistoryId(isHistoryExpanded ? null : (canonicalTask.id || flw.id))}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                    title="View Task Audit History"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteFollowUp(flw.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Task Audit History Dropdown */}
                            {isHistoryExpanded && canonicalTask?.history && (
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
                                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                  <History className="w-3 h-3 text-blue-500" />
                                  Task History &amp; Audit Trail
                                </div>
                                <div className="space-y-1">
                                  {canonicalTask.history.map(h => (
                                    <div key={h.id} className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-400">
                                      <span>• {h.details}</span>
                                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                        {new Date(h.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 4: ENQUIRIES / LEADS (Micro-Phase 8C) */}
              {activeTab === "leads" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Website Visitor Enquiries
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Real enquiries captured from website contact forms and public previews.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {leads.length} Total {leads.length === 1 ? "Lead" : "Leads"}
                    </span>
                  </div>

                  {leads.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No enquiries captured yet</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        When visitors fill in the contact form on this business's generated website, their submissions are securely stored here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leads.map((lead) => {
                        const getLeadBadge = (status: CapturedLead["status"]) => {
                          switch (status) {
                            case "NEW":
                              return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200";
                            case "CONTACTED":
                              return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200";
                            case "QUALIFIED":
                              return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200";
                            case "CONVERTED":
                              return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200";
                            case "ARCHIVED":
                              return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200";
                            default:
                              return "bg-slate-100 text-slate-600";
                          }
                        };

                        return (
                          <div
                            key={lead.id}
                            className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-xs space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                    {lead.name}
                                  </h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getLeadBadge(lead.status)}`}>
                                    {lead.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{new Date(lead.createdAt).toLocaleString()}</span>
                                  <span>•</span>
                                  <span className="capitalize">{lead.source?.replace(/_/g, " ") || "Contact Form"}</span>
                                </div>
                              </div>

                              {/* Lead Status dropdown */}
                              <select
                                value={lead.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value as CapturedLead["status"];
                                  await updateBusinessLeadStatus(business.id, lead.id, newStatus, userId);
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
                                  const acts = await getBusinessActivities(business.id, userId);
                                  setActivities(acts);
                                }}
                                className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                              >
                                <option value="NEW">New</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="QUALIFIED">Qualified</option>
                                <option value="CONVERTED">Converted</option>
                                <option value="ARCHIVED">Archived</option>
                              </select>
                            </div>

                            {/* Service of Interest */}
                            {lead.service && (
                              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-900/60 px-2.5 py-1 rounded-md">
                                Requested Service: <span className="font-bold text-blue-600 dark:text-blue-400">{lead.service}</span>
                              </div>
                            )}

                            {/* Visitor Message */}
                            <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 whitespace-pre-wrap leading-relaxed font-sans">
                              {lead.message}
                            </div>

                            {/* Notification status badge */}
                            <div className="pt-1 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                {lead.notificationStatus === "DELIVERED" ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Email Delivered to Business
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium" title="Enquiry stored securely in database. Direct mail delivery requires SMTP/gateway configuration.">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Stored Securely in App
                                  </span>
                                )}
                              </div>

                              {/* Direct action links for owner */}
                              <div className="flex items-center gap-2">
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}?subject=${encodeURIComponent(`Regarding your enquiry with ${business.name}`)}`}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 transition-colors"
                                    title={`Email ${lead.email}`}
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {lead.phone && (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition-colors"
                                    title={`Call ${lead.phone}`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
