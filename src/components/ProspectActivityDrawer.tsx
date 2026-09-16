import React, { useState, useEffect, FormEvent } from "react";
import { 
  Business, CanonicalSalesStage, ProspectActivity, 
  ProspectNote, ProspectFollowUp 
} from "../types";
import { 
  getBusinessActivities, addBusinessActivity, 
  getBusinessNotes, addBusinessNote, deleteBusinessNote, updateBusinessNote,
  getBusinessFollowUps, addBusinessFollowUp, updateBusinessFollowUp, deleteBusinessFollowUp,
  CANONICAL_STAGES, toCanonicalStage, getStageMeta
} from "../lib/prospectCrm";
import { 
  X, Calendar, Clock, MessageSquare, Phone, Mail, 
  CheckCircle2, Plus, Pin, Trash2, Check, AlertCircle, 
  Sparkles, Send, FileText, UserCheck, ShieldCheck, ChevronRight
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
  const [activeTab, setActiveTab] = useState<"timeline" | "notes" | "followups">("timeline");
  
  // Data states
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [followUps, setFollowUps] = useState<ProspectFollowUp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Note form states
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"general" | "call_summary" | "objection" | "pricing" | "meeting">("general");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Follow-up form states
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [followUpChannel, setFollowUpChannel] = useState<"whatsapp" | "phone" | "email" | "in_person" | "other">("whatsapp");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const currentStage = toCanonicalStage(business.salesStage || business.prospectStatus);
  const stageMeta = getStageMeta(currentStage);

  // Load subcollection data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [acts, nts, flws] = await Promise.all([
          getBusinessActivities(business.id, userId),
          getBusinessNotes(business.id),
          getBusinessFollowUps(business.id)
        ]);
        if (isMounted) {
          setActivities(acts);
          setNotes(nts);
          setFollowUps(flws);
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

  // Stage change handler
  const handleStageChange = async (newStage: CanonicalSalesStage) => {
    const updated: Business = {
      ...business,
      salesStage: newStage,
      prospectStatus: newStage === "WON" ? "Won" : (newStage === "LOST" ? "Lost" : (newStage === "PROPOSAL_SENT" ? "Proposal" : "Interested")),
      updatedAt: new Date().toISOString()
    };
    onUpdateBusiness(updated);

    const newAct = await addBusinessActivity(business.id, {
      businessId: business.id,
      type: newStage === "WON" ? "deal_won" : "follow_up_sent",
      title: `Pipeline Stage Updated: ${getStageMeta(newStage).label}`,
      description: `Transitioned prospect to ${getStageMeta(newStage).label}`,
      timestamp: new Date().toISOString(),
      actorId: userId
    }, userId);

    setActivities(prev => [newAct, ...prev]);
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

  // Add Follow-Up Handler
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDueDate) return;

    try {
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

      // Refresh activities & update business next follow up date
      onUpdateBusiness({
        ...business,
        nextFollowUpDate: followUpDueDate
      });

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

    // Refresh activities
    const acts = await getBusinessActivities(business.id, userId);
    setActivities(acts);
  };

  // Delete Follow-Up Handler
  const handleDeleteFollowUp = async (followUpId: string) => {
    await deleteBusinessFollowUp(business.id, followUpId);
    setFollowUps(prev => prev.filter(f => f.id !== followUpId));
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
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Activity Timeline ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
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
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "followups"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Follow-Ups ({followUps.filter(f => f.status === "pending").length})
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

              {/* TAB 3: FOLLOW-UPS */}
              {activeTab === "followups" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Scheduled Tasks & Reminders
                    </span>
                    <button
                      onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {showAddFollowUp ? "Cancel" : "Schedule Task"}
                    </button>
                  </div>

                  {/* Add Follow-Up Form */}
                  {showAddFollowUp && (
                    <form onSubmit={handleAddFollowUp} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Task Description
                        </label>
                        <input
                          type="text"
                          value={followUpTitle}
                          onChange={(e) => setFollowUpTitle(e.target.value)}
                          placeholder="e.g., Send revised pricing packages on WhatsApp"
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={followUpDueDate}
                            onChange={(e) => setFollowUpDueDate(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Channel
                          </label>
                          <select
                            value={followUpChannel}
                            onChange={(e) => setFollowUpChannel(e.target.value as any)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="phone">Direct Call</option>
                            <option value="email">Email</option>
                            <option value="in_person">In-Person Visit</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Notes / Talking Points
                        </label>
                        <input
                          type="text"
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          placeholder="Key point: highlight mobile chat speed"
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
                      >
                        Save Follow-up Task
                      </button>
                    </form>
                  )}

                  {/* Follow-Ups List */}
                  <div className="space-y-2.5">
                    {followUps.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No follow-up tasks scheduled. Click above to create one.
                      </div>
                    ) : (
                      followUps.map((flw) => {
                        const isCompleted = flw.status === "completed";
                        const isOverdue = !isCompleted && new Date(flw.dueDate) < new Date(new Date().toDateString());

                        return (
                          <div
                            key={flw.id}
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                              isCompleted
                                ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                                : isOverdue
                                  ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60"
                                  : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleFollowUp(flw)}
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                                }`}
                              >
                                {isCompleted && <Check className="w-3.5 h-3.5" />}
                              </button>
                              <div>
                                <div className={`text-xs font-bold ${isCompleted ? "line-through text-slate-500" : "text-slate-900 dark:text-white"}`}>
                                  {flw.title}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  <span className={`font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : ""}`}>
                                    Due: {flw.dueDate} {isOverdue && "(Overdue)"}
                                  </span>
                                  <span>•</span>
                                  <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                                    {flw.channel}
                                  </span>
                                </div>
                                {flw.notes && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-100/60 dark:bg-slate-900/60 p-1.5 rounded">
                                    {flw.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteFollowUp(flw.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
