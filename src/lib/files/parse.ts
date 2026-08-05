const TEXT_LIKE_EXTENSIONS = new Set([
  "txt", "md", "json", "yaml", "yml", "csv", "tsv", "log", "xml", "html", "css",
  "js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "kt", "swift", "cs", "cpp",
  "c", "h", "hpp", "php", "sql", "sh", "rb", "vue", "toml", "ini", "env",
]);

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Extracts a text representation of an uploaded file so it can be used as
 * AI context. Returns null for formats we don't extract text from (images,
 * audio, video, archives) — those are still stored and downloadable.
 */
export async function extractText(fileName: string, mimeType: string, buffer: Buffer): Promise<string | null> {
  const ext = extensionOf(fileName);

  if (mimeType.startsWith("text/") || TEXT_LIKE_EXTENSIONS.has(ext)) {
    return buffer.toString("utf8").slice(0, 200_000);
  }

  if (mimeType === "application/pdf" || ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text.slice(0, 200_000);
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.slice(0, 200_000);
  }

  return null;
}

export function isSupportedMimeType(mimeType: string): boolean {
  const allowedPrefixes = ["text/", "image/", "audio/", "video/", "application/"];
  return allowedPrefixes.some((prefix) => mimeType.startsWith(prefix));
}
