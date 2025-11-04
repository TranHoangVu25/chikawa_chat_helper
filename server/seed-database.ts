// Import Google's Gemini chat model and embeddings for AI text generation and vector creation
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
// Import structured output parser to ensure AI returns data in specific format
import { StructuredOutputParser } from "@langchain/core/output_parsers"
// Import MongoDB client for database connection
import { MongoClient } from "mongodb"
// Import MongoDB Atlas vector search for storing and searching embeddings
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
// Import Zod for data schema validation and type safety
import { z } from "zod"
// Load environment variables from .env file (API keys, connection strings)
import "dotenv/config"

// Create MongoDB client instance using connection string from environment variables
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// Initialize Google Gemini chat model for generating synthetic furniture data
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",  // Use Gemini 1.5 Flash model
  temperature: 0.7,               // Set creativity level (0.7 = moderately creative)
  apiKey: process.env.GOOGLE_API_KEY, // Google API key from environment variables
})

// Define schema for furniture item structure using Zod validation
// ✅ Schema cho sản phẩm Chiikawa (từ itemSchema)
const itemSchema = z.object({
  id: z.string(), // Từ item_id
  name: z.string(), // Từ item_name
  description: z.string(), // Từ item_description

  // Giá được tách từ prices.full_price hoặc sale_price
  price: z.number(),

  // Trạng thái — có thể sinh từ logic hoặc giữ tạm default
  status: z.string().default("Available"),

  // Ảnh — giả sử chưa có trong dữ liệu gốc, để rỗng
  images: z.array(z.string()).default([]),

  // categories từ mảng string → mảng object { name, slug }
  categories: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
    })
  ),

  // characters — không có trong dữ liệu gốc → để trống
  characters: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
    })
  ).default([]),

  // vendor = brand (thương hiệu)
  vendor: z.string(),

  // variants — không có trong dữ liệu gốc → optional
  variants: z.array(z.any()).optional(),
})


// Create TypeScript type from Zod schema for type safety
type Item = z.infer<typeof itemSchema>

// Create parser that ensures AI output matches our item schema
const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema))

// Function to create database and collection before seeding
async function setupDatabaseAndCollection(): Promise<void> {
  console.log("Setting up database and collection...")
  
  // Get reference to the inventory_database database
  const db = client.db("inventory_database")
  
  // Create the items collection if it doesn't exist
  const collections = await db.listCollections({ name: "items" }).toArray()
  
  if (collections.length === 0) {
    await db.createCollection("items")
    console.log("Created 'items' collection in 'inventory_database' database")
  } else {
    console.log("'items' collection already exists in 'inventory_database' database")
  }
}
// Function to create vector search index
async function createVectorSearchIndex(): Promise<void> {
  try {
    const db = client.db("inventory_database")
    const collection = db.collection("items")
    await collection.dropIndexes()
    const vectorSearchIdx = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        "fields": [
          {
            "type": "vector",
            "path": "embedding",
            "numDimensions": 768,
            "similarity": "cosine"
          }
        ]
      }
    }
    console.log("Creating vector search index...")
    await collection.createSearchIndex(vectorSearchIdx);

    console.log("Successfully created vector search index");
  } catch (e) {
    console.error('Failed to create vector search index:', e);
  }
}

import fs from "fs"
import path from "path"
import { itemSchema } from "./data" // Schema bạn đã định nghĩa
import type { Item } from "./data"

