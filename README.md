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
VITE_WEB_PUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
```

## Supabase

Supabase 연결 클라이언트는 `src/lib/supabaseClient.js`에 있습니다.

Supabase SQL Editor에서 `supabase/schema.sql`을 실행하면 아래 리소스가 생성됩니다.

- `couple_spaces`, `couple_members`, `diary_entries`, `diary_images`, `diary_comments`
- 멤버별 반응 테이블: `diary_entry_likes`, `diary_comment_likes`
- 공개 Storage bucket: `diary-images`
- 기본 커플 공간과 멤버 2명: `정정욱`, `혜민민`
- 웹 푸시 구독 테이블: `push_subscriptions`

앱 상단의 닉네임 선택에서 현재 작성자를 고릅니다. 선택한 닉네임은 브라우저에 저장되며, 일기와 댓글 저장 시 해당 멤버의 `author_id`로 기록됩니다.

같은 `VITE_SUPABASE_COUPLE_SPACE_ID`를 쓰는 두 멤버는 서로가 올린 diary를 함께 봅니다. `.env`의 `VITE_SUPABASE_CURRENT_MEMBER_ID`와 `VITE_SUPABASE_CURRENT_MEMBER_NICKNAME`은 저장된 닉네임이 없을 때 사용할 기본 선택값입니다.

## Web Push

브라우저 웹 푸시는 Supabase Edge Function `send-web-push`에서 발송합니다.

1. VAPID 키를 생성합니다.

```bash
npm run vapid
```

2. 프론트엔드 `.env`에 `VITE_WEB_PUSH_VAPID_PUBLIC_KEY`를 넣습니다.
3. Supabase Edge Function secret에 아래 값을 넣습니다.

```bash
WEB_PUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
WEB_PUSH_VAPID_PRIVATE_KEY=your-vapid-private-key
WEB_PUSH_VAPID_SUBJECT=mailto:you@example.com
PUBLIC_SITE_URL=https://rlawjdnr.github.io/avocadoo/
```

4. `supabase/functions/send-web-push`를 배포합니다.

GitHub Pages 배포에서는 repository secret `VITE_WEB_PUSH_VAPID_PUBLIC_KEY`에도 같은 public key를 넣어야 합니다. 이 값이 `replace-with-vapid-public-key` 같은 placeholder이거나 잘못된 Base64 URL 값이면 앱은 알림 구독을 시도하지 않습니다.

일기를 등록하면 같은 커플 공간의 다른 멤버에게, 좋아요와 댓글은 해당 일기 작성자에게 푸시가 발송됩니다.

## AI Weekly Summaries

홈의 주차별 문구는 Supabase Edge Function `generate-weekly-summaries`가 OpenAI API로 만든 AI 하이라이트 요약을 보여줍니다. 톤은 귀엽지만 오글거리지 않고, 살짝 웃긴 장면이 보이는 한 줄 요약입니다. 요약은 해당 주차가 끝난 뒤에만 생성되며, 한 번 생성되면 `weekly_summaries` 테이블에 저장되어 이후에는 OpenAI를 다시 호출하지 않고 저장된 문구를 보여줍니다.

Supabase Edge Function secret에 아래 값을 넣습니다.

```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.4-mini
```

그 다음 `supabase/functions/generate-weekly-summaries`를 배포합니다. `OPENAI_MODEL`은 생략할 수 있습니다.

## GitHub Pages Deployment

배포는 `.github/workflows/deploy.yml`에서 GitHub Pages Actions로 실행됩니다.

GitHub repository secrets에 아래 값을 등록해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WEB_PUSH_VAPID_PUBLIC_KEY`

GitHub 저장소의 Pages 설정에서 source를 `GitHub Actions`로 선택하면 `main` 브랜치 push 시 자동 배포됩니다.

로컬에서 배포 전 검증만 할 때:

```bash
npm run deploy:check
```

검증 후 현재 브랜치를 push해서 배포를 시작할 때:

```bash
npm run deploy
```
