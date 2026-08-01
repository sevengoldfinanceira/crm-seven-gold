-- Migration: 021-feed-sales-social.sql
-- Description: Structure for internal team sales social network (Feed de Vendas)

-- 1. Table feed_posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id text UNIQUE NOT NULL,
  author_id uuid REFERENCES public.crm_users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_avatar text,
  seller_id text,
  seller_name text NOT NULL,
  seller_avatar text,
  credit_amount numeric NOT NULL DEFAULT 0,
  image_url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index on created_at for fast descending feed queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_sale_id ON public.feed_posts (sale_id);

-- 2. Table feed_comments
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.crm_users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_avatar text,
  parent_comment_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_post_id ON public.feed_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_created_at ON public.feed_comments (created_at ASC);

-- 3. Table feed_reactions
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL,
  reaction_type text NOT NULL DEFAULT 'celebrate',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_feed_reactions_post_user UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_post_id ON public.feed_reactions (post_id);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "feed_posts_select_all" ON public.feed_posts;
CREATE POLICY "feed_posts_select_all" ON public.feed_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "feed_comments_select_all" ON public.feed_comments;
CREATE POLICY "feed_comments_select_all" ON public.feed_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "feed_reactions_select_all" ON public.feed_reactions;
CREATE POLICY "feed_reactions_select_all" ON public.feed_reactions FOR SELECT USING (true);

-- Insert/Update/Delete policies
DROP POLICY IF EXISTS "feed_posts_manage_authenticated" ON public.feed_posts;
CREATE POLICY "feed_posts_manage_authenticated" ON public.feed_posts FOR ALL USING (true);

DROP POLICY IF EXISTS "feed_comments_manage_authenticated" ON public.feed_comments;
CREATE POLICY "feed_comments_manage_authenticated" ON public.feed_comments FOR ALL USING (true);

DROP POLICY IF EXISTS "feed_reactions_manage_authenticated" ON public.feed_reactions;
CREATE POLICY "feed_reactions_manage_authenticated" ON public.feed_reactions FOR ALL USING (true);
