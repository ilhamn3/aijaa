"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export default function NewDocumentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });

      const data = await res.json();
      if (res.ok && data.document?.id) {
        router.push(`/documents/${data.document.id}`);
      } else {
        alert(data.error || "Failed to create document");
        setLoading(false);
      }
    } catch (err) {
      console.error("Create document error:", err);
      alert("Network error while creating document");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating...</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New document</span>
        </>
      )}
    </button>
  );
}

