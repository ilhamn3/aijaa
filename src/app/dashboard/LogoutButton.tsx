"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
      title="Sign out"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{loading ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}

