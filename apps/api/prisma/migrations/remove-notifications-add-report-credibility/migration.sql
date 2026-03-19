-- Migration: remove-notifications-add-report-credibility

-- 1. Drop removed tables
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "user_followed_lines";

-- 2. Add credibility_score to reports
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "credibility_score" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_credibility_score_check"
  CHECK ("credibility_score" BETWEEN 1 AND 10);

-- 3. Remove google_id from users 
DROP INDEX IF EXISTS "users_google_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id";
