import { Prospect } from "../types";

/**
 * Client Service for Prospect Discovery, Audit Analysis, and CRM Sync
 */

export interface DiscoverProspectsParams {
  city: string;
  category: string;
  country?: string;
  idToken?: string;
}

export interface DiscoverProspectsResponse {
  businesses: Prospect[];
  source: string;
  groundingUrls?: string[];
  error?: string;
}

export async function discoverProspectsApi(params: DiscoverProspectsParams): Promise<DiscoverProspectsResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.idToken) {
    headers["Authorization"] = `Bearer ${params.idToken}`;
  }

  const res = await fetch("/api/discover-prospects", {
    method: "POST",
    headers,
    body: JSON.stringify({
      city: params.city,
      category: params.category,
      country: params.country || "South Africa"
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Prospect discovery failed (${res.status})`);
  }

  return res.json();
}

export async function auditWebsiteApi(url: string, businessName = "", category = "", idToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch("/api/audit-website", {
    method: "POST",
    headers,
    body: JSON.stringify({ url, businessName, category })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Audit failed (${res.status})`);
  }

  return res.json();
}

export async function analyzeOpportunityApi(business: Prospect, idToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ business })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Opportunity analysis failed (${res.status})`);
  }

  return res.json();
}
