# Avocadoo

React/Vite 기반 커플 다이어리 앱입니다.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에는 Supabase 프로젝트의 공개 anon key를 넣어야 합니다.

```bash
VITE_SUPABASE_URL=https://mvdilpzoeaslrhmhplyd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase

Supabase 연결 클라이언트는 `src/lib/supabaseClient.js`에 있습니다. 데이터베이스 테이블, RLS, 정책은 추후 기획에 맞춰 추가합니다.

## GitHub Pages Deployment

배포는 `.github/workflows/deploy.yml`에서 GitHub Pages Actions로 실행됩니다.

GitHub repository secrets에 아래 값을 등록해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

GitHub 저장소의 Pages 설정에서 source를 `GitHub Actions`로 선택하면 `main` 브랜치 push 시 자동 배포됩니다.
