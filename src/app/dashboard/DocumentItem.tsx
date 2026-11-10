"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Trash2,
  Loader2,
  Clock,
  Crown,
  Edit3,
  Eye,
} from "lucide-react";

interface DocumentItemProps {
  id: string;
  title: string;
  updatedAt: string | Date;
  role: "owner" | "edit" | "view";
  ownerName?: string;
  isOwner: boolean;
}

export default function DocumentItem({
  id,
  title,
  updatedAt,
  role,
  ownerName,
  isOwner,
}: DocumentItemProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const formattedDate = new Date(updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete document");
        setDeleting(false);
      }
    } catch {
      alert("Failed to delete document");
      setDeleting(false);
    }
  };

  return (
    <Link
      href={`/documents/${id}`}
      className="group block bg-white border border-slate-200/90 hover:border-blue-400 rounded-xl p-4 shadow-2xs hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate">
              {title || "Untitled Document"}
            </h3>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formattedDate}</span>
              </span>

              {ownerName && !isOwner && (
                <>
                  <span>•</span>
                  <span>Owner: {ownerName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Role badge */}
          {role === "owner" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-md">
              <Crown className="w-3 h-3" />
              <span>Owner</span>
            </span>
          )}
          {role === "edit" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
              <Edit3 className="w-3 h-3" />
              <span>Can edit</span>
            </span>
          )}
          {role === "view" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              <Eye className="w-3 h-3" />
              <span>View only</span>
            </span>
          )}

          {/* Delete button (owner only) */}
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete document"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

