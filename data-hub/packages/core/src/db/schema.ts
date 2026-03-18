export const DATA_HUB_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['feed:read', 'search:read'],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL CHECK (module IN ('inbox', 'news', 'channels', 'podcasts', 'saved')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_group_id UUID REFERENCES source_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL CHECK (module IN ('inbox', 'news', 'channels', 'podcasts', 'saved')),
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'youtube', 'podcast', 'adapter')),
  source_tier TEXT NOT NULL CHECK (source_tier IN ('breaking', 'verified', 'standard')) DEFAULT 'standard',
  adapter_key TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  site_url TEXT,
  image_url TEXT,
  language TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  polling_minutes INTEGER NOT NULL DEFAULT 15,
  last_polled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'Following',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_text TEXT,
  author_name TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  module TEXT NOT NULL CHECK (module IN ('inbox', 'news', 'channels', 'podcasts', 'saved')),
  item_type TEXT NOT NULL CHECK (item_type IN ('article', 'video', 'podcast', 'update')),
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  site_url TEXT,
  image_url TEXT,
  audio_url TEXT,
  video_url TEXT,
  embed_url TEXT,
  video_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('thumbnail', 'image', 'audio', 'video')),
  remote_url TEXT NOT NULL,
  local_path TEXT,
  mime_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('remote', 'cached', 'failed')) DEFAULT 'remote',
  bytes BIGINT,
  cached_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (item_id, kind, remote_url)
);

CREATE TABLE IF NOT EXISTS item_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  saved_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_seconds DOUBLE PRECISION,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'phrase', 'source', 'tag')),
  pattern TEXT NOT NULL,
  case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  match_reason TEXT NOT NULL,
  cluster_key TEXT NOT NULL,
  cluster_label TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, item_id)
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('ollama', 'openai', 'anthropic', 'custom')),
  base_url TEXT,
  api_key_env TEXT,
  model TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  prompt_style TEXT NOT NULL DEFAULT 'brief',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  summary_text TEXT,
  model TEXT,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE UNIQUE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  last_http_status INTEGER,
  average_latency_ms INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  item_count INTEGER NOT NULL DEFAULT 0,
  new_item_count INTEGER NOT NULL DEFAULT 0,
  cached_media_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_module_active ON sources (module, active);
CREATE INDEX IF NOT EXISTS idx_items_published_at ON items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_source_published ON items (source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body_text, '') || ' ' || coalesce(source_title, '')));
CREATE INDEX IF NOT EXISTS idx_item_states_user_flags ON item_states (user_id, is_saved, is_read, is_hidden);
CREATE INDEX IF NOT EXISTS idx_watchlist_matches_watchlist ON watchlist_matches (watchlist_id, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events (created_at DESC);
`;
