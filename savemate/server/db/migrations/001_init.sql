-- 001_init.sql
-- SaveMate 초기 스키마 (Firestore -> PostgreSQL)

-- ───────────────────────── 공통 ─────────────────────────
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE emotion_type     AS ENUM ('dissatisfied', 'neutral', 'satisfied');
CREATE TYPE challenge_status AS ENUM ('active', 'completed', 'failed', 'given_up');

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────── 사용자 ─────────────────────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{4,20}$'),        -- 아이디
  nickname      text NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 20),
  email         text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text NOT NULL,                                                  -- 평문 저장 금지 (bcrypt/argon2 해시)
  legacy_uid    text UNIQUE,                                                    -- Firestore users/{uid} 매핑용 (이전 후 제거 가능)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- 대소문자 구분 없이 중복 방지
CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower_key    ON users (lower(email));
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ───────────────────────── 카테고리 ─────────────────────────
CREATE TABLE categories (
  id   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  kind transaction_type NOT NULL
);

INSERT INTO categories (name, kind) VALUES
  ('식비',                         'expense'),
  ('카페/간식',                    'expense'),
  ('생활(마트 잡화)',              'expense'),
  ('술/유흥',                      'expense'),
  ('패션/쇼핑',                    'expense'),
  ('뷰티/미용',                    'expense'),
  ('문화/여가',                    'expense'),
  ('의료/건강',                    'expense'),
  ('공과금(주거/세금/통신/보험)',  'expense'),
  ('교통/자동차',                  'expense'),
  ('여행/숙박',                    'expense'),
  ('교육',                         'expense'),
  ('경조/선물/후원',               'expense'),
  ('카드대금(후불)',               'expense'),
  ('투자/저축',                    'expense'),
  ('기타',                         'expense'),
  ('수입',                         'income');

-- ───────────────────────── 거래 ─────────────────────────
CREATE TABLE transactions (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  type                transaction_type NOT NULL,
  amount              integer NOT NULL CHECK (amount > 0),                      -- 원 단위
  category_id         smallint REFERENCES categories,
  memo                text NOT NULL DEFAULT '',
  occurred_on         date NOT NULL,                                            -- 거래 날짜 (시각 없음)
  payment_method      text CHECK (payment_method IN ('현금', '신용카드', '체크카드')),
  spending_background text CHECK (spending_background IN
                        ('필수/생존', '사회/관계', '자아실현/자기계발', '쾌락/감정',
                         '여가', '자기표현/이미지·SNS', '투자(저축)/미래지향')),
  income_source       text CHECK (income_source IN ('월급', '용돈', '기타')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- 지출 전용 / 수입 전용 컬럼이 섞이지 않도록
  CHECK (type = 'expense' OR (payment_method IS NULL AND spending_background IS NULL)),
  CHECK (type = 'income'  OR income_source IS NULL)
);
CREATE INDEX idx_transactions_user_date ON transactions (user_id, occurred_on DESC);
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ───────────────────────── 만족도 평가 ─────────────────────────
-- 거래 1건당 평가 1건. "평가 여부"는 이 테이블과의 관계로 판단한다 (isRated 컬럼 없음).
CREATE TABLE satisfaction_ratings (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id bigint NOT NULL UNIQUE REFERENCES transactions ON DELETE CASCADE,
  emotion        emotion_type NOT NULL,
  memo           text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE satisfaction_reasons (
  rating_id bigint NOT NULL REFERENCES satisfaction_ratings ON DELETE CASCADE,
  reason    text   NOT NULL,
  PRIMARY KEY (rating_id, reason)
);

-- ───────────────────────── 챌린지 (테이블만, API는 팀원 구현 예정) ─────────────────────────
-- 진행률은 저장하지 않고 transactions 의 (카테고리, 기간) 합계로 계산한다.
CREATE TABLE challenges (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  category_id   smallint NOT NULL REFERENCES categories,
  target_amount integer NOT NULL CHECK (target_amount > 0),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  status        challenge_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX idx_challenges_user ON challenges (user_id, status);

-- ───────────────────────── LLM 결과 캐시 ─────────────────────────
-- ※ Gemini 가 반환한 JSON 객체를 가공 없이 통째로 저장/반환한다. (현재 LLM 연동 방식 유지)
CREATE TABLE report_cache (                  -- 월간 소비 리포트
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  year_month date NOT NULL CHECK (year_month = date_trunc('month', year_month)::date),  -- 매월 1일
  content    jsonb NOT NULL,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year_month)
);

CREATE TABLE tip_cache (                     -- 오늘의 절약팁
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  tip_date   date NOT NULL,
  content    jsonb NOT NULL,                 -- { title, tips: [{ content, reason }] } 전체
  model      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_date)
);
