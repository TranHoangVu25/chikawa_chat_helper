import mongoose, { Schema, Document } from "mongoose"

export interface IMessage {
  sender: "user" | "bot"
  content: string
  timestamp: Date
}

export interface IConversation extends Document {
  threadId: string
  userId: number
  agent_type: number // 1:agent, 2: both (agent and admin)
  messages: IMessage[]
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: String, enum: ["user", "bot"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

const ConversationSchema = new Schema<IConversation>({
  threadId: { type: String, required: true, unique: true },
  userId: { type: Number, required: true },
  agent_type: { type: Number, required: true },
  messages: { type: [MessageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
})

// Model export
export const ConversationModel = mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema,
  "conversations" // <- giống @Document("conversations") trong Java
)


export async function connectConversationDB(uri?: string) {
  const mongoUri = uri || process.env.MONGO_ATLAS_URI
  if (!mongoUri) {
    throw new Error("❌ Missing MongoDB connection URI")
  }

  if (mongoose.connection.readyState === 1) return

  await mongoose.connect(mongoUri, { dbName: "inventory_database" })
  console.log("✅ Connected to Mongo Atlas (inventory_database)")
}
