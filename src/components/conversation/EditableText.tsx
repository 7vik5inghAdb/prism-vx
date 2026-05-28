"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function EditableText({
  value,
  onSave,
  multiline = false,
  className = "",
  placeholder,
  textClassName = "",
  rows = 2,
  inline = false,
}: {
  value: string;
  onSave: (newValue: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  textClassName?: string;
  rows?: number;
  inline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("setSelectionRange" in inputRef.current) {
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
      }
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleSave() {
    if (draft.trim() && draft !== value) {
      onSave(draft.trim());
    }
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    const Component = multiline ? "textarea" : "input";
    return (
      <div className={cn("relative", className)}>
        <Component
          // The `Component` union (textarea | input) makes a generic ref
          // imprecise — TypeScript can't narrow which element type the ref
          // will receive at runtime. The intersection cast is narrower than
          // the old `as never` and accurately conveys "this ref will hold
          // whichever element React mounts."
          ref={
            inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (!multiline && e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") handleCancel();
            if (multiline && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave();
            }
          }}
          onBlur={handleSave}
          placeholder={placeholder}
          rows={multiline ? rows : undefined}
          className={cn(
            "w-full px-2.5 py-1.5 text-sm border border-magenta/60 rounded-md resize-none neu-inset focus:outline-none",
            textClassName
          )}
        />
        <div className="flex gap-1 mt-1.5">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="text-[10px] text-white neu-button-primary px-2 py-0.5 rounded flex items-center gap-1"
          >
            <Check className="w-2.5 h-2.5" /> Save
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            className="text-[10px] text-ink-low hover:text-ink-mid px-2 py-0.5 flex items-center gap-1"
          >
            <X className="w-2.5 h-2.5" /> Cancel
          </button>
          {multiline && (
            <span className="text-[10px] text-ink-dim ml-auto self-center">
              ⌘ + Enter to save
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative cursor-text rounded-md hover:bg-bg-elevated/50 hover:shadow-neu-inset transition-all px-2.5 py-1.5 -mx-2.5",
        inline && "inline-block",
        className
      )}
      onClick={() => setEditing(true)}
    >
      <span
        className={cn(
          "text-sm text-ink-high leading-relaxed whitespace-pre-wrap break-words",
          textClassName,
          !value && "text-ink-dim italic"
        )}
      >
        {value || placeholder || "Click to edit..."}
      </span>
      <Pencil className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 top-1.5 w-3 h-3 text-magenta" />
    </div>
  );
}
