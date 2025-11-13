import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get the last user message and extract text from parts
    const lastMessage = messages[messages.length - 1];
    let userQuery = "";

    if (lastMessage?.parts) {
      const textParts = lastMessage.parts.filter((part: any) => part.type === "text");
      userQuery = textParts.map((part: any) => part.text).join("");
    } else if (lastMessage?.content) {
      userQuery = lastMessage.content;
    }

    // Generate embedding for the user query
    const embeddingResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: userQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar documents in Astra DB
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    const searchResults = await collection
      .find(
        {},
        {
          sort: { $vector: queryEmbedding },
          limit: 5,
        }
      )
      .toArray();

    console.log("=== RAG Search Debug ===");
    console.log("User query:", userQuery);
    console.log("Number of results found:", searchResults.length);
    console.log("First result:", searchResults[0]?.text?.substring(0, 200));

  // Build context from retrieved documents
  const docContext = searchResults.map((doc: any) => doc.text).join("\n\n") || "";

  // Create system prompt with context
  const systemPrompt = `You are an AI assistant who knows everything about Formula One.
Use the below context to augment what you know about Formula One racing.
The context will provide you with the most recent page data from wikipedia,
the official F1 website and others.

If the context doesn't include the information you need answer based on your
existing knowledge and don't mention the source of your information or
what the context does or doesn't include.
Format responses using markdown where applicable and don't return
images.

----------

START CONTEXT
${docContext}
END CONTEXT

----------`;

  // Stream the response
  const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
