import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "헬스 대시보드",
  description: "iOS HealthKit 내보내기(JSON)로 걸음 수·거리·심박을 연도별/월별/일별로 보는 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
