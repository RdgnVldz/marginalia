// Number of numbers in each embedding vector.
// 768 is one of the sizes recommended for Gemini embeddings.
// Changing this later means re-embedding every chunk.
export const EMBEDDING_DIMENSIONS = 768;

// Upload limits. These protect the free tiers (Vercel caps request bodies
// at 4.5 MB, and Neon's free plan has 0.5 GB of storage per project).
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_DOCUMENTS_PER_USER = 10;
export const MAX_PDF_PAGES = 150;
export const ACCEPTED_FILE_TYPES = ".pdf,.txt,.md";
// Chunking
export const CHUNK_TARGET_CHARS = 1000;
export const CHUNK_OVERLAP_CHARS = 200;
// Protects the free embedding quota and database storage
export const MAX_CHUNKS_PER_DOCUMENT = 600;