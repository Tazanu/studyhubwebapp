-- AlterTable
ALTER TABLE "group_messages" ADD COLUMN     "deleted_at" TIMESTAMP(6);

-- CreateTable
CREATE TABLE "group_message_reactions" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_message_reactions_message_id_idx" ON "group_message_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_message_reactions_message_id_user_id_emoji_key" ON "group_message_reactions"("message_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "group_message_reactions" ADD CONSTRAINT "group_message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "group_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_message_reactions" ADD CONSTRAINT "group_message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

