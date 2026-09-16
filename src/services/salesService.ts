import { GeneratedSite, Prospect } from "../types";

/**
 * Client Service for Grounded Sales Pitch and Email Generation
 */

export interface SalesCopyRequest {
  site: GeneratedSite;
  prospect?: Prospect;
  salesPitchTone?: string;
  idToken?: string;
}

export interface SalesCopyResponse {
  pitchHook: string;
  auditSummary: string;
  corePitch: string;
  callToAction: string;
  whatsappScript: string;
  proposalDraft: string;
}

export async function generateSalesCopyApi(params: SalesCopyRequest): Promise<SalesCopyResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.idToken) {
    headers["Authorization"] = `Bearer ${params.idToken}`;
  }

  const res = await fetch("/api/generate-sales-copy", {
    method: "POST",
    headers,
    body: JSON.stringify({
      site: params.site,
      prospect: params.prospect,
      salesPitchTone: params.salesPitchTone
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to generate sales copy (${res.status})`);
  }

  return res.json();
}

export async function draftEmailApi(params: {
  site: GeneratedSite;
  prospect: Prospect;
  userNotes?: string;
  idToken?: string;
}): Promise<{ subject: string; body: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.idToken) {
    headers["Authorization"] = `Bearer ${params.idToken}`;
  }

  const res = await fetch("/api/draft-email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      site: params.site,
      prospect: params.prospect,
      userNotes: params.userNotes
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to draft email (${res.status})`);
  }

  return res.json();
}
