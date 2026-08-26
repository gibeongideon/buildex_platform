"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  formatFileSize,
} from "@/lib/schemas/document";

/*
  Document upload.

  Nothing is transmitted in the mockup — the file's name, size and type are
  recorded and the bytes are discarded. That is enough to drive every screen
  that follows (completeness, review, expiry) without holding megabytes of
  scanned certificates in localStorage.

  The dropzone is a real <button> wrapping a hidden <input type="file">, so it
  is reachable and operable from the keyboard rather than being a div that only
  responds to drag events.
*/

export type PickedFile = {
  name: string;
  size: number;
  type: (typeof ACCEPTED_MIME_TYPES)[number];
};

function validate(file: File): { ok: true; value: PickedFile } | { ok: false; error: string } {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as PickedFile["type"])) {
    return { ok: false, error: "Upload a PDF, JPG or PNG file." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      error: `That file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_DOCUMENT_BYTES)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }
  return {
    ok: true,
    value: { name: file.name, size: file.size, type: file.type as PickedFile["type"] },
  };
}

export function FileDropzone({
  onFile,
  label,
  compact = false,
  disabled = false,
}: {
  onFile: (file: PickedFile) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function accept(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const result = validate(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onFile(result.value);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files);
          // Reset so re-picking the same file still fires a change event.
          event.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) accept(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-center transition-colors",
          compact ? "px-4 py-4" : "px-6 py-8",
          dragging
            ? "border-brand bg-brand-soft"
            : "border-border-strong bg-surface-muted hover:border-subtle-foreground",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload
          className={cn("size-5", dragging ? "text-brand" : "text-subtle-foreground")}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          Drag and drop, or click to browse — PDF, JPG or PNG up to{" "}
          {formatFileSize(MAX_DOCUMENT_BYTES)}
        </span>
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
