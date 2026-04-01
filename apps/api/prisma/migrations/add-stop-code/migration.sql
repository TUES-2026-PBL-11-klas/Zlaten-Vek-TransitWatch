-- AlterTable
ALTER TABLE "stops" ADD COLUMN "stop_code" TEXT;

-- CreateIndex
CREATE INDEX "stops_stop_code_idx" ON "stops"("stop_code");
