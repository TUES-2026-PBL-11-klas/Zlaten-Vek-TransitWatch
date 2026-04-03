-- Migration: sync-schema-with-prisma-models
-- Align legacy DB schema with current Prisma models used by transit imports.

-- lines: add GTFS route id + optional color
ALTER TABLE "lines"
  ADD COLUMN IF NOT EXISTS "gtfs_id" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "lines_gtfs_id_key" ON "lines"("gtfs_id");

-- stops: add GTFS stop id
ALTER TABLE "stops"
  ADD COLUMN IF NOT EXISTS "gtfs_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "stops_gtfs_id_key" ON "stops"("gtfs_id");

-- line_stops: match Prisma composite unique key (line_id, stop_id, stop_order)
DROP INDEX IF EXISTS "line_stops_line_id_stop_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "line_stops_line_id_stop_id_stop_order_key"
  ON "line_stops"("line_id", "stop_id", "stop_order");

-- shapes table used for simplified line polylines
CREATE TABLE IF NOT EXISTS "shapes" (
  "id" TEXT NOT NULL,
  "line_id" TEXT NOT NULL,
  "coordinates" JSONB NOT NULL,

  CONSTRAINT "shapes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shapes_line_id_key" ON "shapes"("line_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shapes_line_id_fkey'
  ) THEN
    ALTER TABLE "shapes"
      ADD CONSTRAINT "shapes_line_id_fkey"
      FOREIGN KEY ("line_id") REFERENCES "lines"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
