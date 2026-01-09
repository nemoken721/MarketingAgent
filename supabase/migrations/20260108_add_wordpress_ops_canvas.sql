-- =====================================================
-- canvas_mode に 'wordpress-ops' を追加
-- =====================================================

-- 既存の CHECK 制約を削除して新しいものを追加
ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS chat_threads_canvas_mode_check;

ALTER TABLE public.chat_threads ADD CONSTRAINT chat_threads_canvas_mode_check
  CHECK (canvas_mode IN ('home', 'calendar', 'analytics', 'preview', 'history', 'wordpress-ops'));
