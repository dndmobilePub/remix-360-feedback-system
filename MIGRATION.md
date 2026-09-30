# remix-360-supabase 적용 방법

1. 이 폴더의 `src/`, `index.html`, `vite.config.ts`, `vercel.json` 을 프로젝트 루트에 덮어쓰기
2. 불필요 파일 삭제: `src/App.css`, `src/assets/*`
3. 패키지 설치
   npm i react-router-dom react-icons
   npm i -D tailwindcss @tailwindcss/vite
4. 로고 복사: 기존 프로젝트의 `public/image/dnd_logo.png` -> `public/image/dnd_logo.png`
5. `npm run dev`

테스트 계정: 김철수 / KC1234, 오동훈 / DND2025(최초 로그인 코드 변경 화면), 관리자 비밀번호 0000

Supabase 연동 지점: `src/App.tsx` 의 `TODO(supabase)` 상태/핸들러, `src/data/mock.ts`
