// No `role` column exists on User — this is a small, single-tenant admin
// setup, so an email allowlist is enough and avoids another schema
// migration. Defaults to the one admin account created for this app;
// ADMIN_EMAILS (comma-separated) overrides/extends it if ever needed.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const configured = process.env.ADMIN_EMAILS?.trim();
  const allowlist = (configured && configured.length > 0 ? configured : "admin@reinai.local")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
