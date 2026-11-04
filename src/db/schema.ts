import { index, pgTable, serial, text, vector } from "drizzle-orm/pg-core";

export const vectorPlayground = pgTable(
  "vector_playground",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    // 3 numbers per vector so you can read them by eye.
    // Real embeddings will use 768.
    embedding: vector("embedding", { dimensions: 3 }).notNull(),
  },
  (table) => [
    // HNSW index tuned for cosine distance
    index("vector_playground_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);