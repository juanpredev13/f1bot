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

const clearDatabase = async () => {
    try {
        console.log("Deleting collection...");
        await db.dropCollection(ASTRA_DB_COLLECTION);
        console.log("✓ Collection deleted successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

clearDatabase();
