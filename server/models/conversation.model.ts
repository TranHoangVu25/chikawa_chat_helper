import mongoose, { Schema, Document } from "mongoose"

export interface IMessage {
  sender: "user" | "bot"
  content: any 
  timestamp: Date
}

export interface IConversation extends Document {
  threadId: string
  userId: { type: Number, required: false, default: null }
  agent_type: number // 1:agent, 2: both (agent and admin)
  messages: IMessage[]
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: String, enum: ["user", "bot"], required: true },
  content: { type: Schema.Types.Mixed, required: true }, // Cho phép object, string, array, v.v.
  timestamp: { type: Date, default: Date.now },
})

const ConversationSchema = new Schema<IConversation>({
  threadId: { type: String, required: true, unique: true },
  userId: { type: Number, required: true },
  agent_type: { type: Number, required: true },
  messages: { type: [MessageSchema], default: [] },
  analyzed: {
    type: Number,
    enum: [1, 2], // 1 = pending, 2 = analyzed
    default: 1,
  },
  status: {
    type: Number,
    enum: [1, 2, 3], // 1 = undefine, 2 = potential, 3 = spam
    default: 1,
  },
  role: {
    type: Number,
    enum: [1, 2], // 1 = guest, 2 = customer
    default: 1,
  },
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
    throw new Error(" Missing MongoDB connection URI")
  }

  if (mongoose.connection.readyState === 1) return

  await mongoose.connect(mongoUri, { dbName: "inventory_database" })
  console.log(" Connected to Mongo Atlas (inventory_database)")
}
