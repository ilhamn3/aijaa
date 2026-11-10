import { describe, it, expect } from "vitest";
import { getDocumentRole } from "./access";

describe("getDocumentRole", () => {
  const ownerId = "user_alice";
  const doc = { ownerId };

  it("returns 'owner' when user is the document owner", () => {
    const role = getDocumentRole(ownerId, doc, []);
    expect(role).toBe("owner");
  });

  it("returns 'owner' even if user is also listed in shares", () => {
    const role = getDocumentRole(ownerId, doc, [
      { userId: ownerId, permission: "VIEW" },
    ]);
    expect(role).toBe("owner");
  });

  it("returns 'edit' when user has an EDIT share", () => {
    const role = getDocumentRole("user_bob", doc, [
      { userId: "user_bob", permission: "EDIT" },
      { userId: "user_carol", permission: "VIEW" },
    ]);
    expect(role).toBe("edit");
  });

  it("returns 'view' when user has a VIEW share", () => {
    const role = getDocumentRole("user_carol", doc, [
      { userId: "user_bob", permission: "EDIT" },
      { userId: "user_carol", permission: "VIEW" },
    ]);
    expect(role).toBe("view");
  });

  it("returns null when user has no access (not owner, not in shares)", () => {
    const role = getDocumentRole("user_stranger", doc, [
      { userId: "user_bob", permission: "EDIT" },
    ]);
    expect(role).toBeNull();
  });

  it("returns null when share has been revoked (removed from shares list)", () => {
    // When a share is revoked, it is deleted from the database
    const sharesBeforeRevocation = [
      { userId: "user_bob", permission: "EDIT" },
      { userId: "user_carol", permission: "VIEW" },
    ];
    // Bob's share revoked:
    const sharesAfterRevocation = sharesBeforeRevocation.filter(
      (s) => s.userId !== "user_bob"
    );

    const role = getDocumentRole("user_bob", doc, sharesAfterRevocation);
    expect(role).toBeNull();
  });

  it("handles null/undefined inputs safely without throwing", () => {
    expect(getDocumentRole(null, doc, [])).toBeNull();
    expect(getDocumentRole(undefined, doc, [])).toBeNull();
    expect(getDocumentRole("user_bob", null, [])).toBeNull();
    expect(getDocumentRole("user_bob", doc, null)).toBeNull();
    expect(getDocumentRole("user_bob", doc, undefined)).toBeNull();
  });
});

