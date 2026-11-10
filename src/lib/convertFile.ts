import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { marked } from "marked";
import mammoth from "mammoth";

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
];

/**
 * Converts raw plain text into TipTap JSON structure (paragraphs).
 */
export function convertTextToTipTap(text: string): JSONContent {
  const lines = text.split(/\r?\n/);
  const content: JSONContent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [],
  };
}

/**
 * Converts Markdown string into TipTap JSON via marked + generateJSON.
 */
export async function convertMarkdownToTipTap(markdown: string): Promise<JSONContent> {
  const html = await marked.parse(markdown);
  const json = generateJSON(html, tiptapExtensions);
  return json;
}

/**
 * Converts .docx buffer into TipTap JSON via mammoth + generateJSON.
 */
export async function convertDocxToTipTap(buffer: Buffer): Promise<JSONContent> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const json = generateJSON(html, tiptapExtensions);
  return json;
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

  // Ensure root is a valid TipTap doc
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
