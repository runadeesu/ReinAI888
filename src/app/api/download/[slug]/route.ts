import { NextResponse } from "next/server";

// Fixed slug -> (Blob key, download filename) map for the small set of
// distributable binaries we host this way, rather than accepting an
// arbitrary filename param and looking it up in the store directly.
const DOWNLOADS: Record<string, { blobKey: string; fileName: string }> = {
  "reinai-code-setup": {
    blobKey: "reinai-code/ReinAI-Code-Setup-0.1.0.exe",
    fileName: "ReinAI Code Setup 0.1.0.exe",
  },
  "reinai-code-portable": {
    blobKey: "reinai-code/ReinAI-Code-Portable-0.1.0.exe",
    fileName: "ReinAI Code Portable 0.1.0.exe",
  },
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = DOWNLOADS[slug];
  if (!entry) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  if (process.env.VERCEL === "1") {
    const { head } = await import("@vercel/blob");
    try {
      const blob = await head(entry.blobKey);
      return NextResponse.redirect(blob.downloadUrl);
    } catch {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("reinai-code-downloads");

  const blob = await store.get(entry.blobKey, { type: "stream" });
  if (!blob) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }

  return new Response(blob, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${entry.fileName}"`,
    },
  });
}
