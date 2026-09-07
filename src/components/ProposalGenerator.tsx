import { useState, useRef, useEffect, FormEvent } from "react";
import { GeneratedSite, Proposal, PricingCalculator } from "../types";
import { 
  Calculator, FileText, Check, DollarSign, Clock, Calendar, 
  User, CheckCircle, Shield, Award, Sparkles, Printer, FileDown, 
  ArrowRight, Trash2, Plus, AlertCircle, Save, Briefcase, FileCheck, 
  CreditCard, HelpCircle, Layers, Mail, Phone, MapPin, CheckCircle2, RefreshCw,
  Globe
} from "lucide-react";
import {
  SUPPORTED_COUNTRIES,
  detectCountryFromLocation,
  CountryPricingConfig,
  getCountryByCode,
  getCountryBySymbol
} from "../lib/countryCurrency";
import { downloadProposalPdf } from "../lib/pdfExport";

interface ProposalGeneratorProps {
  site: GeneratedSite;
  userEmail: string;
  onSave?: (updatedSite: GeneratedSite) => Promise<void>;
  sitesList?: GeneratedSite[];
  onSelectSite?: (site: GeneratedSite) => void;
}

export default function ProposalGenerator({ 
  site, 
  userEmail, 
  onSave,
  sitesList = [],
  onSelectSite
}: ProposalGeneratorProps) {
  // Try loading saved proposal from site first, otherwise use professional defaults
  const initialProposal = site.proposal;
  const initialCountryConfig = detectCountryFromLocation(site.address || site.country || "");

  const [clientName, setClientName] = useState(initialProposal?.clientName || "Owner / Principal Manager");
  const [clientEmail, setClientEmail] = useState(initialProposal?.clientEmail || `${site.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`);
  const [businessName, setBusinessName] = useState(initialProposal?.businessName || site.businessName);
  const [clientAddress, setClientAddress] = useState(site.address || "Local Area");
  const [clientPhone, setClientPhone] = useState(site.phone || "No Contact Phone");
  
  const [projectOverview, setProjectOverview] = useState(
    initialProposal?.terms?.split("\n\n---OVERVIEW---\n")[1]?.split("\n---ENDOVERVIEW---\n")[0] ||
    `High-fidelity design proposal to publish a bespoke, mobile-optimized digital homepage and services presentation layout tailored specifically to the unique business standards of ${site.businessName}. This project establishes a premium web presence to capture local high-intent search traffic in the ${site.address || "local"} region and maximize direct mobile call leads.`
  );

  const [timeline, setTimeline] = useState(initialProposal?.timeline || "7 - 10 Business Days");
  
  // Custom Timeline Phases state
  const [timelinePhases, setTimelinePhases] = useState<{ phase: string; duration: string; task: string }[]>([
    { phase: "Phase 1: Brand Concept & Copy Reviews", duration: "Days 1-2", task: "Collate high-res logos, customize content copy, map out services, and finalise theme colors." },
    { phase: "Phase 2: Responsive Assembly & Layouts", duration: "Days 3-5", task: "Configure the multi-section visual layouts, test contact forms, and activate click-to-chat features." },
    { phase: "Phase 3: Search Engine Grounding", duration: "Days 6-7", task: "Verify localized SEO parameters, map out location grounding, and optimize meta headers." },
    { phase: "Phase 4: Domain Linking & Final Launch", duration: "Days 8-10", task: "Publish the layout live to secure production servers and link client-provided custom domains." }
  ]);

  const [status, setStatus] = useState<"draft" | "sent" | "approved" | "rejected">(initialProposal?.status || "draft");
  const [signedName, setSignedName] = useState(site.clientApprovedBy || "");
  const [signedDate, setSignedDate] = useState(site.clientApprovedAt ? new Date(site.clientApprovedAt).toLocaleDateString() : "");
  const [isApproved, setIsApproved] = useState(site.clientApproved || false);

  // Country & Currency setup
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initialCountryConfig.countryCode);
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialCountryConfig.currencySymbol);

  // Pricing setup
  const [pricing, setPricing] = useState<PricingCalculator>(
    initialProposal?.pricing || initialCountryConfig.defaultPricing
  );

  // Features checkboxes/toggles
  const [features, setFeatures] = useState<string[]>(
    initialProposal?.features || [
      "Custom Homepage with Premium Theme Layout",
      "Specialized Services Deck & Details",
      "Interactive Google Maps Location Integration",
      "Secure HTTPS/SSL Certificate Active",
      "Mobile-Optimized Responsive Header Navigation",
      "Live Click-to-Call Hotline & WhatsApp Chat",
      "Structured Callback & Appointment Booking Forms",
      "Localized Google SEO Metadata Schema Setup"
    ]
  );
  const [newFeature, setNewFeature] = useState("");

  // Deliverables toggles/items
  const [deliverables, setDeliverables] = useState<string[]>([
    "Complete ownership of all generated visual layout codes & copy assets",
    "Active SSL security protocol setup on secure production hosting servers",
    "Configured custom domains link (e.g. yourbusiness.com)",
    "Weekly automated database backups & security log monitoring",
    "2 hours of complimentary design and text copy updates per month"
  ]);
  const [newDeliverable, setNewDeliverable] = useState("");

  // Terms and conditions
  const [contractTerms, setContractTerms] = useState(
    initialProposal?.terms?.split("\n\n---TERMS---\n")[1] ||
    `1. Retainer & Payment Terms: Client agrees to pay a 50% upfront deposit to secure the development slot and launch asset collation. The remaining 50% balance is due immediately upon layout sign-off and design approval, prior to mapping and activating custom domain endpoints.

2. Intellectual Property Rights: Upon final payment clearance, all proprietary visual layouts, copyright copywriting, digital assets, and customized code templates are fully transferred to the sole ownership of the Client.

3. SLA Maintenance Support: The monthly recurring support SLA covers secure high-speed CDN website hosting, automated SSL renewal certifications, weekly complete database backups, and up to 2 hours of monthly text or layout updates.

4. Client Commitments: Client agrees to supply high-resolution logos, professional license credentials, staff images, and custom copy preferences. Delays in supplying assets will extend delivery timelines proportionally.`
  );

  // Payment details
  const [paymentDetails, setPaymentDetails] = useState(
    "Stripe Secure Checkout, Visa/Mastercard Credit Card, Bank Wire Transfer, or ACH Direct Debit.\n\nDeposit Terms: 50% Upfront deposit ($[DEPOSIT_TOTAL]) is required to initiate design setup. 50% Balance due upon design approval."
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // PDF download state
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Reference for proposal printing
  const printRef = useRef<HTMLDivElement>(null);

  // Listen to active site prop changes and re-initialize states
  useEffect(() => {
    const freshProposal = site.proposal;
    const countryConfig = detectCountryFromLocation(site.address || site.country || "");
    setSelectedCountryCode(countryConfig.countryCode);
    setCurrencySymbol(countryConfig.currencySymbol);

    setClientName(freshProposal?.clientName || "Owner / Principal Manager");
    setClientEmail(freshProposal?.clientEmail || `${site.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`);
    setBusinessName(freshProposal?.businessName || site.businessName);
    setClientAddress(site.address || "Local Area");
    setClientPhone(site.phone || "No Contact Phone");
    setProjectOverview(
      freshProposal?.terms?.split("\n\n---OVERVIEW---\n")[1]?.split("\n---ENDOVERVIEW---\n")[0] ||
      `High-fidelity design proposal to publish a bespoke, mobile-optimized digital homepage and services presentation layout tailored specifically to the unique business standards of ${site.businessName}. This project establishes a premium web presence to capture local high-intent search traffic in the ${site.address || "local"} region and maximize direct mobile call leads.`
    );
    setTimeline(freshProposal?.timeline || "7 - 10 Business Days");
    setStatus(freshProposal?.status || "draft");
    setSignedName(site.clientApprovedBy || "");
    setSignedDate(site.clientApprovedAt ? new Date(site.clientApprovedAt).toLocaleDateString() : "");
    setIsApproved(site.clientApproved || false);
    setPricing(
      freshProposal?.pricing || countryConfig.defaultPricing
    );
    setFeatures(
      freshProposal?.features || [
        "Custom Homepage with Premium Theme Layout",
        "Specialized Services Deck & Details",
        "Interactive Google Maps Location Integration",
        "Secure HTTPS/SSL Certificate Active",
        "Mobile-Optimized Responsive Header Navigation",
        "Live Click-to-Call Hotline & WhatsApp Chat",
        "Structured Callback & Appointment Booking Forms",
        "Localized Google SEO Metadata Schema Setup"
      ]
    );
    setContractTerms(
      freshProposal?.terms?.split("\n\n---TERMS---\n")[1] ||
      `1. Retainer & Payment Terms: Client agrees to pay a 50% upfront deposit to secure the development slot and launch asset collation. The remaining 50% balance is due immediately upon layout sign-off and design approval, prior to mapping and activating custom domain endpoints.

2. Intellectual Property Rights: Upon final payment clearance, all proprietary visual layouts, copyright copywriting, digital assets, and customized code templates are fully transferred to the sole ownership of the Client.

3. SLA Maintenance Support: The monthly recurring support SLA covers secure high-speed CDN website hosting, automated SSL renewal certifications, weekly complete database backups, and up to 2 hours of monthly text or layout updates.

4. Client Commitments: Client agrees to supply high-resolution logos, professional license credentials, staff images, and custom copy preferences. Delays in supplying assets will extend delivery timelines proportionally.`
    );
  }, [site.id, site.businessName]);

  // Handle Country Selection & Pricing preset change
  const handleCountryChange = (countryCode: string) => {
    const config = getCountryByCode(countryCode);
    if (!config) return;
    setSelectedCountryCode(config.countryCode);
    setCurrencySymbol(config.currencySymbol);
  };

  const handleApplyCountryPreset = (config?: CountryPricingConfig) => {
    const targetConfig = config || getCountryByCode(selectedCountryCode) || initialCountryConfig;
    setSelectedCountryCode(targetConfig.countryCode);
    setCurrencySymbol(targetConfig.currencySymbol);
    setPricing({
      ...targetConfig.defaultPricing
    });
  };

  // Field change handler
  const handlePriceChange = (field: keyof PricingCalculator, value: any) => {
    setPricing({ ...pricing, [field]: value });
  };

  // Pricing calculations
  const calculateSetupTotal = () => {
    return (
      (pricing.packagePrice || 0) +
      (pricing.domainPrice || 0) +
      (pricing.emailPrice || 0) +
      (pricing.seoPrice || 0) +
      (pricing.gbpOtpPrice || 0) +
      (pricing.logoPrice || 0)
    );
  };

  const calculateMonthlyTotal = () => {
    return (
      (pricing.hostingPrice || 0) +
      (pricing.maintenancePrice || 0) +
      (pricing.supportMonthlyPrice || 0)
    );
  };

  // Add/remove custom items
  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables([...deliverables, newDeliverable.trim()]);
    setNewDeliverable("");
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  // Save Proposal Draft to Firestore
  const handleSaveProposal = async (eventStatus?: "draft" | "sent" | "approved") => {
    setSaving(true);
    setSaveSuccess(false);
    
    const targetStatus = eventStatus || status;

    // Bundle overview and terms together into standard terms format to fit schema
    const combinedTermsString = `---OVERVIEW---\n${projectOverview}\n---ENDOVERVIEW---\n\n---TERMS---\n${contractTerms}`;

    const proposalObj: Proposal = {
      id: site.id,
      businessId: site.id,
      businessName: businessName,
      clientEmail: clientEmail,
      clientName: clientName,
      dateCreated: initialProposal?.dateCreated || new Date().toLocaleDateString(),
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      features: features,
      pricing: pricing,
      status: targetStatus,
      timeline: timeline,
      terms: combinedTermsString
    };

    const updatedSite: GeneratedSite = {
      ...site,
      clientApproved: targetStatus === "approved" ? true : isApproved,
      clientApprovedBy: targetStatus === "approved" ? signedName : site.clientApprovedBy,
      clientApprovedAt: targetStatus === "approved" ? new Date().toISOString() : site.clientApprovedAt,
      proposal: proposalObj
    };

    try {
      if (onSave) {
        await onSave(updatedSite);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save proposal:", err);
    } finally {
      setSaving(false);
    }
  };

  // Sign contract from signature box
  const handleSignContract = async (e: FormEvent) => {
    e.preventDefault();
    if (!signedName.trim()) return;
    
    setIsApproved(true);
    setStatus("approved");
    const today = new Date().toLocaleDateString();
    setSignedDate(today);

    // Save with approved status immediately
    setSaving(true);
    const combinedTermsString = `---OVERVIEW---\n${projectOverview}\n---ENDOVERVIEW---\n\n---TERMS---\n${contractTerms}`;
    
    const proposalObj: Proposal = {
      id: site.id,
      businessId: site.id,
      businessName: businessName,
      clientEmail: clientEmail,
      clientName: clientName,
      dateCreated: initialProposal?.dateCreated || new Date().toLocaleDateString(),
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      features: features,
      pricing: pricing,
      status: "approved",
      timeline: timeline,
      terms: combinedTermsString
    };

    const updatedSite: GeneratedSite = {
      ...site,
      clientApproved: true,
      clientApprovedBy: signedName,
      clientApprovedAt: new Date().toISOString(),
      proposal: proposalObj
    };

    try {
      if (onSave) {
        await onSave(updatedSite);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Failed to sign proposal:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);
    setDownloadSuccess(false);
    setDownloadProgress("Preparing high-resolution PDF...");
    try {
      await downloadProposalPdf({
        element: printRef.current,
        businessName: businessName || site.businessName,
        proposalId: site.id,
        onProgress: (step) => setDownloadProgress(step),
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err) {
      console.error("Error generating proposal PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
      setDownloadProgress("");
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const setupTotal = calculateSetupTotal();
  const monthlyTotal = calculateMonthlyTotal();
  const depositAmt = (setupTotal / 2).toFixed(2);

  // Keep dynamic fields up to date with template calculations and country currency
  const activeCountry = getCountryByCode(selectedCountryCode) || initialCountryConfig;
  const renderedPaymentDetails = paymentDetails
    .replace(/\$\[DEPOSIT_TOTAL\]/g, `${currencySymbol}${depositAmt}`)
    .replace(/\[DEPOSIT_TOTAL\]/g, `${currencySymbol}${depositAmt}`);

  return (
    <div className="space-y-6 text-left">
      {/* Inject custom print styling so only the high-fidelity contract sheet is visible when exporting/printing */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all other app elements, buttons, sidebars during print */
          header, nav, footer, aside, .no-print, button, select, input, textarea, .nav-tabs {
            display: none !important;
          }
          /* Maximize printing target container */
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Top Banner & Main Heading */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800 gap-4 no-print">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" /> B2B Proposal &amp; Contract Studio
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure fully branded PDF proposals, map customized pricing calculators, outline roadmaps, and secure direct digital approvals for <strong className="text-slate-800 dark:text-slate-200">{site.businessName}</strong>.
          </p>

          {sitesList.length > 0 && onSelectSite && (
            <div className="mt-3.5 flex items-center gap-2 text-left">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Switch Project Client:</span>
              <select
                value={site.id}
                onChange={(e) => {
                  const selected = sitesList.find(s => s.id === e.target.value);
                  if (selected) onSelectSite(selected);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
              >
                {sitesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Global Save Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Proposal Saved &amp; Cloud Synced
            </span>
          )}

          {downloadSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle className="h-3.5 w-3.5" /> PDF Downloaded
            </span>
          )}
          
          <button
            onClick={() => handleSaveProposal()}
            disabled={saving}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Save Proposal Draft
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10 disabled:opacity-75"
            title="Download high-resolution offline PDF document"
          >
            {isDownloadingPdf ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {downloadProgress || "Generating PDF..."}
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" /> Download PDF
              </>
            )}
          </button>

          <button
            onClick={triggerPrint}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open system print preview"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left Column: Estimator Pricing Setup (45% width - hidden during print) */}
        <div className="space-y-6 lg:col-span-5 no-print">
          
          {/* Section 1: Client & Delivery Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 text-left">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2 dark:border-slate-850">
              <User className="h-4 w-4 text-blue-500" /> 1. Client Details
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Company / Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Owner / Primary Contact</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Client Email Address</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Client Location</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Proposal Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="sent">Sent to Client</option>
                  <option value="approved">Approved &amp; Accepted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Simple Price Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2 dark:border-slate-850">
              <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> 2. Simple Proposal Pricing
              </h3>

              {/* Country & Currency Selector */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedCountryCode}
                  onChange={(e) => {
                    const c = getCountryByCode(e.target.value);
                    if (c) {
                      setSelectedCountryCode(c.countryCode);
                      setCurrencySymbol(c.currencySymbol);
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <option key={country.countryCode} value={country.countryCode}>
                      {country.flag} {country.name} ({country.currencySymbol} - {country.currencyCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Country-Specific Market Rate Preset */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="text-left">
                <p className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span>{activeCountry.flag}</span>
                  <span>{activeCountry.name} Standard Baseline Pricing</span>
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                  {currencySymbol}{activeCountry.defaultPricing.packagePrice.toLocaleString()} Setup • {currencySymbol}{activeCountry.defaultPricing.hostingPrice.toLocaleString()}/mo Hosting
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPricing({
                    ...activeCountry.defaultPricing,
                    emailPrice: 0,
                    seoPrice: 0,
                    gbpOtpPrice: 0,
                    logoPrice: 0,
                    supportMonthlyPrice: 0
                  });
                  setSelectedCountryCode(activeCountry.countryCode);
                  setCurrencySymbol(activeCountry.currencySymbol);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Apply {activeCountry.currencyCode}</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Website Design ({currencySymbol})</label>
                <input
                  type="number"
                  value={pricing.packagePrice}
                  onChange={(e) => handlePriceChange("packagePrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Domain Setup ({currencySymbol})</label>
                <input
                  type="number"
                  value={pricing.domainPrice}
                  onChange={(e) => handlePriceChange("domainPrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Hosting ({currencySymbol} / month)</label>
                <input
                  type="number"
                  value={pricing.hostingPrice}
                  onChange={(e) => handlePriceChange("hostingPrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Optional Maintenance ({currencySymbol} / month)</label>
                <input
                  type="number"
                  value={pricing.maintenancePrice}
                  onChange={(e) => handlePriceChange("maintenancePrice", Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Branded high-fidelity proposal print preview paper sheet (55% width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Action indicator above the paper - hidden in print */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-blue-50/60 p-4 border border-blue-100 dark:bg-blue-950/25 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 gap-3 no-print">
            <div className="flex items-start gap-2 text-left">
              <Sparkles className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Premium High-Fidelity Stationery View</p>
                <p className="text-[10px] opacity-80 mt-0.5">The document below will be exported as a clean A4 PDF or printed directly. Interactive controls and sidebars are automatically excluded.</p>
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs disabled:opacity-75"
            >
              {isDownloadingPdf ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-3.5 w-3.5" /> Download PDF
                </>
              )}
            </button>
          </div>

          {/* Beautiful Document Stationery Sheet */}
          <div 
            ref={printRef}
            className="print-container rounded-2xl border border-slate-300 bg-white p-8 md:p-14 shadow-lg dark:border-slate-850 dark:bg-slate-900 text-slate-900 text-left relative overflow-hidden font-sans space-y-8 print:border-none print:shadow-none print:p-0 dark:text-slate-100 min-h-[842px]"
            id="printable-proposal-sheet"
          >
            {/* Branded corporate header stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600 no-print" />

            {/* Contract Header Details */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b border-slate-100 pb-6 dark:border-slate-800/80 gap-4">
              <div>
                <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  SiteScout Design Studio <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded dark:bg-blue-900/40 dark:text-blue-300 font-extrabold tracking-wider uppercase">AGENCY LEVEL</span>
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">Representative: {userEmail}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Document Issued: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right sm:text-right">
                <h2 className="text-xl font-black uppercase text-blue-600 dark:text-blue-400 tracking-wide">DIGITAL WEB PROPOSAL</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono">ID: SCOUT-PROPOSAL-{site.id.substring(0, 8).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Valid Until: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Recipient Coordinates Panel */}
            <div className="grid gap-6 sm:grid-cols-2 text-xs">
              <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <h5 className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-blue-500" /> CLIENT INFORMATION</h5>
                <p className="font-extrabold text-sm text-slate-850 dark:text-slate-200">{businessName}</p>
                <p className="text-slate-500 dark:text-slate-450 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {clientAddress}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <h5 className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><User className="h-3.5 w-3.5 text-blue-500" /> DIRECT RECIPIENT</h5>
                <p className="font-extrabold text-sm text-slate-850 dark:text-slate-200">{clientName}</p>
                <p className="text-slate-500 dark:text-slate-450 mt-1 flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /> {clientEmail}</p>
              </div>
            </div>

            {/* Section 1: Proposed Services & Pricing */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold">01</span> Proposed Investment Schedule
              </h4>
              
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                      <th className="p-3">Service Deliverable Details</th>
                      <th className="p-3 text-center">Billing Frequency</th>
                      <th className="p-3 text-right">Investment Quote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {pricing.packagePrice > 0 && (
                      <tr>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900 dark:text-white">Website Design</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">High-fidelity custom-designed homepage layout, optimized for local search, mobile theme integration, and high conversion.</p>
                        </td>
                        <td className="p-3 text-center text-slate-500 uppercase text-[9px]">One-Off Setup</td>
                        <td className="p-3 text-right font-mono font-bold">{currencySymbol}{pricing.packagePrice.toLocaleString()}</td>
                      </tr>
                    )}
                    {pricing.domainPrice > 0 && (
                      <tr>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900 dark:text-white">Domain Setup</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">Custom domain name registration, configuration, and linkage with modern SSL padlock security.</p>
                        </td>
                        <td className="p-3 text-center text-slate-500 uppercase text-[9px]">One-Off Setup</td>
                        <td className="p-3 text-right font-mono font-bold">{currencySymbol}{pricing.domainPrice.toLocaleString()}</td>
                      </tr>
                    )}
                    {pricing.hostingPrice > 0 && (
                      <tr>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900 dark:text-white">Hosting</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">SSL secure server encryption, ultra-low latency CDN edge serving, and automated daily performance diagnostics.</p>
                        </td>
                        <td className="p-3 text-center text-slate-500 uppercase text-[9px]">Monthly Recurring</td>
                        <td className="p-3 text-right font-mono font-bold">{currencySymbol}{pricing.hostingPrice.toLocaleString()} / month</td>
                      </tr>
                    )}
                    {pricing.maintenancePrice > 0 && (
                      <tr>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900 dark:text-white">Optional Maintenance</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">Continuous text updates, weekly safety database backups, security patch updates, and direct support SLA.</p>
                        </td>
                        <td className="p-3 text-center text-slate-500 uppercase text-[9px]">Monthly Recurring</td>
                        <td className="p-3 text-right font-mono font-bold">{currencySymbol}{pricing.maintenancePrice.toLocaleString()} / month</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cost Totals block */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-150 dark:bg-slate-950 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Investment Totals Summary</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">All quotes are subject to final agreement of scope.</p>
                </div>
                <div className="flex items-center gap-5 text-right">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Setup (One-Off)</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{currencySymbol}{setupTotal.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-slate-200 h-8 dark:border-slate-800" />
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Monthly Recurring</span>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">{currencySymbol}{monthlyTotal.toLocaleString()} / month</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Interactive Acceptance Signatures */}
            <div className="border-t border-slate-100 pt-6 dark:border-slate-800/80 space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold">02</span> Execution of Agreement (Signatures)
              </h4>
              
              <div className="grid gap-6 sm:grid-cols-2 text-xs">
                {/* Agency Signature */}
                <div className="space-y-2 border-r border-slate-100 pr-4 dark:border-slate-800/60 text-left">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">SiteScout Representative</p>
                  <div className="h-12 flex items-center border-b border-slate-200/80 dark:border-slate-800">
                    <span className="font-serif italic text-lg text-blue-600 dark:text-blue-400 select-none">SiteScout Studio Representative</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Authorized Lead Agent • {userEmail}</p>
                </div>

                {/* Client Signature */}
                <div className="space-y-2 text-left">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Client Sign-off &amp; Approval</p>
                  
                  {isApproved ? (
                    <div className="space-y-1">
                      <div className="h-12 flex items-center border-b border-slate-200/80 dark:border-slate-800">
                        <span className="font-serif italic text-lg text-emerald-600 dark:text-emerald-400 select-none">/s/ {signedName}</span>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 uppercase tracking-wider pt-1">
                        <CheckCircle2 className="h-3 w-3" /> Signed Digitally on {signedDate}
                      </p>
                    </div>
                  ) : (
                    /* Signature Form - hidden in print unless signed */
                    <form onSubmit={handleSignContract} className="space-y-2.5 no-print">
                      <input
                        type="text"
                        required
                        placeholder="Type Full Name to Sign Digitally"
                        value={signedName}
                        onChange={(e) => setSignedName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 text-slate-800 dark:text-white font-bold outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-3 transition-all cursor-pointer shadow-sm text-center"
                      >
                        Accept &amp; Approve Design
                      </button>
                    </form>
                  )}
                  
                  {!isApproved && (
                    <p className="text-[10px] text-slate-400 italic pt-1 print:hidden">Waiting for client signature approval.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
