CREATE TABLE "document_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_pages_document_page_unique" UNIQUE("document_id","page_number")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "page_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "char_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "document_pages_owner_id_idx" ON "document_pages" ("owner_id");--> statement-breakpoint
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;