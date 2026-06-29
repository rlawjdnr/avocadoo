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
VITE_SUPABASE_COUPLE_SPACE_ID=11111111-1111-4111-8111-111111111111
VITE_SUPABASE_CURRENT_MEMBER_ID=22222222-2222-4222-8222-222222222221
VITE_SUPABASE_CURRENT_MEMBER_NICKNAME=정정욱
VITE_SUPABASE_STORAGE_BUCKET=diary-images
```

## Supabase

Supabase 연결 클라이언트는 `src/lib/supabaseClient.js`에 있습니다.

Supabase SQL Editor에서 `supabase/schema.sql`을 실행하면 아래 리소스가 생성됩니다.

- `couple_spaces`, `couple_members`, `diary_entries`, `diary_images`, `diary_comments`
- 멤버별 반응 테이블: `diary_entry_likes`, `diary_comment_likes`
- 공개 Storage bucket: `diary-images`
- 기본 커플 공간과 멤버 2명: `정정욱`, `혜민민`

닉네임 생성 플로우가 아직 없어서 앱의 현재 작성자는 `.env`의 `VITE_SUPABASE_CURRENT_MEMBER_ID`와 `VITE_SUPABASE_CURRENT_MEMBER_NICKNAME`으로 고정합니다. 기본값은 `정정욱`입니다.

같은 `VITE_SUPABASE_COUPLE_SPACE_ID`를 쓰는 두 멤버는 서로가 올린 diary를 함께 봅니다. 두 번째 멤버로 실행하려면 아래 값으로 바꿔 실행하세요.

```bash
VITE_SUPABASE_CURRENT_MEMBER_ID=22222222-2222-4222-8222-222222222222
VITE_SUPABASE_CURRENT_MEMBER_NICKNAME=혜민민
```

## GitHub Pages Deployment

배포는 `.github/workflows/deploy.yml`에서 GitHub Pages Actions로 실행됩니다.

GitHub repository secrets에 아래 값을 등록해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

GitHub 저장소의 Pages 설정에서 source를 `GitHub Actions`로 선택하면 `main` 브랜치 push 시 자동 배포됩니다.

로컬에서 배포 전 검증만 할 때:

```bash
npm run deploy:check
```

검증 후 현재 브랜치를 push해서 배포를 시작할 때:

```bash
npm run deploy
```
