// test-db-save.ts
import "dotenv/config";
import mongoose from "mongoose";
import { ConversationModel } from "./models/conversation.model";

async function testConversationSave() {
  try {
    // Connect to MongoDB Atlas
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_ATLAS_URI!, {
      dbName: "inventory_database",
    });
    console.log("✅ Connected to inventory_database");

    // Create test conversation
    const testConversation = {
      threadId: "test-thread-" + Date.now(),
      userId: 43, // Must be a NUMBER to match your schema
      agent_type: 1,
      role: 2,
      messages: [
        {
          sender: "user",
          content: "This is a test message from standalone script",
          timestamp: new Date(),
        },
        {
          sender: "bot",
          content: "Hello! This is a test response.",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };

    console.log("💾 Saving test conversation...");
    const saved = await ConversationModel.findOneAndUpdate(
      { threadId: testConversation.threadId },
      testConversation,
      { upsert: true, new: true, runValidators: true }
    );

    console.log("✅ SUCCESS! Conversation saved with ID:", saved._id);
    console.log("📍 Check your Atlas: DB = inventory_database, Collection = conversations");

    // Clean up (optional): delete after test
    // await ConversationModel.deleteOne({ _id: saved._id });
    // console.log("🧹 Test document cleaned up.");

  } catch (error: any) {
    console.error("💥 FAILED to save conversation:");
    console.error("Error:", error.message);
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

// Run the test
testConversationSave();