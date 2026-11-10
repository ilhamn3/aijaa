import { describe, it, expect } from "vitest";
import {
  convertTextToTipTap,
  convertMarkdownToTipTap,
  convertUploadedFileToTipTap,
  getFileExtension,
  getCleanTitle,
} from "./convertFile";

describe("File Upload Conversion (convertFile)", () => {
  describe("Plain text conversion", () => {
    it("wraps lines into TipTap paragraph nodes", () => {
      const text = "Hello world\nThis is paragraph two.";
      const json = convertTextToTipTap(text);

      expect(json.type).toBe("doc");
      expect(json.content).toHaveLength(2);
      expect(json.content![0]).toEqual({
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      });
      expect(json.content![1]).toEqual({
        type: "paragraph",
        content: [{ type: "text", text: "This is paragraph two." }],
      });
    });

    it("handles empty plain text gracefully", () => {
      const json = convertTextToTipTap("");
      expect(json.type).toBe("doc");
      expect(json.content).toEqual([]);
    });
  });

  describe("Markdown conversion", () => {
    it("converts markdown headings and formatting into TipTap nodes", async () => {
      const md = "# Title\n\n**Bold text** and *italic text*\n\n- Item 1\n- Item 2";
      const json = await convertMarkdownToTipTap(md);

      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();

      // Heading 1
      const heading = json.content!.find((n: any) => n.type === "heading");
      expect(heading).toBeDefined();
      expect(heading?.attrs?.level).toBe(1);

      // Bullet list
      const bulletList = json.content!.find((n: any) => n.type === "bulletList");
      expect(bulletList).toBeDefined();
    });
  });

  describe("convertUploadedFileToTipTap dispatcher", () => {
    it("converts .txt file buffer with clean title", async () => {
      const buffer = Buffer.from("First line\nSecond line");
      const res = await convertUploadedFileToTipTap("notes.txt", buffer);

      expect(res.title).toBe("notes");
      expect(res.content.type).toBe("doc");
      expect(res.content.content).toHaveLength(2);
    });

    it("converts .md file buffer with clean title", async () => {
      const buffer = Buffer.from("## Subtitle\n\nContent here");
      const res = await convertUploadedFileToTipTap("project-spec.md", buffer);

      expect(res.title).toBe("project-spec");
      expect(res.content.type).toBe("doc");
      const h2 = res.content.content!.find(
        (n: any) => n.type === "heading" && n.attrs?.level === 2
      );
      expect(h2).toBeDefined();
    });

    it("rejects unsupported file extensions with clear error message", async () => {
      const buffer = Buffer.from("fake data");
      await expect(
        convertUploadedFileToTipTap("archive.zip", buffer)
      ).rejects.toThrow('Unsupported file type ".zip"');

      await expect(
        convertUploadedFileToTipTap("image.png", buffer)
      ).rejects.toThrow('Unsupported file type ".png"');
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
