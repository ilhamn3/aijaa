import { describe, it, expect } from "vitest";
import {
  getDocumentRole,
  canEditDocument,
  canDeleteDocument,
  canManageShares,
} from "./access";

describe("Sharing & Access Authorization Rules", () => {
  const ownerId = "usr_alice";
  const doc = { id: "doc_1", ownerId };

  describe("Owner-only Share Management (canManageShares)", () => {
    it("allows document owner to manage shares", () => {
      expect(canManageShares("owner")).toBe(true);
    });

    it("forbids shared editor from managing shares (must return 403)", () => {
      expect(canManageShares("edit")).toBe(false);
    });

    it("forbids shared viewer from managing shares (must return 403)", () => {
      expect(canManageShares("view")).toBe(false);
    });

    it("forbids unauthenticated / stranger from managing shares", () => {
      expect(canManageShares(null)).toBe(false);
    });
  });

  describe("Share Permission Transitions", () => {
    it("immediately transitions role from 'view' to 'edit' when permission is updated", () => {
      const sharesBefore = [{ userId: "usr_carol", permission: "VIEW" }];
      expect(getDocumentRole("usr_carol", doc, sharesBefore)).toBe("view");
      expect(canEditDocument(getDocumentRole("usr_carol", doc, sharesBefore))).toBe(false);

      // Permission changed to EDIT
      const sharesAfter = [{ userId: "usr_carol", permission: "EDIT" }];
      expect(getDocumentRole("usr_carol", doc, sharesAfter)).toBe("edit");
      expect(canEditDocument(getDocumentRole("usr_carol", doc, sharesAfter))).toBe(true);
    });

    it("immediately transitions role from 'edit' to 'view' when permission is downgraded", () => {
      const sharesBefore = [{ userId: "usr_bob", permission: "EDIT" }];
      expect(getDocumentRole("usr_bob", doc, sharesBefore)).toBe("edit");
      expect(canEditDocument(getDocumentRole("usr_bob", doc, sharesBefore))).toBe(true);

      // Permission downgraded to VIEW
      const sharesAfter = [{ userId: "usr_bob", permission: "VIEW" }];
      expect(getDocumentRole("usr_bob", doc, sharesAfter)).toBe("view");
      expect(canEditDocument(getDocumentRole("usr_bob", doc, sharesAfter))).toBe(false);
    });
  });

  describe("Immediate Revocation Effect", () => {
    it("drops access immediately when share is revoked", () => {
      const activeShares = [
        { userId: "usr_bob", permission: "EDIT" },
        { userId: "usr_carol", permission: "VIEW" },
      ];

      // Initially Bob has edit access
      expect(getDocumentRole("usr_bob", doc, activeShares)).toBe("edit");

      // Bob's share is revoked (deleted from shares array)
      const sharesAfterRevoke = activeShares.filter((s) => s.userId !== "usr_bob");

      // Next request evaluates to null -> API returns 404/403
      const roleAfterRevoke = getDocumentRole("usr_bob", doc, sharesAfterRevoke);
      expect(roleAfterRevoke).toBeNull();
      expect(canEditDocument(roleAfterRevoke)).toBe(false);
    });
  });

  describe("Self-Sharing & Owner Invariants", () => {
    it("owner role always takes precedence even if redundant share exists", () => {
      const redundantShares = [{ userId: ownerId, permission: "VIEW" }];
      expect(getDocumentRole(ownerId, doc, redundantShares)).toBe("owner");
      expect(canManageShares(getDocumentRole(ownerId, doc, redundantShares))).toBe(true);
      expect(canDeleteDocument(getDocumentRole(ownerId, doc, redundantShares))).toBe(true);
    });

    it("detects self-sharing validation rule", () => {
      const isSelfSharing = (targetUserId: string, documentOwnerId: string) =>
        targetUserId === documentOwnerId;

      expect(isSelfSharing(ownerId, doc.ownerId)).toBe(true);
      expect(isSelfSharing("usr_bob", doc.ownerId)).toBe(false);
    });
  });
});
