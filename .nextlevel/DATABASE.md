# Database Schema & Data Invariants

## Firestore Collections
- `/users/{userId}`: User profile records, role metadata (`user` vs `admin`), and configuration.
- `/sites/{siteId}`: Generated website documents, section layouts, theme settings, deployment logs, and approval records.
- `/publicPreviews/{previewToken}`: Tokenized preview documents with public `get` permissions by exact token ID.
- `/publicPreviews/{previewToken}/events/{eventId}`: Append-only visitor feedback, telemetry, and approval submissions.
- `/businesses/{businessId}`: Saved prospect CRM records and historical audit profiles.

## Data Invariants
1. `userId` matches authenticated UID on creation.
2. Ownership fields are immutable during updates.
3. Unauthenticated collection scans on private paths are denied.
4. Telemetry events can be created by visitors but cannot be modified or deleted.
