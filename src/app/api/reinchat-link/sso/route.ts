import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { reinChatUrl } from "@/lib/reinchat/shared-secret";

// Session-authenticated: mints a real one-time Supabase magic link for the
// linked REINChat account (via REINChat's own Supabase project, using its
// service_role key) and redirects there. REINChat's existing /auth/confirm
// route already knows how to redeem a token_hash of any Supabase OTP type.
export async function GET() {
  const userId = await requireUserId();
  const loginUrl = new URL("/login", process.env.NEXTAUTH_URL ?? "https://reinai-app.vercel.app");
  if (!userId) return NextResponse.redirect(loginUrl);

  const link = await prisma.reinChatLink.findUnique({ where: { userId } });
  const settingsUrl = new URL("/settings/account", process.env.NEXTAUTH_URL ?? "https://reinai-app.vercel.app");
  if (!link) {
    settingsUrl.searchParams.set("reinchat", "not_linked");
    return NextResponse.redirect(settingsUrl);
  }

  const supabaseUrl = process.env.REINCHAT_SUPABASE_URL;
  const serviceRoleKey = process.env.REINCHAT_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    settingsUrl.searchParams.set("reinchat", "not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email: link.reinchatEmail }),
  });

  if (!res.ok) {
    settingsUrl.searchParams.set("reinchat", "sso_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const data = await res.json();
  const hashedToken: string | undefined = data.properties?.hashed_token ?? data.hashed_token;
  const verificationType: string = data.properties?.verification_type ?? data.verification_type ?? "magiclink";

  if (!hashedToken) {
    settingsUrl.searchParams.set("reinchat", "sso_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const confirmUrl = new URL(`${reinChatUrl()}/auth/confirm`);
  confirmUrl.searchParams.set("token_hash", hashedToken);
  confirmUrl.searchParams.set("type", verificationType);
  return NextResponse.redirect(confirmUrl);
}
