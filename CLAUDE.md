# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PlayCastr** — ストリーマー向けの穴場ゲーム発見ダッシュボード。視聴者が多いのに配信ライバルが少ない「ブルーオーシャン」なゲームを可視化する。コアメトリクスは *穴場スコア* = `viewer_count / channel_count`。

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Lucide React
- **Backend**: Next.js API Route Handlers
- **Database**: Neon (PostgreSQL) + Drizzle ORM
- **External APIs**: Twitch Helix API (App Access Token — ユーザーログイン不要)
- **Cron**: GitHub Actions (`*/30 * * * *`)
- **Hosting**: Vercel Hobby (開発/初期) → Railway (商用スケール時)

## Common Commands

```bash
npm run dev          # 開発サーバー
npm run build        # プロダクションビルド
npm run lint         # ESLint
npm run db:generate  # Drizzle マイグレーションファイルを生成
npm run db:migrate   # DB にマイグレーションを適用
npm run db:studio    # Drizzle Studio (DB GUI)
```

## Environment Variables

`.env.local` に以下を設定:

```
DATABASE_URL=        # Neon の接続文字列
TWITCH_CLIENT_ID=    # dev.twitch.tv で取得
TWITCH_CLIENT_SECRET=
CRON_SECRET=         # GitHub Actions から cron を叩くときの認証トークン（任意文字列）
```

GitHub Actions の Secrets にも `APP_URL` と `CRON_SECRET` を設定する。

## Architecture

### Data flow

```
GitHub Actions (*/30 min)
  → GET /api/cron/sync  (Header: x-cron-secret)
    → Twitch Helix API: /games/top + /streams (viewer_count, channel_count per game)
    → score = viewer_count / channel_count  (channel_count=0 のとき score=0)
    → Neon DB: games テーブルに upsert

Client
  → GET /api/games?sort=score&q=<keyword>
    → Neon DB から最大 200 件を返す
  → ゲームカードをクリック → モーダルで詳細表示
```

フロントエンドは外部 API を**直接叩かない**。常に DB 経由。

### Key files

- `db/schema.ts` — Drizzle スキーマ (`games` テーブル)
- `db/index.ts` — Neon クライアント + drizzle インスタンス
- `lib/twitch.ts` — App Access Token 取得 + トップゲームデータ取得
- `app/api/games/route.ts` — ゲーム一覧 API (sort / keyword 検索)
- `app/api/cron/sync/route.ts` — Twitch → DB 同期エンドポイント
- `components/Dashboard.tsx` — メインダッシュボード (Client Component)
- `components/GameCard.tsx` — ゲームカード
- `components/GameModal.tsx` — 詳細モーダル
- `.github/workflows/sync.yml` — Cron ワークフロー

### Cron security

`/api/cron/sync` は `x-cron-secret` ヘッダーで認証。`CRON_SECRET` 環境変数と一致しない場合は 401 を返す。

## Design System

ダークモード固定 (`#0f0f1a` ベース)。アクセントカラーは purple (`text-purple-400`) と cyan (`text-cyan-400`)。フォントは Geist Sans。
