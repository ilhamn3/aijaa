import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { marked } from "marked";
import mammoth from "mammoth";

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  ".txt": ["text/plain", "application/octet-stream"],
  ".md": [
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/octet-stream",
  ],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/msword",
    "application/octet-stream",
  ],
};

const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
];

/**
 * Converts raw plain text into TipTap JSON.
 * Splits on blank lines (double newlines) into paragraphs, preserving text cleanly.
 */
export function convertTextToTipTap(text: string): JSONContent {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("File content is empty");
  }

  // Split on blank lines to separate paragraphs
  const blocks = trimmed.split(/\r?\n\s*\r?\n/);
  const content: JSONContent[] = [];

  for (const block of blocks) {
    const cleanBlock = block.trim();
    if (cleanBlock.length > 0) {
      // Clean internal single newlines into spaces or preserve cleanly
      const normalizedLines = cleanBlock.split(/\r?\n/).map((l) => l.trim()).join(" ");
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: normalizedLines }],
      });
    }
  }

  if (content.length === 0) {
    throw new Error("File content is empty");
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Converts Markdown string into TipTap JSON via marked + generateJSON.
 */
export async function convertMarkdownToTipTap(markdown: string): Promise<JSONContent> {
  const trimmed = markdown.trim();
  if (!trimmed) {
    throw new Error("File content is empty");
  }

  const html = await marked.parse(markdown);
  if (!html || !html.trim()) {
    throw new Error("Failed to parse markdown content");
  }

  const rawJson = generateJSON(html, tiptapExtensions);
  return sanitizeTipTapAst(rawJson);
}

/**
 * Converts .docx buffer into TipTap JSON via mammoth + generateJSON.
 */
export async function convertDocxToTipTap(buffer: Buffer): Promise<JSONContent> {
  if (buffer.length === 0) {
    throw new Error("File content is empty");
  }

  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  if (!html || !html.trim()) {
    // If no HTML generated, extract raw text fallback
    const raw = await mammoth.extractRawText({ buffer });
    if (!raw.value || !raw.value.trim()) {
      throw new Error("Word document appears to be empty or unparseable");
    }
    return convertTextToTipTap(raw.value);
  }

  const rawJson = generateJSON(html, tiptapExtensions);
  return sanitizeTipTapAst(rawJson);
}

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "text",
  "horizontalRule",
  "blockquote",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "underline"]);

/**
 * Recursively filters TipTap AST nodes and marks to guarantee
 * that only schema-supported editor elements are preserved.
 */
export function sanitizeTipTapAst(node: JSONContent): JSONContent {
  if (!node || typeof node !== "object") {
    return { type: "doc", content: [] };
  }

  if (!ALLOWED_NODE_TYPES.has(node.type || "")) {
    // Convert unrecognized block nodes to paragraphs or unwrap
    return {
      type: "paragraph",
      content: node.content ? node.content.map(sanitizeTipTapAst) : [],
    };
  }

  const sanitized: JSONContent = { type: node.type };

  // Headings: restrict to level 1, 2, or 3
  if (node.type === "heading") {
    const rawLevel = Number(node.attrs?.level) || 1;
    sanitized.attrs = { level: Math.min(Math.max(rawLevel, 1), 3) };
  } else if (node.attrs) {
    sanitized.attrs = node.attrs;
  }

  // Text nodes & marks
  if (node.type === "text") {
    sanitized.text = node.text || "";
    if (node.marks && Array.isArray(node.marks)) {
      sanitized.marks = node.marks.filter((m) => ALLOWED_MARKS.has(m.type));
    }
  }

  // Child nodes
  if (node.content && Array.isArray(node.content)) {
    sanitized.content = node.content.map(sanitizeTipTapAst);
  }

  return sanitized;
}

/**
 * Validates extension and MIME type.
 */
export function validateFileType(
  filename: string,
  mimeType: string
): { isValid: boolean; extension: string; error?: string } {
  const ext = getFileExtension(filename);
  const isSupportedExt = SUPPORTED_EXTENSIONS.includes(
    ext as (typeof SUPPORTED_EXTENSIONS)[number]
  );

  if (!isSupportedExt) {
    return {
      isValid: false,
      extension: ext,
      error: `Unsupported file extension "${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    };
  }

  const validMimes = ALLOWED_MIME_TYPES[ext] || [];
  // Allow if mimeType matches or if standard generic octet-stream
  const isValidMime =
    validMimes.includes(mimeType.toLowerCase()) ||
    mimeType === "application/octet-stream" ||
    mimeType === "";

  if (!isValidMime) {
    return {
      isValid: false,
      extension: ext,
      error: `Unsupported media type "${mimeType}" for file "${filename}".`,
    };
  }

  return { isValid: true, extension: ext };
}

/**
 * Main dispatcher to convert an uploaded file into TipTap JSON.
 */
export async function convertUploadedFileToTipTap(
  filename: string,
  buffer: Buffer
): Promise<{ title: string; content: JSONContent }> {
  const ext = getFileExtension(filename);
  const baseTitle = getCleanTitle(filename);

  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty (0 bytes)");
  }

  let content: JSONContent;

  switch (ext) {
    case ".txt": {
      const text = buffer.toString("utf-8");
      content = convertTextToTipTap(text);
      break;
    }
    case ".md": {
      const markdown = buffer.toString("utf-8");
      content = await convertMarkdownToTipTap(markdown);
      break;
    }
    case ".docx": {
      content = await convertDocxToTipTap(buffer);
      break;
    }
    default:
      throw new Error(
        `Unsupported file type "${ext}". Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}`
      );
  }

  if (!content || content.type !== "doc") {
    content = { type: "doc", content: [] };
  }

  return {
    title: baseTitle || "Imported Document",
    content,
  };
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

export function getCleanTitle(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot).trim();
}
