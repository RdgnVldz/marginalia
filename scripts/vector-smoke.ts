import "dotenv/config"; // must be first so DATABASE_URL is loaded before the db client
import { asc, cosineDistance } from "drizzle-orm";
import { db } from "../src/db";
import { vectorPlayground } from "../src/db/schema";

async function main() {
  // Start clean so the script can be re-run
  await db.delete(vectorPlayground);

  await db.insert(vectorPlayground).values([
    { label: "apple", embedding: [1, 0.9, 0.1] },
    { label: "banana", embedding: [0.7, 1, 0.1] },
    { label: "pear", embedding: [0.8, 0.9, 0.2] },
    { label: "car", embedding: [0, 0.1, 1] },
    { label: "truck", embedding: [0.1, 0, 0.95] },
  ]);

  // Pretend this is the embedding of the word "mango"
  const query = [0.95, 0.95, 0.05];

  // cosineDistance(...) becomes SQL: embedding <=> '[0.95,0.95,0.05]'
  const distance = cosineDistance(vectorPlayground.embedding, query);

  const rows = await db
    .select({ label: vectorPlayground.label, distance })
    .from(vectorPlayground)
    .orderBy(asc(distance)) // smallest distance = most similar
    .limit(5);

  console.table(rows);

  await db.$client.end(); // close the connection pool so the script exits
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});