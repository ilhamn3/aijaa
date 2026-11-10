import type { JSONContent } from "@tiptap/react";

/**
 * Converts a TipTap document AST into clean GitHub Flavored Markdown.
 */
export function tipTapToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return "";
  }

  const chunks: string[] = [];

  for (const node of doc.content) {
    const rendered = renderNode(node);
    if (rendered.length > 0) {
      chunks.push(rendered);
    }
  }

  return chunks.join("\n\n") + "\n";
}

function renderNode(node: JSONContent): string {
  if (!node || !node.type) return "";

  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level || 1;
      const prefix = "#".repeat(Math.min(Math.max(level, 1), 6)) + " ";
      return prefix + renderInlineContent(node.content);
    }

    case "paragraph": {
      return renderInlineContent(node.content);
    }

    case "bulletList": {
      if (!node.content) return "";
      return node.content
        .map((item) => {
          const text = renderNode(item).trim();
          return `- ${text}`;
        })
        .join("\n");
    }

    case "orderedList": {
      if (!node.content) return "";
      return node.content
        .map((item, index) => {
          const text = renderNode(item).trim();
          return `${index + 1}. ${text}`;
        })
        .join("\n");
    }

    case "listItem": {
      if (!node.content) return "";
      return node.content.map((child) => renderNode(child)).join("\n");
    }

    case "blockquote": {
      if (!node.content) return "";
      const inner = node.content.map((child) => renderNode(child)).join("\n");
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "horizontalRule": {
      return "---";
    }

    default:
      return renderInlineContent(node.content);
  }
}

function renderInlineContent(content?: JSONContent[]): string {
  if (!content || !Array.isArray(content)) return "";

  return content
    .map((node) => {
      if (node.type === "text" && typeof node.text === "string") {
        let text = node.text;

        if (node.marks && Array.isArray(node.marks)) {
          for (const mark of node.marks) {
            if (mark.type === "bold") {
              text = `**${text}**`;
            } else if (mark.type === "italic") {
              text = `*${text}*`;
            } else if (mark.type === "underline") {
              text = `<u>${text}</u>`;
            } else if (mark.type === "strike") {
              text = `~~${text}~~`;
            } else if (mark.type === "code") {
              text = `\`${text}\``;
            }
          }
        }

        return text;
      }

      if (node.type === "hardBreak") {
        return "  \n";
      }

      return "";
    })
    .join("");
}

