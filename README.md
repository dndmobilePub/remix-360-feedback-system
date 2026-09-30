# 360도 피드백 시스템

프론트는 React, TypeScript, Vite를 사용하였고,
프론트 배포는 Vercel,
백엔드는 Supabase로 처리하였습니다.

## 설치 및 실행

### 1. 패키지 설치

Node.js와 npm을 설치한 뒤 프로젝트 루트에서 실행합니다.

```bash
npm install
```

### 2. 백엔드 DB 연결 (최초 1회만 실행)

1. Supabase 에 회사 Github 계정(dndm.git01@gmail.com)을 사용하여 로그인합니다.
2. 대시보드의 **SQL Editor**에서 다음 파일을 순서대로 실행합니다.
   - `supabase/schema.sql`
   - `supabase/migration_feedback_v2.sql`
3. 프로젝트 루트에 `.env.local` 파일을 만들고 프로젝트 URL과 anon 키를 입력합니다.

프로젝트 URL과 anon 키는 Supabase 대시보드의 **Project Settings > API**에서 확인할 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

터미널에 표시된 주소를 브라우저에서 엽니다. 기본 주소는 `http://localhost:5173`입니다.

※ 깃에 커밋을 올리기 위해서는 터미널에 사용할 이름과 사용할 이메일을 최초 1회 설정해야 합니다. 아래 명령어를 참고하여 등록해주세요.

```bash
git config user.name 사용할 이름
git config user.email 사용할 이메일
```

## 관리자 계정

1. `schema.sql` 를 실행했다면 관리자 아이디 `admin2286`, 초기 비밀번호 `0000`으로 로그인할 수 있습니다. 로그인 후 비밀번호를 변경하세요.
