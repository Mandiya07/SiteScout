import { GeneratedSite, DeploymentStatus } from "../types";

/**
 * Client Service for Site Generation, Refinement, Token Creation, and Deployment
 */

export interface GenerateSiteResponse {
  site: GeneratedSite;
  isFallback?: boolean;
}

export interface DeploySiteResponse {
  success: boolean;
  deploymentStatus: DeploymentStatus;
  publishedUrl: string;
  logs: string[];
}

export async function generateSiteApi(params: {
  businessName: string;
  category: string;
  address?: string;
  phone?: string;
  deficits?: any;
  userPrompt?: string;
  idToken?: string;
}): Promise<GenerateSiteResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.idToken) {
    headers["Authorization"] = `Bearer ${params.idToken}`;
  }

  const res = await fetch("/api/generate-site", {
    method: "POST",
    headers,
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to generate site (${res.status})`);
  }

  return res.json();
}

export async function refineSiteApi(params: {
  site: GeneratedSite;
  prompt: string;
  idToken?: string;
}): Promise<{ site: GeneratedSite; changesSummary?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.idToken) {
    headers["Authorization"] = `Bearer ${params.idToken}`;
  }

  const res = await fetch("/api/refine-site", {
    method: "POST",
    headers,
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to refine site (${res.status})`);
  }

  return res.json();
}

export async function createPreviewTokenApi(siteId: string, idToken?: string): Promise<{ previewToken: string; previewUrl: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(`/api/preview/${siteId}/generate-token`, {
    method: "POST",
    headers
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to generate preview link (${res.status})`);
  }

  return res.json();
}

export async function deploySiteApi(siteId: string, customDomain?: string, idToken?: string): Promise<DeploySiteResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(`/api/sites/${siteId}/deploy`, {
    method: "POST",
    headers,
    body: JSON.stringify({ customDomain })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to deploy site (${res.status})`);
  }

  return res.json();
}
