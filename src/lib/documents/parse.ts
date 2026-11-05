import "server-only"
import {extractText, getDocumentProxy } from "unpdf";
import { MAX_PDF_PAGES } from "../constants";

// Errors with a message that is safe to show to the user
export class ParseError extends Error {}

export type ParsedPage = { pageNumber: number; content: string };

export type ParsedDocument = {
    mimeType: string;
    pageCount: number;
    pages: ParsedPage[];
}

// The extension decides the kind. The browser's declared MIME type is ignored.
function detectKind(filename: string): "pdf" | "markdown" | "text" | null {
    const name = filename.toLowerCase();
    if (name.endsWith(".pdf")) return "pdf";
    if (name.endsWith(".md")) return "markdown";
    if (name.endsWith(".txt")) return "text";
    return null;
}

// Every real PDF starts with the bytes "%PDF-"
function hasPdfSignature(bytes: Uint8Array){
    return (
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
    );
}

function clean(text: string) {
    return text
    .replace(/\u0000/g, "") // Postgres text column cannot store NUL characters
    .replace(/\r\n?/g, "")
    .replace(/\n{3,}/g, "")
    .trim();
}

async function parsePdf(bytes: Uint8Array): Promise<ParsedDocument> {
    if (!hasPdfSignature(bytes)){
        throw new ParseError("This file doesn't look like a valid PDF.");
    }

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;

    try{
        pdf = await getDocumentProxy(bytes);
    } catch {
        throw new ParseError("This PDF couldn't be rad. It may be damaged or password-protected.");
    }

    if (pdf.numPages > MAX_PDF_PAGES) {
        throw  new ParseError(`PDFS are limited to ${MAX_PDF_PAGES} pages.`);
    }

    // mergePages: false give one string per page, so we can keep page numbers
    const {text} = await extractText(pdf, { mergePages: false });
    const perPage = Array.isArray(text) ? text : [text];

    const pages: ParsedPage [] = [];
    perPage.forEach((pageText, index) => {
        const content = clean(pageText);
        //Skip empty pages, but keep the real page number of the other
        if (content) pages.push({pageNumber: index + 1, content});
    });

    if (pages.length === 0) {
        throw new ParseError("No text found in this  PDF. Scanned PDFs aren't supported yet.");
    }

    return { mimeType: "application/pdf", pageCount: perPage.length, pages};
}

function parseText(bytes: Uint8Array, mimeType: string): ParsedDocument {
    let decoded: string;
    try {
        decoded = new TextDecoder("uft-8", { fatal: true}).decode(bytes);
    } catch {
        throw new ParseError("Text files must be saved as UTF-8.");
    }

    const content = clean(decoded);
    if (!content) throw new ParseError("This file is empty.");

    return { mimeType, pageCount: 1, pages: [{pageNumber: 1, content}] };
}

export async function parseDocument(
    filename: string,
    bytes: Uint8Array,
): Promise<ParsedDocument>{
    switch (detectKind(filename)){
        case "pdf":
            return parsePdf(bytes);
        case "markdown":
            return parseText(bytes, "text/markdown");
        case "text":
            return parseText(bytes, "text/plain");
        default:
            throw new ParseError("Upload a PDF, TXT or Markdown (.md) file.");
    }
}

