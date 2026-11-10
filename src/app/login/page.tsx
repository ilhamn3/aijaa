"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Lock, Mail, Users, ArrowRight } from "lucide-react";

const SEEDED_ACCOUNTS = [
  {
    email: "alice@example.com",
    name: "Alice Walker",
    roleDescription: "Owner of sample doc",
  },
  {
    email: "bob@example.com",
    name: "Bob Smith",
    roleDescription: "Editor on sample doc",
  },
  {
    email: "carol@example.com",
    name: "Carol Davis",
    roleDescription: "Viewer on sample doc",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(SEEDED_ACCOUNTS[0].email);
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccountSelect = (selectedEmail: string) => {
    setEmail(selectedEmail);
    if (selectedEmail) {
      setPassword("password123");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome to Ajaia
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Google Docs-inspired collaborative editor
          </p>
        </div>

        {/* Quick Reviewer Seeded User Selector */}
        <div className="mb-6 p-3.5 bg-blue-50/70 rounded-xl border border-blue-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Select Seeded Reviewer Account:</span>
          </div>
          <select
            className="w-full text-sm bg-white border border-blue-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            value={email}
            onChange={(e) => handleAccountSelect(e.target.value)}
          >
            {SEEDED_ACCOUNTS.map((acc) => (
              <option key={acc.email} value={acc.email}>
                {acc.name} ({acc.email}) — {acc.roleDescription}
              </option>
            ))}
            <option value="">Custom Email...</option>
          </select>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-sm bg-slate-50/60 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-slate-50/60 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

