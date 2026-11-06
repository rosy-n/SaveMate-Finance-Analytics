-- 002_feedback.sql
-- 오류/의견 보내기 (마이페이지 > 오류나 의견 보내기)

CREATE TABLE feedback (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  category       text NOT NULL CHECK (category IN ('오류 신고', '기능 제안', '기타')),
  title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content        text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  contact_email  text CHECK (contact_email IS NULL OR contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_user ON feedback (user_id, created_at DESC);
