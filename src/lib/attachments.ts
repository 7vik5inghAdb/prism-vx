"use client";

import type { Attachment, AttachmentKind } from "@/types";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file
const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // 30MB total

export const ACCEPT_LIST = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
].join(",");

export const ACCEPT_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.md";

export function classifyFile(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
    return "pdf";
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  )
    return "docx";
  if (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.name.toLowerCase().endsWith(".md") ||
    file.name.toLowerCase().endsWith(".txt")
  )
    return "txt";
  return null;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsArrayBuffer(file);
  });
}

async function extractPdfText(file: File): Promise<string> {
  // Lazy-load pdfjs to keep initial bundle small
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buf = await readAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    out.push(text);
  }
  return out.join("\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await readAsArrayBuffer(file);
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value;
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read text file"));
    r.readAsText(file);
  });
}

export interface ParseResult {
  attachment?: Attachment;
  error?: string;
}

export async function parseFile(
  file: File,
  existingTotalBytes: number
): Promise<ParseResult> {
  const kind = classifyFile(file);
  if (!kind) {
    return {
      error: `Unsupported file type: ${file.name}. Use images, PDF, DOCX, TXT, or MD.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      error: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Limit is 15MB per file.`,
    };
  }
  if (existingTotalBytes + file.size > MAX_TOTAL_BYTES) {
    return {
      error: `Adding ${file.name} would exceed the 30MB total upload limit.`,
    };
  }

  try {
    let content = "";
    if (kind === "image") {
      content = await readAsDataURL(file);
    } else if (kind === "pdf") {
      content = await extractPdfText(file);
      if (!content.trim()) {
        return {
          error: `${file.name} appears to be a scanned PDF (no extractable text). Try a text-based PDF or convert it first.`,
        };
      }
    } else if (kind === "docx") {
      content = await extractDocxText(file);
    } else if (kind === "txt") {
      content = await readAsText(file);
    }

    const attachment: Attachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      kind,
      size: file.size,
      content,
      mediaType: file.type || undefined,
    };
    return { attachment };
  } catch (err) {
    return {
      error: `Couldn't process ${file.name}: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

export function totalBytes(attachments: Attachment[]): number {
  return attachments.reduce((sum, a) => sum + a.size, 0);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
