import { readFileSync } from "node:fs";
import { chunkPages } from "../src/lib/documents/chunking";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/chunk-smoke.ts <file.txt>");
  process.exit(1);
}

const text = readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
const chunks = chunkPages([{ pageNumber: 1, content: text }]);
const sizes = chunks.map((c) => c.content.length);

console.log(`chunks: ${chunks.length}`);
console.log(
  `min / avg / max chars: ${Math.min(...sizes)} / ${Math.round(
    sizes.reduce((a, b) => a + b, 0) / sizes.length,
  )} / ${Math.max(...sizes)}`,
);
console.log("\n--- chunk 1 ---\n" + chunks[0].content);
console.log(
  "\n--- chunk 2 (it should begin with the end of chunk 1) ---\n" +
    (chunks[1]?.content ?? "(only one chunk)").slice(0, 400),
);