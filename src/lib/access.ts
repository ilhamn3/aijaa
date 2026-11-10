export type DocumentRole = "owner" | "edit" | "view" | null;

export interface ShareRecord {
  userId: string;
  permission: "VIEW" | "EDIT" | string;
}

export interface DocumentRecord {
  ownerId: string;
}

/**
 * Pure access logic function.
 * Evaluates the role of a user for a given document and its active shares.
 * 
 * Returns:
 * - "owner": User owns the document
 * - "edit": User has an active share with EDIT permission
 * - "view": User has an active share with VIEW permission
 * - null: User has no access (or was revoked / not found)
 */
export function getDocumentRole(
  userId: string | null | undefined,
  doc: DocumentRecord | null | undefined,
  shares: ShareRecord[] | null | undefined = []
): DocumentRole {
  if (!userId || !doc) {
    return null;
  }

  if (doc.ownerId === userId) {
    return "owner";
  }

  if (!shares || !Array.isArray(shares)) {
    return null;
  }

  const userShare = shares.find((share) => share.userId === userId);
  if (!userShare) {
    return null;
  }

  if (userShare.permission === "EDIT") {
    return "edit";
  }

  if (userShare.permission === "VIEW") {
    return "view";
  }

  return null;
}

/**
 * Pure authorization check for write/save permissions.
 * Only owner and editors with active EDIT shares can modify document content/title.
 */
export function canEditDocument(role: DocumentRole): boolean {
  return role === "owner" || role === "edit";
}

/**
 * Pure authorization check for deletion.
 * Only the document owner can delete a document.
 */
export function canDeleteDocument(role: DocumentRole): boolean {
  return role === "owner";
}

/**
 * Pure authorization check for sharing management.
 * Only the document owner can invite collaborators, modify permissions, or revoke shares.
 */
export function canManageShares(role: DocumentRole): boolean {
  return role === "owner";
}
