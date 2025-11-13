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

const countDocs = async () => {
    try {
        const collection = await db.collection(ASTRA_DB_COLLECTION);

        // Try to count (will error if more than 1000)
        try {
            const count = await collection.countDocuments({}, 1000);
            console.log(`✓ Documents in collection: ${count}`);
        } catch (error: any) {
            if (error.message?.includes("Too many")) {
                console.log("✓ Documents in collection: 1000+ (still loading...)");
            } else {
                throw error;
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

countDocs();
