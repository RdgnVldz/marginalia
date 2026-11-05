import { INDEX_BATCH_SIZE } from "../lib/constants";
import {
  embedAndStoreBatch,
  finishIndexing,
  markFailed,
  planIndexing,
  toWorkflowError,
} from "../lib/documents/indexing-core";

// Each step does one unit of real work. Failures are mapped so that
// "can't succeed" errors skip retries and rate limits wait before retrying.
async function planStep(documentId: string, ownerId: string) {
  "use step";
  try {
    return await planIndexing(documentId, ownerId);
  } catch (error) {
    throw toWorkflowError(error);
  }
}

async function embedBatchStep(
  documentId: string,
  ownerId: string,
  from: number,
  to: number,
) {
  "use step";
  try {
    await embedAndStoreBatch(documentId, ownerId, from, to);
  } catch (error) {
    throw toWorkflowError(error);
  }
}
embedBatchStep.maxRetries = 5; // rate limits can take a few waits to clear

async function finishStep(documentId: string, ownerId: string, total: number) {
  "use step";
  try {
    await finishIndexing(documentId, ownerId, total);
  } catch (error) {
    throw toWorkflowError(error);
  }
}

async function markFailedStep(
  documentId: string,
  ownerId: string,
  message: string,
) {
  "use step";
  await markFailed(documentId, ownerId, message);
}

// The orchestrator: only ids and small numbers pass between steps
export async function indexDocumentWorkflow(
  documentId: string,
  ownerId: string,
) {
  "use workflow";

  try {
    const { total } = await planStep(documentId, ownerId);

    for (let from = 0; from < total; from += INDEX_BATCH_SIZE) {
      await embedBatchStep(
        documentId,
        ownerId,
        from,
        Math.min(from + INDEX_BATCH_SIZE, total),
      );
    }

    await finishStep(documentId, ownerId, total);
  } catch (error) {
    await markFailedStep(
      documentId,
      ownerId,
      error instanceof Error ? error.message : "",
    );
  }
}