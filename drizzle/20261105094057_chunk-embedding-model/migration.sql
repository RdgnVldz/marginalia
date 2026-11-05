ALTER TABLE "chunks" ADD COLUMN "embedding_model" text NOT NULL;--> statement-breakpoint
CREATE INDEX "chunks_owner_hash_idx" ON "chunks" ("owner_id","content_hash");