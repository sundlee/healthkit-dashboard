# 헬스 대시보드

iOS HealthKit 내보내기 JSON(`HealthExport_*.json`)을 브라우저에서 불러와 걸음 수 · 걷기+달리기 거리 · 걷기 평균 심박수를 연도별/월별/일별로 보여주는 Next.js 앱입니다. 파일은 서버로 전송되지 않고 브라우저 IndexedDB에만 저장됩니다.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 파싱·집계 단위 테스트
```

- `src/lib/` — 파싱(`parse.ts`), 집계(`aggregate.ts`), 통계(`stats.ts`)
- `src/components/` — 대시보드와 차트 (Recharts + SVG 히트맵)

참고: 내보낸 거리 값은 단위가 `km`로 표기되어 있지만 실제로는 미터 값이라, 일 중앙값이 100을 넘으면 자동으로 km로 변환합니다.
