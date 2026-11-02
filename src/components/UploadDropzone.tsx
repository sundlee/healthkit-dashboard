"use client";

import { useRef, useState } from "react";
import { parseExport, ParseError } from "@/lib/parse";
import type { Dataset } from "@/lib/types";

export default function UploadDropzone({
  onLoaded,
  compact = false,
}: {
  onLoaded: (d: Dataset) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const json = JSON.parse(await file.text());
      onLoaded(parseExport(json, file.name));
    } catch (e) {
      setError(
        e instanceof ParseError
          ? e.message
          : e instanceof SyntaxError
            ? "JSON 파일을 읽을 수 없습니다."
            : "파일을 처리하는 중 오류가 발생했습니다.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      className="sr-only"
      data-testid="file-input"
      onChange={(e) => handle(e.target.files?.[0])}
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-wash"
        >
          {busy ? "불러오는 중…" : "새 파일 불러오기"}
        </button>
        {error && <span className="text-sm text-bad">{error}</span>}
      </>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          over ? "border-accent bg-wash" : "border-line bg-surface hover:bg-wash"
        }`}
      >
        {input}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent" aria-hidden>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-base font-medium text-ink">
          {busy ? "불러오는 중…" : "HealthExport JSON 파일을 끌어다 놓거나 클릭해서 선택하세요"}
        </div>
        <div className="text-sm text-ink-2">
          파일은 브라우저 안에서만 처리되고 이 기기(IndexedDB)에만 저장됩니다.
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
