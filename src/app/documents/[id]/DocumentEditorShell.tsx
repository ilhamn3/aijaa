"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { JSONContent } from "@tiptap/react";
import TipTapEditor from "@/components/editor/TipTapEditor";
import ShareDialog from "@/components/sharing/ShareDialog";
import { DocumentRole } from "@/lib/access";
import { tipTapToMarkdown } from "@/lib/exportMarkdown";
import {
  FileText,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  Crown,
  Edit3,
  Save,
  RotateCcw,
  Download,
} from "lucide-react";

interface DocumentData {
  id: string;
  title: string;
  content: JSONContent;
  ownerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

interface DocumentEditorShellProps {
  initialDocument: DocumentData;
  role: DocumentRole;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export default function DocumentEditorShell({
  initialDocument,
  role,
  currentUser,
}: DocumentEditorShellProps) {
  const [title, setTitle] = useState(initialDocument.title);
  const [content, setContent] = useState<JSONContent>(initialDocument.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditable = role === "owner" || role === "edit";
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(JSON.stringify(initialDocument.content));
  const lastSavedTitleRef = useRef<string>(initialDocument.title);

  // Core save routine
  const saveDocument = useCallback(
    async (overrideTitle?: string, overrideContent?: JSONContent) => {
      if (!isEditable) return;

      const titleToSend = overrideTitle !== undefined ? overrideTitle : title;
      const contentToSend = overrideContent !== undefined ? overrideContent : content;

      const currentContentStr = JSON.stringify(contentToSend);
      if (
        titleToSend === lastSavedTitleRef.current &&
        currentContentStr === lastSavedContentRef.current
      ) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");
      setErrorMessage(null);

      try {
        const payload: { title?: string; content?: JSONContent } = {};
        if (titleToSend !== lastSavedTitleRef.current) {
          payload.title = titleToSend;
        }
        if (currentContentStr !== lastSavedContentRef.current) {
          payload.content = contentToSend;
        }

        const res = await fetch(`/api/documents/${initialDocument.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setSaveStatus("error");
          setErrorMessage(data.error || "Failed to save changes");
          return;
        }

        lastSavedTitleRef.current = titleToSend;
        lastSavedContentRef.current = currentContentStr;
        setSaveStatus("saved");
      } catch (err) {
        console.error("Save error:", err);
        setSaveStatus("error");
        setErrorMessage("Network error: Could not reach the server");
      }
    },
    [initialDocument.id, isEditable, title, content]
  );

  // Content change handler with ~1.5s debounced autosave
  const handleContentChange = (newContent: JSONContent) => {
    setContent(newContent);
    if (!isEditable) return;

    setSaveStatus("unsaved");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveDocument(undefined, newContent);
    }, 1500); // 1.5 second debounced autosave
  };

  // Inline title rename handler (limits to 120 chars, falls back to "Untitled")
  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle("Untitled");
      saveDocument("Untitled", undefined);
      return;
    }
    if (trimmed !== lastSavedTitleRef.current) {
      saveDocument(trimmed, undefined);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleExportMarkdown = () => {
    const markdown = tipTapToMarkdown(content);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.trim() || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Manual save shortcut (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isEditable) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          saveDocument();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditable, saveDocument]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Top Google Docs-like App Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0">
            {/* Inline Title Input (max 120 chars) */}
            <input
              type="text"
              value={title}
              disabled={!isEditable}
              maxLength={120}
              aria-label="Document Title"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className={`font-semibold text-slate-800 text-sm sm:text-base px-1.5 py-0.5 rounded -ml-1 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors truncate max-w-xs sm:max-w-md ${
                !isEditable ? "cursor-default hover:border-transparent" : ""
              }`}
              placeholder="Untitled"
            />

            {/* Sub-bar: Save Status Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 px-0.5 mt-0.5">
              {role === "view" ? (
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View only</span>
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {saveStatus === "saved" && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Saved</span>
                    </span>
                  )}
                  {saveStatus === "saving" && (
                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  )}
                  {saveStatus === "unsaved" && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Unsaved changes</span>
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Save failed</span>
                      <button
                        onClick={() => saveDocument()}
                        className="underline text-red-700 hover:text-red-900 ml-1 font-bold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    </span>
                  )}
                </div>
              )}

              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-400">
                Owner: {initialDocument.owner.name}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Role Status Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border">
            {role === "owner" && (
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border-blue-200">
                <Crown className="w-3.5 h-3.5 text-blue-600" />
                <span>Owner</span>
              </span>
            )}
            {role === "edit" && (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Can edit</span>
              </span>
            )}
            {role === "view" && (
              <span className="flex items-center gap-1 text-slate-700 bg-slate-100 border-slate-200">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Read-only</span>
              </span>
            )}
          </div>

          {/* Manual Save Button */}
          {isEditable && (
            <button
              onClick={() => saveDocument()}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Manual save (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* Export to Markdown Button */}
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Export as Markdown (.md)"
            aria-label="Export document as Markdown"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Export .md</span>
          </button>

          {/* Share Dialog Trigger */}
          <ShareDialog
            documentId={initialDocument.id}
            documentTitle={title}
            owner={initialDocument.owner}
            isOwner={role === "owner"}
          />

          {/* Current User Badge */}
          <div
            className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200 shrink-0"
            title={`Signed in as ${currentUser.name} (${currentUser.email})`}
          >
            {currentUser.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Save Error Alert Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}. Your unsaved changes are kept locally in the editor.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveDocument()}
              className="font-bold underline hover:text-red-900 cursor-pointer"
            >
              Retry Save
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* View-Only Mode Banner */}
      {role === "view" && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>View-only mode:</strong> You do not have permission to edit this document. Contact <strong>{initialDocument.owner.name}</strong> to request edit access.
            </span>
          </div>
        </div>
      )}

      {/* TipTap Rich Text Editor */}
      <TipTapEditor
        content={content}
        editable={isEditable}
        onChange={handleContentChange}
      />
    </div>
  );
}
