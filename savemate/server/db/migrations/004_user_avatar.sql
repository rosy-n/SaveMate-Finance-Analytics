-- 004_user_avatar.sql
-- 마이페이지 > 프로필 사진 (이미지 data URI 저장)

ALTER TABLE users ADD COLUMN avatar_url text;
