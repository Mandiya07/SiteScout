import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Business, CanonicalSalesStage } from "../types";
import { parseLeadsCsv, generateSampleLeadsCsv, CsvParseResult } from "../lib/csvLeadParser";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Download, 
  ArrowRight, Users, Sparkles, Building2, Check, RefreshCw, Eye
} from "lucide-react";

interface CsvLeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: Business[]) => Promise<{ addedCount: number; updatedCount: number } | void> | void;
  userId?: string;
}

export default function CsvLeadImportModal({
  isOpen,
  onClose,
  onImportLeads,
  userId
}: CsvLeadImportModalProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<{ added: number; updated: number; total: number } | null>(null);
  const [defaultStage, setDefaultStage] = useState<CanonicalSalesStage>("DISCOVERED");
  const [rawTextCache, setRawTextCache] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a valid .csv file format.");
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawTextCache(text);
      const res = parseLeadsCsv(text, { userId });
      setParseResult(res);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = generateSampleLeadsCsv();
    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sitescout_crm_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.leads.length === 0) return;

    setIsProcessing(true);
    try {
      // Apply default stage override if lead was defaulted to DISCOVERED
      const preparedLeads = parseResult.leads.map(lead => {
        if (defaultStage !== "DISCOVERED" && lead.salesStage === "DISCOVERED") {
          return {
            ...lead,
            salesStage: defaultStage,
            updatedAt: new Date().toISOString()
          };
        }
        return lead;
      });

      const outcome = await onImportLeads(preparedLeads);
      if (outcome && typeof outcome === "object") {
        setImportSuccess({
          added: outcome.addedCount ?? preparedLeads.length,
          updated: outcome.updatedCount ?? 0,
          total: preparedLeads.length
        });
      } else {
        setImportSuccess({
          added: preparedLeads.length,
          updated: 0,
          total: preparedLeads.length
        });
      }
    } catch (err) {
      console.error("Failed to import leads:", err);
      alert("An error occurred while importing leads. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setFileSize(null);
    setParseResult(null);
    setImportSuccess(null);
    setRawTextCache("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-left">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Upload Leads from CSV
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  CRM Pipeline
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk import your existing prospective clients directly into the local CRM pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {importSuccess ? (
            /* Success State */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Leads Successfully Imported!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  <strong className="text-emerald-600 dark:text-emerald-400">{importSuccess.added} new lead{importSuccess.added === 1 ? '' : 's'}</strong> added to your pipeline and synced with local storage.
                  {importSuccess.updated > 0 && ` (${importSuccess.updated} existing record${importSuccess.updated === 1 ? '' : 's'} merged)`}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  View Leads in Pipeline
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Import Another File
                </button>
              </div>
            </div>
          ) : !parseResult ? (
            /* Upload & Dropzone Area */
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]" 
                    : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50/50 dark:hover:bg-slate-850/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop CSV file
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Google Sheets, HubSpot, Salesforce, and custom CSV spreadsheets (.csv up to 10MB)
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Company</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Phone</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Email</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Website</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Address</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono">Stage</span>
                </div>
              </div>

              {/* Sample Template Download Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Need an example format? Download our pre-formatted template.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                >
                  Download Sample CSV
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Preview Area */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {fileName} <span className="font-normal text-slate-500 font-mono">({fileSize})</span>
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      {parseResult.validCount} valid lead{parseResult.validCount === 1 ? '' : 's'} identified ready to import
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Parsing Warnings:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] opacity-90 pl-1 space-y-0.5">
                    {parseResult.warnings.slice(0, 3).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                    {parseResult.warnings.length > 3 && (
                      <li>...and {parseResult.warnings.length - 3} more minor items.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Detected Column Mapping */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Detected Column Mapping
                </h4>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {Object.entries(parseResult.headersDetected).map(([field, rawHeader]) => (
                    <span 
                      key={field} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      <strong className="capitalize">{field}</strong>: <span className="font-mono text-slate-500">{rawHeader}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Default Sales Stage for Unspecified Leads
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={defaultStage}
                    onChange={(e) => setDefaultStage(e.target.value as CanonicalSalesStage)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="DISCOVERED">Discovered (Default)</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="ENGAGED">Engaged</option>
                    <option value="PROPOSAL_SENT">Proposal Sent</option>
                    <option value="NEGOTIATION">Negotiation</option>
                  </select>
                  <span className="text-[11px] text-slate-500">
                    Row-level stages specified in the CSV take precedence.
                  </span>
                </div>
              </div>

              {/* Preview Table of First Few Leads */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sample Leads Preview ({parseResult.rawSampleRows.length} of {parseResult.validCount})
                  </h4>
                  <span className="text-[11px] text-slate-400">Deterministic ID + Real Lead Verification</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-2.5">Business Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Website</th>
                        <th className="p-2.5">Address</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parseResult.rawSampleRows.map((sample, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {sample.Name}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {sample.Phone}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {sample.Email}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {sample.Website}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                            {sample.Address}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {sample.Category}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {sample.Stage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!importSuccess && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {parseResult && parseResult.validCount > 0 ? (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing {parseResult.validCount} Leads...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Import {parseResult.validCount} Leads</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