// Đọc tất cả các file JSON trong thư mục "data"
async function generateSyntheticData(): Promise<Item[]> {
  const dataDir = path.resolve(__dirname, "../data") // 📁 trỏ tới thư mục "data" cùng cấp với file này
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json")) // chỉ lấy file .json

  console.log(`📂 Loading product data from ${files.length} JSON files in /data...`)

  try {
    const allData: Item[] = []

    for (const file of files) {
      const filePath = path.join(dataDir, file)
      console.log(`📄 Reading ${filePath}...`)

      const rawData = fs.readFileSync(filePath, "utf8")
      const jsonData = JSON.parse(rawData)

      if (!Array.isArray(jsonData)) {
        console.warn(`⚠️ File ${file} does not contain an array, skipping.`)
        continue
      }

      // Validate từng phần tử theo schema
      const validatedData = jsonData.map((item, index) => {
        try {
          return itemSchema.parse(item)
        } catch (err) {
          console.error(`❌ Validation failed in ${file} at index ${index}:`, err)
          return null
        }
      }).filter(Boolean) as Item[]

      console.log(`✅ Loaded ${validatedData.length} valid items from ${file}`)
      allData.push(...validatedData)
    }

    console.log(`🎯 Total ${allData.length} valid items loaded from all files.`)
    return allData

  } catch (error) {
    console.error("❌ Error loading JSON data:", error)
    throw error
  }
}



async function createItemSummary(item: Item): Promise<string> {
  return new Promise((resolve) => {
    // Extract fields safely
    const name = item.name || "Unnamed item";
    const description = item.description || "No description available";
    const vendor = item.vendor || "Unknown vendor";
    const price = item.price ? `${item.price} ¥` : "Price not available";

    // ✅ Handle stock status meaningfully
    let statusText = "Unknown";
    if (item.status === "available") {
      statusText = "Available (in stock)";
    } else if (item.status === "sold_out") {
      statusText = "Sold out (currently unavailable)";
    } else {
      statusText = item.status || "Unknown";
    }

    // Convert categories array → readable string
    const categories =
      item.categories && item.categories.length > 0
        ? item.categories.map((c) => c.name).join(", ")
        : "Uncategorized";

    // Convert characters array → readable string
    const characters =
      item.characters && item.characters.length > 0
        ? item.characters.map((c) => c.name).join(", ")
        : "No associated characters";

    // ✅ Build clear, semantic summary text
    const summary = `
Product name: ${name}.
Description: ${description}.
Vendor: ${vendor}.
Price: ${price}.
Status: ${statusText}.
Categories: ${categories}.
Characters: ${characters}.
`.trim();

    resolve(summary);
  });
}


// Main function to populate database with AI-generated furniture data
async function seedDatabase(): Promise<void> {
  try {
    // Establish connection to MongoDB Atlas
    await client.connect()
    // Ping database to verify connection works
    await client.db("admin").command({ ping: 1 })
    // Log successful connection
    console.log("You successfully connected to MongoDB!")

    // Setup database and collection
    await setupDatabaseAndCollection()
    
    // Create vector search index
    await createVectorSearchIndex()

    // Get reference to specific database
    const db = client.db("inventory_database")
    // Get reference to items collection
    const collection = db.collection("items")

    // Clear existing data from collection (fresh start)
    await collection.deleteMany({})
    console.log("Cleared existing data from items collection")
    
    // Generate new synthetic furniture data using AI
    const syntheticData = await generateSyntheticData()

    // Process each item: create summary and prepare for vector storage
    const recordsWithSummaries = await Promise.all(
      syntheticData.map(async (record) => ({
        pageContent: await createItemSummary(record),  // Create searchable summary
        metadata: {...record},                         // Preserve original item data
      }))
    )
    // Create embedding model once (không cần khởi tạo mỗi vòng lặp)
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: "text-embedding-004",
});

// Tạo vector store kết nối tới MongoDB
const vectorStore = new MongoDBAtlasVectorSearch(embeddingModel, {
  collection,
  indexName: "vector_index",
  textKey: "embedding_text",
  embeddingKey: "embedding",
});

// Ghi log
console.log("🔄 Generating embeddings and saving to MongoDB...");

// Tạo embedding text và lưu
for (const record of recordsWithSummaries) {
  await vectorStore.addDocuments([record]); // addDocuments sẽ tự embed + insert

  console.log("✅ Successfully processed & saved record:", record.metadata.id);
}
    // Log completion of entire seeding process
    console.log("Database seeding completed")

  } catch (error) {
    // Log any errors that occur during database seeding
    console.error("Error seeding database:", error)
  } finally {
    // Always close database connection when finished (cleanup)
    await client.close()
  }
}

// Execute the database seeding function and handle any errors
seedDatabase().catch(console.error)
