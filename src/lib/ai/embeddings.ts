import "server-only";
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { EMBEDDING_DIMENSIONS } from "@/src/lib/constants";

// Stored on every chunk so we always know which model made a vector
export const EMBEDDING_MODEL_ID = "gemini-embedding-001";

const BATCH_SIZE = 50;
const PAUSE_BETWEEN_BATCHES_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Embeds passages for indexing. Returns one vector per input, in the same order.
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);

    const { embeddings } = await embedMany({
      model: google.embedding(EMBEDDING_MODEL_ID),
      values: batch,
      maxRetries: 5, // the SDK retries rate-limit errors with backoff
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });

    if (embeddings.length !== batch.length) {
      throw new Error("The embedding service returned an unexpected result.");
    }
    vectors.push(...embeddings);

    // A short pause keeps us under per-minute free-tier limits
    if (start + BATCH_SIZE < texts.length) await sleep(PAUSE_BETWEEN_BATCHES_MS);
  }

  return vectors;
}

// Embeds a user's question for searching. Note the different task type:
// RETRIEVAL_QUERY pairs with the RETRIEVAL_DOCUMENT vectors stored earlier.
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL_ID),
    value: text,
    maxRetries: 3,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });
  return embedding;
}