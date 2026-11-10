"use client";

import { useState } from "react";
import {
  Users,
  X,
  UserPlus,
  Trash2,
  Loader2,
  ShieldAlert,
  Check,
  Crown,
} from "lucide-react";

interface ShareUser {
  id: string;
  name: string;
  email: string;
}

interface ShareItem {
  id: string;
  userId: string;
  permission: "VIEW" | "EDIT";
  user: ShareUser;
}

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  owner: ShareUser;
  isOwner: boolean;
}

const SEEDED_CANDIDATES = [
  { email: "alice@example.com", name: "Alice Walker" },
  { email: "bob@example.com", name: "Bob Smith" },
  { email: "carol@example.com", name: "Carol Davis" },
];

export default function ShareDialog({
  documentId,
  documentTitle,
  owner,
  isOwner,
}: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Form state
  const [targetEmail, setTargetEmail] = useState("");
  const [permission, setPermission] = useState<"EDIT" | "VIEW">("EDIT");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchShares = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`);
      const data = await res.json();
      if (res.ok) {
        setShares(data.shares || []);
      }
    } catch {
      console.error("Failed to fetch shares");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setSuccess(null);
    fetchShares();
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;

    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          permission,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to share document");
        setSharing(false);
        return;
      }

      setSuccess(
        `Access granted to ${targetEmail} (${permission === "EDIT" ? "Can edit" : "View only"})`
      );
      setTargetEmail("");
      fetchShares();
    } catch {
      setError("Network error while sharing");
    } finally {
      setSharing(false);
    }
  };

  const handlePermissionChange = async (shareId: string, newPermission: "EDIT" | "VIEW") => {
    setUpdatingShareId(shareId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update permission");
      } else {
        setSuccess("Permission updated successfully");
        setShares((prev) =>
          prev.map((s) => (s.id === shareId ? { ...s, permission: newPermission } : s))
        );
      }
    } catch {
      setError("Network error while updating permission");
    } finally {
      setUpdatingShareId(null);
    }
  };

  const handleRevoke = async (shareId: string, userName: string) => {
    if (!confirm(`Revoke access for ${userName}?`)) return;

    setRevokingId(shareId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/documents/${documentId}/shares/${shareId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to revoke share");
      } else {
        setSuccess(`Revoked access for ${userName}`);
        setShares((prev) => prev.filter((s) => s.id !== shareId));
      }
    } catch {
      setError("Network error while revoking share");
    } finally {
      setRevokingId(null);
    }
  };

  // Only show Share button for owners
  if (!isOwner) {
    return null;
  }

  // Filter candidates to exclude owner
  const availableCandidates = SEEDED_CANDIDATES.filter(
    (c) => c.email.toLowerCase() !== owner.email.toLowerCase()
  );

  return (
    <>
      {/* Trigger Button (Owner Only) */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        title="Share document settings"
      >
        <Users className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Share &ldquo;{documentTitle}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage collaborators and access permissions
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Notifications */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Share Form */}
              <form onSubmit={handleShare} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Add collaborator by email
                </label>

                {/* Seeded shortcut suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[11px] text-slate-400 self-center mr-1">
                    Quick suggestions:
                  </span>
                  {availableCandidates.map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onClick={() => setTargetEmail(c.email)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        targetEmail === c.email
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                          : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                      }`}
                    >
                      {c.name.split(" ")[0]} ({c.email})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as "EDIT" | "VIEW")}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2.5 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="EDIT">Can edit</option>
                    <option value="VIEW">View only</option>
                  </select>

                  <button
                    type="submit"
                    disabled={sharing || !targetEmail.trim()}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {sharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Share</span>
                  </button>
                </div>
              </form>

              {/* People with Access Section */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Who has access
                </h4>

                <div className="space-y-2 border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {/* Document Owner */}
                  <div className="p-3 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {owner.name.charAt(0)}
                      </div>
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold text-slate-800 truncate">
                          {owner.name} (You)
                        </p>
                        <p className="text-slate-400 truncate">{owner.email}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      <Crown className="w-3 h-3 text-blue-600" />
                      <span>Owner</span>
                    </span>
                  </div>

                  {/* Active Collaborators */}
                  {loading ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading collaborators...</span>
                    </div>
                  ) : shares.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No other collaborators have been added yet.
                    </div>
                  ) : (
                    shares.map((share) => (
                      <div
                        key={share.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {share.user.name.charAt(0)}
                          </div>
                          <div className="min-w-0 text-xs">
                            <p className="font-semibold text-slate-800 truncate">
                              {share.user.name}
                            </p>
                            <p className="text-slate-400 truncate">
                              {share.user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Change Permission Dropdown */}
                          <select
                            value={share.permission}
                            disabled={updatingShareId === share.id}
                            onChange={(e) =>
                              handlePermissionChange(
                                share.id,
                                e.target.value as "EDIT" | "VIEW"
                              )
                            }
                            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="EDIT">Can edit</option>
                            <option value="VIEW">View only</option>
                          </select>

                          {/* Revoke Button */}
                          <button
                            onClick={() =>
                              handleRevoke(share.id, share.user.name)
                            }
                            disabled={revokingId === share.id}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Revoke access"
                          >
                            {revokingId === share.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
