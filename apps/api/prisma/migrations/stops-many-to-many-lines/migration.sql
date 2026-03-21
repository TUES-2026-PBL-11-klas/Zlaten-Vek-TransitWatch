-- Migration: stops-many-to-many-lines
-- A stop can be served by multiple lines (e.g. a shared stop for bus 280 and trolley 9).
-- Replace the stops.line_id FK with a line_stops junction table.

-- 1. Drop old FK and column from stops
ALTER TABLE "stops" DROP CONSTRAINT IF EXISTS "stops_line_id_fkey";
ALTER TABLE "stops" DROP COLUMN IF EXISTS "line_id";

-- 2. Create junction table
CREATE TABLE "line_stops" (
    "id"         TEXT    NOT NULL,
    "line_id"    TEXT    NOT NULL,
    "stop_id"    TEXT    NOT NULL,
    "stop_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "line_stops_pkey" PRIMARY KEY ("id")
);

-- 3. Unique constraint: a stop appears at most once per line
CREATE UNIQUE INDEX "line_stops_line_id_stop_id_key" ON "line_stops"("line_id", "stop_id");

-- 4. Indexes for common lookups
CREATE INDEX "line_stops_line_id_idx" ON "line_stops"("line_id");
CREATE INDEX "line_stops_stop_id_idx" ON "line_stops"("stop_id");

-- 5. Foreign key constraints
ALTER TABLE "line_stops"
    ADD CONSTRAINT "line_stops_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "lines"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "line_stops"
    ADD CONSTRAINT "line_stops_stop_id_fkey"
    FOREIGN KEY ("stop_id") REFERENCES "stops"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
