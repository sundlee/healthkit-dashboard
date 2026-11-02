"use client";

import { useEffect, useState } from "react";
import { clearDataset, loadDataset, saveDataset } from "@/lib/storage";
import type { Dataset } from "@/lib/types";
import Dashboard from "./Dashboard";
import UploadDropzone from "./UploadDropzone";

export default function App() {
  const [data, setData] = useState<Dataset | null | undefined>(undefined);

  useEffect(() => {
    loadDataset()
      .then((d) => setData(d ?? null))
      .catch(() => setData(null));
  }, []);

  const onLoaded = (d: Dataset) => {
    setData(d);
    saveDataset(d).catch(() => {
      /* storage unavailable (private mode) — keep in memory only */
    });
  };

  const onClear = () => {
    setData(null);
    clearDataset().catch(() => {});
  };

  if (data === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-3">불러오는 중…</div>;
  }

  if (data === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink">헬스 대시보드</h1>
          <p className="mt-2 text-sm text-ink-2">
            iOS 건강 앱에서 내보낸 JSON으로 걸음 수 · 거리 · 걷기 심박수를 연도별/월별/일별로 살펴봅니다.
          </p>
        </div>
        <UploadDropzone onLoaded={onLoaded} />
      </main>
    );
  }

  return <Dashboard data={data} onLoaded={onLoaded} onClear={onClear} />;
}
