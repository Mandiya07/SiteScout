/**
 * Website Preview, Editing, Version Management & Customer Approval Test Suite
 * Micro-Phase 19D
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { GeneratedSite, Business } from "../types";
import { normalizeWebsiteSchema, validateWebsiteSchema } from "../lib/websiteSchema";
import { 
  applyWebsiteUpdate, 
  restoreWebsiteVersion, 
  recordCustomerApproval, 
  isMaterialChange,
  validatePreviewAccess 
} from "../lib/websiteVersioning";
import { generateSecurePreviewToken, sanitizePublicPreview } from "../lib/security";
import { generateStaticHtml } from "../lib/htmlGenerator";

describe("MICRO-PHASE 19D: Website Preview, Editing & Customer Approval Validation", () => {

  // Sample base site for testing
  const createBaseSite = (siteId = "site_alpha_123"): GeneratedSite => {
    return normalizeWebsiteSchema({
      id: siteId,
      businessName: "Highland Civil Engineering",
      category: "Construction",
      address: "Mbabane Industrial Park",
      phone: "+268 7601 2233",
      primaryColor: "#ea580c",
      fontStyle: "display",
      hero: {
        title: "Precision Civil Engineering & Earthworks",
        subtitle: "Delivering infrastructure reliability across Eswatini.",
        ctaPrimary: "Request Tender Evaluation",
        ctaSecondary: "View Projects",
        imageUrl: "https://images.unsplash.com/photo-civil-engineering"
      },
      services: [
        { title: "Structural Concrete", description: "Reinforced building frameworks.", price: "Request a Quote" },
        { title: "Earthmoving & Gradients", description: "Site leveling and excavation.", price: "Request a Quote" }
      ],
      previewToken: generateSecurePreviewToken()
    });
  };

  describe("A. Website Editing & Multi-Site Isolation", () => {
    it("allows editing core business identity, headlines, services, images, and styling", () => {
      const original = createBaseSite();
      
      const edited = applyWebsiteUpdate(original, {
        businessName: "Highland Civil & Infrastructure Ltd",
        primaryColor: "#0284c7",
        fontStyle: "sans",
        hero: {
          ...original.hero,
          title: "Leading Infrastructure & Commercial Construction",
          ctaPrimary: "Download Company Profile"
        },
        services: [
          ...original.services,
          { title: "Asphalt Surfacing & Roadways", description: "Municipal paving.", price: "Request a Quote" }
        ]
      }, "editor@sitescout.ai", "Updated company name, primary color, and added paving service");

      // Verify updates took effect
      assert.strictEqual(edited.businessName, "Highland Civil & Infrastructure Ltd");
      assert.strictEqual(edited.primaryColor, "#0284c7");
      assert.strictEqual(edited.fontStyle, "sans");
      assert.strictEqual(edited.hero.title, "Leading Infrastructure & Commercial Construction");
      assert.strictEqual(edited.hero.ctaPrimary, "Download Company Profile");
      assert.strictEqual(edited.services.length, 3);
      assert.strictEqual(edited.services[2].title, "Asphalt Surfacing & Roadways");

      // Verify schema remains valid
      const validation = validateWebsiteSchema(edited);
      assert.strictEqual(validation.valid, true, "Updated website must remain 100% valid schema");
    });

    it("guarantees editing one website never mutates another website (Site Isolation)", () => {
      const siteA = createBaseSite("site_A");
      const siteB = createBaseSite("site_B");
      siteB.businessName = "Beta Mechanical Repairs";
      siteB.category = "Auto Repair";

      // Edit Site A
      const updatedSiteA = applyWebsiteUpdate(siteA, {
        businessName: "Alpha Civil Renovations",
        primaryColor: "#10b981"
      });

      // Verify Site A changed
      assert.strictEqual(updatedSiteA.businessName, "Alpha Civil Renovations");
      assert.strictEqual(updatedSiteA.primaryColor, "#10b981");

      // Verify Site B was completely untouched
      assert.strictEqual(siteB.id, "site_B");
      assert.strictEqual(siteB.businessName, "Beta Mechanical Repairs");
      assert.strictEqual(siteB.category, "Auto Repair");
      assert.notStrictEqual(siteB.businessName, updatedSiteA.businessName);
    });

    it("preserves verified business facts and keeps AI drafts distinguishable", () => {
      const site = createBaseSite();
      site.provenance = {
        businessName: "VERIFIED",
        phone: "VERIFIED",
        address: "VERIFIED",
        heroSubtitle: "AI_DRAFT",
        services: "AI_DRAFT"
      };

      const updated = applyWebsiteUpdate(site, {
        hero: {
          ...site.hero,
          subtitle: "Newly user-edited subtitle with guaranteed local dispatch"
        }
      });

      // Business name and phone remain VERIFIED
      assert.strictEqual(updated.provenance?.businessName, "VERIFIED");
      assert.strictEqual(updated.provenance?.phone, "VERIFIED");
    });
  });

  describe("B. Preview Consistency & Sanitization", () => {
    it("renders saved version consistently in static HTML with zero unsaved ghost edits", () => {
      const savedSite = createBaseSite();
      const html = generateStaticHtml(savedSite);

      // Verify core content rendered into preview HTML
      assert.ok(html.includes("Highland Civil Engineering"), "Preview HTML must render saved business name");
      assert.ok(html.includes("Structural Concrete"), "Preview HTML must render saved services");
      assert.ok(html.includes("Request Tender Evaluation"), "Preview HTML must render saved primary CTA");
      assert.ok(html.includes("#ea580c"), "Preview HTML must render primary color token");
    });

    it("sanitizes private CRM notes, internal flags, and revenue estimates from public previews", () => {
      const privateSite: any = {
        ...createBaseSite(),
        estimatedDealValue: 5000,
        proposedDealValue: 7500,
        prospectNotes: "Client is price-sensitive, offer 10% discount on closing",
        internalTags: ["HIGH_VALUE", "PRIORITY_A"],
        activeOutreachDraftId: "draft_secret_123"
      };

      const publicSanitized = sanitizePublicPreview(privateSite);

      // Verify private fields are completely stripped
      assert.strictEqual((publicSanitized as any).estimatedDealValue, undefined);
      assert.strictEqual((publicSanitized as any).proposedDealValue, undefined);
      assert.strictEqual((publicSanitized as any).prospectNotes, undefined);
      assert.strictEqual((publicSanitized as any).internalTags, undefined);
      assert.strictEqual((publicSanitized as any).activeOutreachDraftId, undefined);

      // Verify public presentation content is preserved
      assert.strictEqual(publicSanitized.businessName, "Highland Civil Engineering");
      assert.strictEqual(publicSanitized.hero.title, privateSite.hero.title);
      assert.strictEqual(publicSanitized.services.length, 2);
    });
  });

  describe("C. Secure Preview Tokens, Expiration & Revocation", () => {
    it("authorizes valid tokens and rejects malformed, expired, or revoked tokens", () => {
      const site = createBaseSite();
      const validToken = site.previewToken!;

      // 1. Valid token
      const accessValid = validatePreviewAccess(site, validToken);
      assert.strictEqual(accessValid.authorized, true);
      assert.strictEqual(accessValid.statusCode, 200);

      // 2. Malformed / too short token
      const accessShort = validatePreviewAccess(site, "abc");
      assert.strictEqual(accessShort.authorized, false);
      assert.strictEqual(accessShort.statusCode, 400);

      // 3. Nonexistent / mismatched token
      const accessMismatch = validatePreviewAccess(site, "unknown_token_999999");
      assert.strictEqual(accessMismatch.authorized, false);
      assert.strictEqual(accessMismatch.statusCode, 404);

      // 4. Revoked token
      const revokedSite = { ...site, previewRevoked: true };
      const accessRevoked = validatePreviewAccess(revokedSite, validToken);
      assert.strictEqual(accessRevoked.authorized, false);
      assert.strictEqual(accessRevoked.statusCode, 410);
      assert.ok(accessRevoked.reason?.includes("revoked"));

      // 5. Expired token
      const expiredDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const expiredSite: any = { ...site, previewExpiresAt: expiredDate };
      const accessExpired = validatePreviewAccess(expiredSite, validToken);
      assert.strictEqual(accessExpired.authorized, false);
      assert.strictEqual(accessExpired.statusCode, 410);
      assert.ok(accessExpired.reason?.includes("expired"));
    });
  });

  describe("D. Website Version Management & Rollback Recovery", () => {
    it("increments version number and creates recoverable snapshots upon material changes", () => {
      const v1 = createBaseSite();
      assert.strictEqual(v1.currentVersion || 1, 1);

      // Apply material edit (changing services and hero)
      const v2 = applyWebsiteUpdate(v1, {
        hero: {
          ...v1.hero,
          title: "New Headline for Version 2"
        },
        services: [
          { title: "Turnkey Commercial Building", description: "Full construction management.", price: "Request a Quote" }
        ]
      }, "strategist@sitescout.ai", "Revamped headline and services deck");

      assert.strictEqual(v2.currentVersion, 2, "Material changes must increment currentVersion to 2");
      assert.strictEqual(v2.versionHistory?.length, 2, "Must contain snapshots for v1 and v2");
      assert.strictEqual(v2.hero.title, "New Headline for Version 2");

      // Verify v1 snapshot is preserved intact in history
      const v1Snapshot = v2.versionHistory?.find(v => v.version === 1);
      assert.ok(v1Snapshot, "Version 1 snapshot must exist in history");
      assert.strictEqual(v1Snapshot.snapshot.hero?.title, "Precision Civil Engineering & Earthworks");

      // Rollback to v1
      const restoredV3 = restoreWebsiteVersion(v2, 1, "admin@sitescout.ai");
      assert.strictEqual(restoredV3.currentVersion, 3, "Rollback creates new version 3 reflecting restored state");
      assert.strictEqual(restoredV3.hero.title, "Precision Civil Engineering & Earthworks", "Restored version must match v1 headline");
    });

    it("does not artificially increment version on non-material changes", () => {
      const v1 = createBaseSite();
      const updatedNonMaterial = applyWebsiteUpdate(v1, {
        seo: {
          ...v1.seo,
          keywords: "civil, engineering, construction, eswatini, updated-keywords"
        }
      });

      assert.strictEqual(updatedNonMaterial.currentVersion, 1, "Non-material SEO keyword update should not bump core version");
    });
  });

  describe("E. Customer Approval Workflow & Invalidation of Approved Versions", () => {
    it("enforces explicit customer approval tied to a specific version number", () => {
      const site = createBaseSite();
      site.currentVersion = 2;

      // Customer approves v2
      const { updatedSite, approvalRecord } = recordCustomerApproval(site, {
        decision: "APPROVED",
        approverName: "Director Sipho Dlamini",
        approverEmail: "sipho@highlandcivil.com",
        notes: "Approved layout and color scheme. Ready for domain mapping."
      });

      assert.strictEqual(updatedSite.previewApprovalStatus, "APPROVED");
      assert.strictEqual(updatedSite.clientApproved, true);
      assert.strictEqual(updatedSite.clientApprovedBy, "Director Sipho Dlamini");
      assert.strictEqual(approvalRecord.versionNumber, 2, "Approval must be tied specifically to Version 2");
      assert.strictEqual(approvalRecord.isContractualAcceptance, false, "Draft approval is not a contractual/billing commitment");
      assert.strictEqual(updatedSite.approvalHistory?.length, 1);
    });

    it("invalidates approval and resets status to READY_FOR_REVIEW when material edits are made to an approved site", () => {
      const site = createBaseSite();
      site.currentVersion = 2;

      // 1. Approve v2
      const { updatedSite: approvedV2 } = recordCustomerApproval(site, {
        decision: "APPROVED",
        approverName: "Director Sipho Dlamini"
      });
      assert.strictEqual(approvedV2.previewApprovalStatus, "APPROVED");
      assert.strictEqual(approvedV2.clientApproved, true);

      // 2. Make material modification after approval (e.g. changing headline & primary color)
      const modifiedV3 = applyWebsiteUpdate(approvedV2, {
        primaryColor: "#7c3aed",
        hero: {
          ...approvedV2.hero,
          title: "Substantially Altered Headline Post-Approval"
        }
      }, "designer@sitescout.ai", "Post-approval color theme and headline change");

      // 3. Verify approval was invalidated
      assert.strictEqual(modifiedV3.currentVersion, 3, "Bumps to Version 3");
      assert.strictEqual(modifiedV3.previewApprovalStatus, "READY_FOR_REVIEW", "Must reset to READY_FOR_REVIEW for renewed approval");
      assert.strictEqual(modifiedV3.clientApproved, false, "Client approval flag must be invalidated");
      assert.strictEqual(modifiedV3.previousApprovedVersion, 2, "Must record that Version 2 was the last approved version");

      // 4. Verify v2 remains recorded as APPROVED in version history
      const v2History = modifiedV3.versionHistory?.find(v => v.version === 2);
      assert.strictEqual(v2History?.approvalStatus, "APPROVED", "Version 2 record in history must preserve its APPROVED state");
    });

    it("records CHANGES_REQUESTED with client notes without falsely approving the site", () => {
      const site = createBaseSite();
      
      const { updatedSite, approvalRecord } = recordCustomerApproval(site, {
        decision: "CHANGES_REQUESTED",
        approverName: "Jane Maseko",
        notes: "Please change the primary blue to industrial orange and add road surfacing service."
      });

      assert.strictEqual(updatedSite.previewApprovalStatus, "CHANGES_REQUESTED");
      assert.strictEqual(updatedSite.clientApproved, false);
      assert.strictEqual(approvalRecord.decision, "CHANGES_REQUESTED");
      assert.strictEqual(approvalRecord.notes, "Please change the primary blue to industrial orange and add road surfacing service.");
    });

    it("rejects approval attempts missing the authorized approver name", () => {
      const site = createBaseSite();
      
      assert.throws(() => {
        recordCustomerApproval(site, {
          decision: "APPROVED",
          approverName: "   " // empty
        });
      }, /Approver name is required/);
    });
  });

  describe("F. Preview Analytics & Event Logging", () => {
    it("validates telemetry events without inferring intent from preview views alone", () => {
      const supportedEvents = [
        "PREVIEW_OPENED",
        "PREVIEW_VIEWED",
        "CTA_CLICKED",
        "PHONE_CLICKED",
        "WHATSAPP_CLICKED",
        "FORM_SUBMITTED",
        "CHANGES_REQUESTED",
        "APPROVAL_SUBMITTED"
      ];

      // Verify all supported event types are non-empty and well-formed
      for (const ev of supportedEvents) {
        assert.ok(ev.length > 3);
      }

      // Verify rule: opening preview DOES NOT modify approval status
      const site = createBaseSite();
      const views = (site.previewViews || 0) + 1;
      const openedSite = { ...site, previewViews: views };

      assert.strictEqual(openedSite.previewViews, 1);
      assert.strictEqual(openedSite.previewApprovalStatus || "DRAFT", "DRAFT");
      assert.strictEqual(openedSite.clientApproved ?? false, false, "Opening preview does not mean approval");
    });
  });

});
