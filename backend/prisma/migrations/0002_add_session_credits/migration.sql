-- Prepaid tutoring session packs bought from a tutor's pricing cards.
CREATE TABLE IF NOT EXISTS "session_credits" (
    "id"         SERIAL       NOT NULL,
    "user_id"    INTEGER      NOT NULL,
    "tutor_id"   INTEGER      NOT NULL,
    "plan"       VARCHAR(50)  NOT NULL,
    "total"      INTEGER      NOT NULL,
    "used"       INTEGER      NOT NULL DEFAULT 0,
    "tx_ref"     VARCHAR(255),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_credits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "session_credits_user_id_tutor_id_idx" ON "session_credits"("user_id", "tutor_id");
CREATE INDEX IF NOT EXISTS "session_credits_tx_ref_idx" ON "session_credits"("tx_ref");

ALTER TABLE "session_credits"
    DROP CONSTRAINT IF EXISTS "session_credits_user_id_fkey";
ALTER TABLE "session_credits"
    ADD CONSTRAINT "session_credits_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "session_credits"
    DROP CONSTRAINT IF EXISTS "session_credits_tutor_id_fkey";
ALTER TABLE "session_credits"
    ADD CONSTRAINT "session_credits_tutor_id_fkey" FOREIGN KEY ("tutor_id")
    REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
