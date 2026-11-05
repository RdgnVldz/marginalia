import type { UIMessage } from "ai";

// One retrieved passage, numbered so the model can cite it as [n]
export type ChatSource = {
  n: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

// Attached to each assistant message so the UI can draw the margin
export type ChatMessageMetadata = { sources?: ChatSource[] };

export type ChatMessage = UIMessage<ChatMessageMetadata>;