import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const checkData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);

    console.log(`\nCollection: ${ASTRA_DB_COLLECTION}`);
    console.log("(Has more than 1000 documents)");

    // Get a few sample documents
    const samples = await collection.find({}, { limit: 3 }).toArray();

    console.log("\n=== Sample Documents ===");
    samples.forEach((doc: any, index: number) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log("Text length:", doc.text?.length || 0);
        console.log("Text preview:", doc.text?.substring(0, 300));
        console.log("---");
    });
};

checkData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
