import { chunkDocument } from "./chunking";
import { embedText } from "./mistral";
import { supabase } from "./supabase";

/**
 * Process a document into chunks, embed each chunk, and store in document_chunks.
 * Call this after a document is inserted into the documents table.
 */
export async function processDocument(
  documentId: string,
  documentText: string,
  documentType: string,
): Promise<number> {
  const chunks = chunkDocument(documentText, documentId, documentType);

  if (chunks.length === 0) {
    console.log(`[documentPipeline] No chunks generated for document ${documentId}`);
    return 0;
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const embedding = await embedText(chunk.content);

    const { error } = await supabase.from("document_chunks").insert({
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      token_count: Math.ceil(chunk.content.length / 4), // rough estimate
      embedding,
      metadata: chunk.metadata,
    });

    if (error) {
      console.error(
        `[documentPipeline] Failed to insert chunk ${i + 1}/${chunks.length} for document ${documentId}:`,
        error.message,
      );
    } else {
      console.log(
        `[documentPipeline] Processed chunk ${i + 1}/${chunks.length} for document ${documentId}`,
      );
    }

    // Small delay between embedding calls to avoid rate limits
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return chunks.length;
}
