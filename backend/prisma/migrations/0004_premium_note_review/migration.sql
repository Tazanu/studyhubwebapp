-- AlterTable
ALTER TABLE "premium_notes" ADD COLUMN     "quality_report" JSONB,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "review_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewed_at" TIMESTAMP(6),
ADD COLUMN     "reviewed_by" INTEGER;

-- CreateIndex
CREATE INDEX "premium_notes_review_status_idx" ON "premium_notes"("review_status");

-- AddForeignKey
ALTER TABLE "premium_notes" ADD CONSTRAINT "premium_notes_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- Notes that predate the review queue were vetted before it existed. Leaving
-- them at the "pending" default would silently pull already-listed material
-- out of the store, so grandfather them in.
UPDATE "premium_notes" SET "review_status" = 'approved' WHERE "created_at" < NOW();
