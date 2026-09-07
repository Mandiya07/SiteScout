import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { GeneratedSite, Proposal, PricingCalculator } from "../types";

export interface GeneratePdfOptions {
  element: HTMLElement;
  businessName: string;
  proposalId?: string;
  onProgress?: (step: string) => void;
}

/**
 * Exports the Proposal Document DOM element into a crisp, professional multi-page A4 PDF.
 * Falls back to a structured vector jsPDF layout if DOM canvas capture fails.
 */
export async function downloadProposalPdf({
  element,
  businessName,
  proposalId,
  onProgress,
}: GeneratePdfOptions): Promise<void> {
  const safeBusinessName = (businessName || "Client")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  const fileName = `Proposal_${safeBusinessName}_SiteScout.pdf`;

  try {
    onProgress?.("Preparing proposal document for capture...");

    // Capture the proposal element using html2canvas with high-DPI options
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for retina/crisp text output
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        // Hide all no-print elements in cloned document
        const noPrintElements = clonedDoc.querySelectorAll(".no-print");
        noPrintElements.forEach((el) => {
          (el as HTMLElement).style.display = "none";
        });

        // Ensure clean corporate styling in the clone (light theme, high contrast)
        const sheet = clonedDoc.getElementById("printable-proposal-sheet");
        if (sheet) {
          sheet.style.backgroundColor = "#ffffff";
          sheet.style.color = "#0f172a";
          sheet.classList.remove("dark:bg-slate-900", "dark:text-slate-100");
          sheet.style.boxShadow = "none";
          sheet.style.border = "none";
          sheet.style.width = "820px";
          sheet.style.maxWidth = "820px";
        }

        // Ensure all dark mode backgrounds and text inside sheet become crisp light stationery
        const darkElements = clonedDoc.querySelectorAll(".dark\\:bg-slate-900, .dark\\:bg-slate-950, .dark\\:bg-slate-850");
        darkElements.forEach((el) => {
          (el as HTMLElement).style.backgroundColor = "#f8fafc";
          (el as HTMLElement).style.color = "#0f172a";
        });

        const darkTextElements = clonedDoc.querySelectorAll(".dark\\:text-white, .dark\\:text-slate-100, .dark\\:text-slate-200, .dark\\:text-slate-300");
        darkTextElements.forEach((el) => {
          (el as HTMLElement).style.color = "#0f172a";
        });
      },
    });

    onProgress?.("Rendering pages into high-resolution PDF...");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    // Calculate height of one A4 page in canvas pixel units
    const pageCanvasHeight = (canvas.width * a4HeightMm) / a4WidthMm;
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageCanvasHeight));

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      onProgress?.(`Building PDF page ${pageIndex + 1} of ${totalPages}...`);

      const sourceY = pageIndex * pageCanvasHeight;
      const sourceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);

      // Create a dedicated canvas for this page slice
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageCanvasHeight;
      const ctx = pageCanvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", 0, 0, a4WidthMm, a4HeightMm, undefined, "FAST");
      }
    }

    onProgress?.("Saving PDF to your device...");
    pdf.save(fileName);
  } catch (error) {
    console.warn("HTML canvas PDF generation encountered an issue, falling back to vector PDF export:", error);
    // Fallback: Generate structured vector PDF directly with jsPDF
    generateFallbackVectorPdf(businessName, proposalId, fileName);
  }
}

/**
 * Robust fallback that builds a clean vector PDF if canvas rendering has browser constraints
 */
function generateFallbackVectorPdf(businessName: string, proposalId: string | undefined, fileName: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 6, "F");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("SITESCOUT DESIGN STUDIO", 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("B2B Agency Web Layout & Service Proposal", 15, 26);
  doc.text(`Issued Date: ${new Date().toLocaleDateString()}`, 15, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("DIGITAL WEB PROPOSAL", 210 - 15, 20, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: SCOUT-${(proposalId || "001").substring(0, 8).toUpperCase()}`, 210 - 15, 26, { align: "right" });
  doc.text(`Valid Until: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 210 - 15, 31, { align: "right" });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 36, 195, 36);

  // Client Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 42, 180, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("PREPARED SPECIFICALLY FOR:", 20, 48);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(businessName, 20, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Status: Verified Client Lead • Ready for Production Setup", 20, 61);

  // Overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("01. PROJECT OVERVIEW & SCOPE", 15, 76);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const overviewLines = doc.splitTextToSize(
    `High-fidelity design proposal to publish a bespoke, mobile-optimized digital homepage and services presentation layout tailored specifically to the unique business standards of ${businessName}. This project establishes a premium web presence to capture local high-intent search traffic and maximize direct mobile call leads.`,
    180
  );
  doc.text(overviewLines, 15, 82);

  // Deliverables
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("02. CORE DELIVERABLES INCLUDED", 15, 110);

  const deliverables = [
    "• Custom Homepage with Premium Responsive Theme Layout",
    "• Specialized Services Deck & Interactive Presentation",
    "• Google Maps Location Grounding & Local SEO Tag Schema",
    "• High-Speed Edge CDN Hosting with Automated SSL Padlock Security",
    "• Mobile Click-to-Call Hotline & Instant WhatsApp Chat Routing",
    "• Full Intellectual Property Rights and Custom Domain Linkage",
  ];

  let deliverableY = 118;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  deliverables.forEach((item) => {
    doc.text(item, 15, deliverableY);
    deliverableY += 7;
  });

  // Footer note
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 270, 195, 270);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by SiteScout AI B2B Enterprise SaaS. Official Client Proposal Document.", 15, 276);
  doc.text("Page 1 of 1", 210 - 15, 276, { align: "right" });

  doc.save(fileName);
}
