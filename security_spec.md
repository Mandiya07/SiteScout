# Phase 0: Payload-First Security Spec & Data Invariants

## Executive Summary
This document establishes the security architecture, data invariants, and adversarial test matrix for SiteScout AI's Firestore security infrastructure. It guarantees zero-trust data access, multi-tenant isolation, immutability of ownership claims, and protection against all common security vulnerabilities.

---

## 1. Data Invariants

### Invariant 1: User Identity & Privilege Boundary
- **Collection**: `/users/{userId}`
- **Invariant**: A document at `/users/{userId}` can only be created by an authenticated user where `request.auth.uid == userId`.
- **Privilege Escalation Guard**: Standard users CANNOT write or update their `role` field to `'admin'` or `'Admin'`. Role elevation is restricted strictly to existing admins or the system bootstrap email (`siphom.yati@gmail.com`).

### Invariant 2: Tenant Isolation & Immutability of Ownership
- **Collections**: `/sites/{siteId}`, `/generatedSites/{siteId}`, `/businesses/{businessId}`, `/prospects/{prospectId}`
- **Invariant**: Any created document MUST contain a `userId` or `ownerId` matching `request.auth.uid`.
- **Ownership Immutability**: During document update operations, `userId`, `ownerId`, and `createdBy` fields CANNOT be modified or removed (`maintainsOwnership` check).

### Invariant 3: Public Preview Token Isolation
- **Collection**: `/publicPreviews/{previewToken}`
- **Invariant**: Unauthenticated users are granted `get` access to individual preview documents by exact token ID ONLY.
- **No Unauthenticated Scanning**: Unauthenticated collection scans (`list` queries) are STRICTLY DENIED. `list` operations require authentication and ownership/admin privileges.

### Invariant 4: Telemetry & Event Append-Only Security
- **Subcollection**: `/publicPreviews/{previewToken}/events/{eventId}`
- **Invariant**: Anyone (including unauthenticated preview visitors) can `create` telemetry events (e.g. view, button click, feedback).
- **Read & Modification Restrictions**: Telemetry events cannot be modified or deleted by visitors. Reading event logs requires ownership of the parent preview document or admin privileges.

---

## 2. The "Dirty Dozen" Security Attack Vector Matrix

| ID | Attack Vector | Target Path | Attacker Role | Expected Result | Enforcing Rule |
|---|---|---|---|---|---|
| **PAYLOAD-01** | Unauthenticated Read on Private Site | `/sites/site-123` | Unauthenticated | **403 PERMISSION DENIED** | `isOwner(resource.data) \|\| isAdmin()` |
| **PAYLOAD-02** | Unauthenticated Collection Scan | `/sites` | Unauthenticated | **403 PERMISSION DENIED** | `isOwner(resource.data) \|\| isAdmin()` |
| **PAYLOAD-03** | Unauthorized Site Creation for Victim | `/sites/site-999` | Auth User A (attaching User B's `userId`) | **403 PERMISSION DENIED** | `request.resource.data.userId == request.auth.uid` |
| **PAYLOAD-04** | Self-Promoted Admin Role Elevation | `/users/user-A` | Auth User A (`role: "admin"`) | **403 PERMISSION DENIED** | Role escalation check |
| **PAYLOAD-05** | Cross-Tenant Site Modification | `/sites/site-user-B` | Auth User A | **403 PERMISSION DENIED** | `isOwner(resource.data)` |
| **PAYLOAD-06** | Ownership Hijacking via Field Mutation | `/sites/site-user-B` | Auth User B (updating `userId` to User A) | **403 PERMISSION DENIED** | `maintainsOwnership(newData, oldData)` |
| **PAYLOAD-07** | Unauthenticated Preview Collection Scan | `/publicPreviews` | Unauthenticated | **403 PERMISSION DENIED** | `allow list: if isSignedIn() ...` |
| **PAYLOAD-08** | Unauthenticated Public Preview Deletion | `/publicPreviews/token-123` | Unauthenticated | **403 PERMISSION DENIED** | `allow delete: if isSignedIn() ...` |
| **PAYLOAD-09** | Unauthenticated Telemetry Event Deletion | `/publicPreviews/token-123/events/ev-1` | Unauthenticated | **403 PERMISSION DENIED** | No delete rule for events |
| **PAYLOAD-10** | Unauthorized Telemetry Event Inspection | `/publicPreviews/token-123/events/ev-1` | Auth User A (not owner of token-123) | **403 PERMISSION DENIED** | Parent token ownership check |
| **PAYLOAD-11** | Unauthenticated User Profile Creation | `/users/user-victim` | Unauthenticated | **403 PERMISSION DENIED** | `isSignedIn() && request.auth.uid == userId` |
| **PAYLOAD-12** | Cross-Tenant User Profile Modification | `/users/user-B` | Auth User A | **403 PERMISSION DENIED** | `request.auth.uid == userId` |

---

## 3. Test Runner Infrastructure
Tests are implemented in `firestore.rules.test.ts` to rigorously evaluate all 12 Dirty Dozen payloads against real security rule assertions.
