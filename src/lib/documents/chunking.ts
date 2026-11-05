import { CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS } from "../constants";

export type PageText = { pageNumber: number; content: string };
export type TextChunk = { pageNumber: number; content: string };

// A paragraph longer than the target: split by sentence, then pack sentences
function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      // A single huge "sentence" (no punctuation): cut it by length
      if (current) {
        out.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        out.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }
    if (current && current.length + sentence.length + 1 > maxChars) {
      out.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) out.push(current);
  return out;
}

// Trim the carried-over tail to start at a word boundary
function overlapTail(text: string, overlapChars: number): string {
  const tail = text.slice(-overlapChars);
  const firstSpace = tail.indexOf(" ");
  return firstSpace === -1 ? tail : tail.slice(firstSpace + 1);
}

function splitPage(text: string): string[] {
  const maxChars = CHUNK_TARGET_CHARS;

  // 1. Paragraphs are the natural unit
  const pieces: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) pieces.push(trimmed);
    else pieces.push(...splitLongParagraph(trimmed, maxChars));
  }

  // 2. Pack pieces into chunks, repeating a little text between neighbors
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > maxChars) {
      chunks.push(current);
      const overlap = overlapTail(current, CHUNK_OVERLAP_CHARS);
      current = overlap ? `${overlap}\n\n${piece}` : piece;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function chunkPages(pages: PageText[]): TextChunk[] {
  const result: TextChunk[] = [];
  for (const page of pages) {
    for (const content of splitPage(page.content)) {
      result.push({ pageNumber: page.pageNumber, content });
    }
  }
  return result;
}