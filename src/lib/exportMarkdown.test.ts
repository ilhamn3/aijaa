import { describe, it, expect } from "vitest";
import { tipTapToMarkdown } from "./exportMarkdown";

describe("Export Markdown (tipTapToMarkdown)", () => {
  it("converts headings into markdown #, ##, ###", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Main Title" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Subtitle" }],
        },
      ],
    };

    const md = tipTapToMarkdown(doc);
    expect(md).toContain("# Main Title");
    expect(md).toContain("## Subtitle");
  });

  it("converts bold, italic, and underline marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Normal " },
            { type: "text", marks: [{ type: "bold" }], text: "Bold" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "Italic" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "underline" }], text: "Underline" },
          ],
        },
      ],
    };

    const md = tipTapToMarkdown(doc);
    expect(md).toContain("Normal **Bold** and *Italic* and <u>Underline</u>");
  });

  it("converts bulleted and numbered lists", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First bullet" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second bullet" }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First ordered" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second ordered" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const md = tipTapToMarkdown(doc);
    expect(md).toContain("- First bullet");
    expect(md).toContain("- Second bullet");
    expect(md).toContain("1. First ordered");
    expect(md).toContain("2. Second ordered");
  });

  it("handles empty or null documents gracefully", () => {
    expect(tipTapToMarkdown(null)).toBe("");
    expect(tipTapToMarkdown(undefined)).toBe("");
    expect(tipTapToMarkdown({ type: "doc", content: [] })).toBe("\n");
  });
});
