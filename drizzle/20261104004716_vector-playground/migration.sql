CREATE TABLE "vector_playground" (
	"id" serial PRIMARY KEY,
	"label" text NOT NULL,
	"embedding" vector(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vector_playground_embedding_idx" ON "vector_playground" USING hnsw ("embedding" vector_cosine_ops);