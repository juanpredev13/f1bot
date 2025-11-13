import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
} = process.env;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const f1Data = [
    // General F1 info
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://en.wikipedia.org/wiki/Formula_One_racing',
    'https://en.wikipedia.org/wiki/History_of_Formula_One',

    // Current season and championships
    'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
    'https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions',

    // Teams
    'https://en.wikipedia.org/wiki/List_of_Formula_One_constructors',
    'https://en.wikipedia.org/wiki/Red_Bull_Racing',
    'https://en.wikipedia.org/wiki/Scuderia_Ferrari',
    'https://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One',
    'https://en.wikipedia.org/wiki/Aston_Martin_in_Formula_One',
    'https://en.wikipedia.org/wiki/McLaren',

    // Drivers (current top drivers and champions)
    'https://en.wikipedia.org/wiki/Max_Verstappen',
    'https://en.wikipedia.org/wiki/Lewis_Hamilton',
    'https://en.wikipedia.org/wiki/Charles_Leclerc',
    'https://en.wikipedia.org/wiki/Lando_Norris',
    'https://en.wikipedia.org/wiki/Fernando_Alonso',

    // F1 Academy and junior categories
    'https://en.wikipedia.org/wiki/F1_Academy',

    // Technical and regulations
    'https://en.wikipedia.org/wiki/Formula_One_car',
    'https://en.wikipedia.org/wiki/Formula_One_regulations',
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE});


const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});


const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536,
                metric: similarityMetric,
            },
        });
        console.log("Collection created:", res);
    } catch (error: any) {
        if (error.message?.includes("already exists")) {
            console.log("Collection already exists, skipping creation");
        } else {
            throw error;
        }
    }
};


const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    let totalChunks = 0;

    for await (const url of f1Data) {
        console.log(`\nScraping: ${url}`);
        const content = await scrapePage(url);
        const chunks = await splitter.splitText(content);
        console.log(`  Found ${chunks.length} chunks`);

        let chunkCount = 0;
        for await (const chunk of chunks) {
            const embedding = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float",
            });

            const vector = embedding.data[0].embedding;
            await collection.insertOne({
                $vector: vector,
                text: chunk,
            });
            chunkCount++;
            totalChunks++;

            if (chunkCount % 10 === 0) {
                process.stdout.write(`  Processed ${chunkCount}/${chunks.length} chunks\r`);
            }
        }
        console.log(`  ✓ Completed ${chunks.length} chunks`);
    }

    console.log(`\n✓ Loading complete! Total chunks inserted: ${totalChunks}`);
};


const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "domcontentloaded",
        },
        evaluate: async (page, browser) => {
          const result = await page.evaluate(() => {
            // Remove unwanted elements
            const elementsToRemove = [
              'script', 'style', 'nav', 'header', 'footer',
              'aside', 'iframe', 'noscript', '.navigation',
              '.menu', '.sidebar', '.footer', '.header',
              '[role="navigation"]', '[role="banner"]',
              '.toc', '#toc', '.mw-editsection', // Wikipedia specific
            ];

            elementsToRemove.forEach(selector => {
              document.querySelectorAll(selector).forEach(el => el.remove());
            });

            // Get main content - try common content selectors
            const contentSelectors = [
              'main',
              'article',
              '[role="main"]',
              '.content',
              '#content',
              '.main-content',
              '#mw-content-text', // Wikipedia
              '.article-body',
            ];

            for (const selector of contentSelectors) {
              const content = document.querySelector(selector);
              if (content) {
                return content.textContent || '';
              }
            }

            // Fallback to body if no content selector found
            return document.body.textContent || '';
          });
          await browser.close();
          return result;
        }
    });

    const rawContent = await loader.scrape();

    // Clean up the text
    return rawContent
      ?.replace(/<[^>]*>?/gm, '') // Remove any remaining HTML tags
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .replace(/\[edit\]/g, '')    // Remove Wikipedia edit links
      .trim() || '';
}

const run = async () => {
    try {
        console.log("Starting database setup...");
        await createCollection();
        await loadSampleData();
        console.log("\n✓ All done! Database is ready.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();