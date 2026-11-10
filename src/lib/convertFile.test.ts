import { describe, it, expect } from "vitest";
import {
  convertTextToTipTap,
  convertMarkdownToTipTap,
  convertUploadedFileToTipTap,
  validateFileType,
  sanitizeTipTapAst,
  getFileExtension,
  getCleanTitle,
} from "./convertFile";

describe("File Upload Conversion (convertFile)", () => {
  describe("Plain text conversion", () => {
    it("splits on blank lines into distinct TipTap paragraphs", () => {
      const text = "First paragraph line 1.\nFirst paragraph line 2.\n\nSecond paragraph content.\n\nThird paragraph.";
      const json = convertTextToTipTap(text);

      expect(json.type).toBe("doc");
      expect(json.content).toHaveLength(3);
      expect(json.content![0].type).toBe("paragraph");
      expect(json.content![0].content![0].text).toContain("First paragraph line 1.");
      expect(json.content![1].content![0].text).toBe("Second paragraph content.");
      expect(json.content![2].content![0].text).toBe("Third paragraph.");
    });

    it("throws error when plain text is empty or only whitespace", () => {
      expect(() => convertTextToTipTap("")).toThrow("File content is empty");
      expect(() => convertTextToTipTap("   \n\n   ")).toThrow("File content is empty");
    });
  });

  describe("Markdown conversion", () => {
    it("converts headings, bold, italic, and lists into TipTap nodes", async () => {
      const md = `
# Main Heading 1
## Sub Heading 2
### Section 3

Paragraph with **bold text**, *italic text*, and regular words.

- Bullet item alpha
- Bullet item beta

1. Ordered item one
2. Ordered item two
`;
      const json = await convertMarkdownToTipTap(md);

      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();

      // Heading 1
      const h1 = json.content!.find(
        (n: any) => n.type === "heading" && n.attrs?.level === 1
      );
      expect(h1).toBeDefined();

      // Heading 2
      const h2 = json.content!.find(
        (n: any) => n.type === "heading" && n.attrs?.level === 2
      );
      expect(h2).toBeDefined();

      // Bold text mark
      const paragraph = json.content!.find((n: any) => n.type === "paragraph");
      expect(paragraph).toBeDefined();
      const boldNode = paragraph?.content?.find(
        (c: any) => c.marks && c.marks.some((m: any) => m.type === "bold")
      );
      expect(boldNode).toBeDefined();
      expect(boldNode?.text).toBe("bold text");

      // Bullet List
      const bulletList = json.content!.find((n: any) => n.type === "bulletList");
      expect(bulletList).toBeDefined();
      expect(bulletList?.content?.length).toBe(2);

      // Ordered List
      const orderedList = json.content!.find((n: any) => n.type === "orderedList");
      expect(orderedList).toBeDefined();
      expect(orderedList?.content?.length).toBe(2);
    });

    it("throws error when markdown content is empty", async () => {
      await expect(convertMarkdownToTipTap("   ")).rejects.toThrow("File content is empty");
    });
  });

  describe("Schema Sanitizer (sanitizeTipTapAst)", () => {
    it("caps heading levels to maximum supported level 3", () => {
      const ast = {
        type: "heading",
        attrs: { level: 5 },
        content: [{ type: "text", text: "Deep heading" }],
      };
      const sanitized = sanitizeTipTapAst(ast);
      expect(sanitized.type).toBe("heading");
      expect(sanitized.attrs?.level).toBe(3);
    });

    it("filters out unsupported marks preserving allowed marks", () => {
      const node = {
        type: "text",
        text: "Sample text",
        marks: [
          { type: "bold" },
          { type: "unsupportedMark" },
          { type: "italic" },
        ],
      };
      const sanitized = sanitizeTipTapAst(node);
      expect(sanitized.marks).toEqual([{ type: "bold" }, { type: "italic" }]);
    });
  });

  describe("Type & MIME Validation (validateFileType)", () => {
    it("accepts valid extensions with matching MIME types", () => {
      expect(validateFileType("doc.txt", "text/plain").isValid).toBe(true);
      expect(validateFileType("spec.md", "text/markdown").isValid).toBe(true);
      expect(
        validateFileType(
          "file.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ).isValid).toBe(true);
    });

    it("rejects unsupported file extensions with 415 error hint", () => {
      const res = validateFileType("image.png", "image/png");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported file extension ".png"');
    });

    it("rejects mismatched invalid MIME types", () => {
      const res = validateFileType("file.txt", "video/mp4");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Unsupported media type");
    });
  });

  describe("convertUploadedFileToTipTap dispatcher", () => {
    it("converts .txt file buffer and derives title from filename", async () => {
      const buffer = Buffer.from("Line 1\n\nLine 2");
      const res = await convertUploadedFileToTipTap("Meeting Notes.txt", buffer);

      expect(res.title).toBe("Meeting Notes");
      expect(res.content.type).toBe("doc");
      expect(res.content.content).toHaveLength(2);
    });

    it("rejects empty buffer with clear message", async () => {
      const emptyBuffer = Buffer.from("");
      await expect(
        convertUploadedFileToTipTap("empty.txt", emptyBuffer)
      ).rejects.toThrow("Uploaded file is empty");
    });
  });

  describe("Helper utilities", () => {
    it("extracts file extension cleanly", () => {
      expect(getFileExtension("doc.TXT")).toBe(".txt");
      expect(getFileExtension("report.final.docx")).toBe(".docx");
      expect(getFileExtension("README.md")).toBe(".md");
      expect(getFileExtension("noextension")).toBe("");
    });

    it("extracts clean title without extension", () => {
      expect(getCleanTitle("Quarterly Report.docx")).toBe("Quarterly Report");
      expect(getCleanTitle("spec.final.md")).toBe("spec.final");
    });
  });
});
