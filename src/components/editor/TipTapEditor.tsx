"use client";

import { useEditor, EditorContent, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import EditorToolbar from "./EditorToolbar";
import { useEffect } from "react";

interface TipTapEditorProps {
  content: JSONContent;
  editable?: boolean;
  onChange?: (json: JSONContent) => void;
}

export default function TipTapEditor({
  content,
  editable = true,
  onChange,
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[650px] text-slate-800 text-[15px] leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
  });

  // Keep editor editable state in sync if prop changes
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="flex flex-col flex-1 bg-slate-100 overflow-y-auto">
      {/* Editor Formatting Toolbar */}
      {editable && <EditorToolbar editor={editor} />}

      {/* Google Docs-inspired Canvas Container */}
      <div className="flex-1 py-8 px-4 sm:px-8 flex justify-center">
        <div className="w-full max-w-4xl bg-white min-h-[850px] shadow-sm border border-slate-200/80 rounded-sm p-8 sm:p-14">
          <EditorContent editor={editor} className="tiptap-doc-editor" />
        </div>
      </div>
    </div>
  );
}
