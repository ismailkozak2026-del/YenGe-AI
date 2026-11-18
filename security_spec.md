# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Admin Authority**: Only verified administrators (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or verified bootstrapped super-admin `ismailkozak2026@gmail.com` with `email_verified == true`) can create, update, delete, or list `/admins`, `/access_policies`, and `/audit_logs`, or modify `/app_configs`.
2. **Global Config Read Scope**: Only `/app_configs/global` (which contains zero PII) may be read (`get`) by YenGeç clients; `list` on `/app_configs` is restricted strictly to admins.
3. **PII Isolation**: `/access_policies`, `/admins`, and `/audit_logs` may contain emails or user identifiers; read (`get`, `list`) is strictly restricted to verified admins (`isAdmin()`).
4. **Immutable & Server-Validated Timestamps**: Every document requires `createdAt == request.time` on create; mutable documents enforce `createdAt == existing().createdAt` and `updatedAt == request.time` on update. `/audit_logs` is strictly append-only (no update/delete).
5. **Strict Keys & Bounds**: Every string field has explicit `.size()` bounds; numeric limits (`dailyMessageLimit`, `dailyImageLimit`, `maxUploadSizeMb`, `customDailyLimit`) are strictly bounded integers; document IDs satisfy `isValidId(id)`.
6. **Identity Integrity**: Writes must bind `updatedByUid == request.auth.uid`, `ownerUid == request.auth.uid`, or `actorUid == request.auth.uid`, and `ownerUid` / `createdAt` remain immutable on update.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Return `PERMISSION_DENIED`)
1. **Unauthenticated Write to `app_configs/global`**: `{ "maintenanceMode": true }` -> Rejected (`!isSignedIn()`).
2. **Non-Admin Authenticated Write to `app_configs/global`**: Signed-in user `user@example.com` tries to flip `allowWebSearch: false` -> Rejected (`!isAdmin()`).
3. **Unverified Admin Email Spoof**: Token has `email: "ismailkozak2026@gmail.com"` with `email_verified: false` -> Rejected (`!isAdmin()`).
4. **Self-Assigned Admin Escalation**: Non-admin creates `/admins/<uid>` with `role: "super_admin"` -> Rejected (`!isAdmin()`).
5. **Shadow / Ghost Field Injection on `app_configs/global`**: Admin sends valid fields plus `"ghostPrivilege": true` -> Rejected (`keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`).
6. **Client Timestamp Forgery**: Admin creates `/access_policies/pol1` with `createdAt` set to a fake client timestamp instead of `request.time` -> Rejected (`incoming().createdAt == request.time`).
7. **Immutable `createdAt` Tampering on Update**: Admin updates `/app_configs/global` and modifies `createdAt` -> Rejected (`incoming().createdAt == existing().createdAt`).
8. **Audit Log Tampering / Deletion**: Admin attempts `update` or `delete` on `/audit_logs/log1` -> Rejected (`allow update, delete: if false;`).
9. **ID Poisoning Attack**: Admin attempts to create `/access_policies/../../../bad$id` or 500-char ID -> Rejected (`!isValidId(policyId)`).
10. **PII Blanket Read on `access_policies` or `admins`**: Signed-in non-admin calls `getDocs(collection(db, 'access_policies'))` -> Rejected (`!isAdmin()`).
11. **Oversized String / Denial-of-Wallet Payload**: Admin sends 10,000-character `defaultSystemPrompt` (> 2000 limit) -> Rejected (`data.defaultSystemPrompt.size() <= 2000`).
12. **UID Spoofing on Audit Log**: Admin writes `/audit_logs/log2` with `actorUid: "someone_else"` != `request.auth.uid` -> Rejected (`data.actorUid == request.auth.uid`).
