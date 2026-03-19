-- Migration: replace-stop-with-line-on-reports
-- Reports are about the vehicle/line the user is riding, not a specific stop.

-- 1. Add line_id (nullable for now so existing rows don't break)
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "line_id" TEXT;

-- 2. Backfill line_id from the existing stop → line relationship
UPDATE "reports" r
SET "line_id" = s."line_id"
FROM "stops" s
WHERE r."stop_id" = s."id";

-- 3. Enforce NOT NULL
ALTER TABLE "reports"
  ALTER COLUMN "line_id" SET NOT NULL;

-- 4. Add FK constraint to lines
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_line_id_fkey"
  FOREIGN KEY ("line_id") REFERENCES "lines"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Drop old stop_id FK and column
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_stop_id_fkey";
DROP INDEX IF EXISTS "reports_stop_id_idx";
ALTER TABLE "reports" DROP COLUMN IF EXISTS "stop_id";

-- 6. Replace index
DROP INDEX IF EXISTS "reports_stop_id_idx";
CREATE INDEX IF NOT EXISTS "reports_line_id_idx" ON "reports"("line_id");
