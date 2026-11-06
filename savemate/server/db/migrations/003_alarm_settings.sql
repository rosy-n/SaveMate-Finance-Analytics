-- 003_alarm_settings.sql
-- 마이페이지 > 만족도 알림 설정

CREATE TABLE alarm_settings (
  user_id          uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  enabled          boolean NOT NULL DEFAULT true,
  reminder_enabled boolean NOT NULL DEFAULT true,
  times            text[] NOT NULL DEFAULT ARRAY['9시'],
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER alarm_settings_set_updated_at BEFORE UPDATE ON alarm_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
