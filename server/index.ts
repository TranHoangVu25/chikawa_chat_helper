// index.js
import 'dotenv/config'
import express, { Express, Request, Response } from "express"
import cors from 'cors'
import mongoose from "mongoose"
import { MongoClient } from "mongodb"
import { callAgent } from './agents/agent'
import conversationRoutes from "./routes/conversation.routes"
import { authenticateToken } from './middleware/authMiddleware'

// ====================
// Khởi tạo Express app
// ====================
const app: Express = express()

app.use(cors())
app.use(express.json())

// ====================
// Gắn router conversation
// ====================
app.use("/api", conversationRoutes)

// ====================
// Root endpoint
// ====================
app.get('/', (req: Request, res: Response) => {
  res.send('LangGraph Agent Server')
})

// ====================
// Kết nối MongoDB & Mongoose
// ====================

// MongoClient cho callAgent
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// Kết nối Mongoose cho ConversationModel
mongoose.connect(process.env.MONGODB_ATLAS_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Mongoose connected!')
  startServer()
})
.catch(err => {
  console.error('❌ Mongoose connection error:', err)
  process.exit(1)
})

// ====================
// Hàm start server
// ====================
async function startServer() {
  try {
    // Kết nối MongoClient
    await client.connect()
    await client.db("admin").command({ ping: 1 })
    console.log("✅ MongoClient connected!")

    // POST /chat - tạo hoặc tiếp tục conversation mới
    app.post('/chat', authenticateToken, async (req: Request, res: Response) => {
      const { message, threadId } = req.body
      const currentThreadId = threadId || Date.now().toString()
      const userId = req.userId

      console.log(`🔍 Authenticated User ID:`, userId)
      console.log(`🗣️ User: ${message}`)
      console.log(`🧵 Thread ID: ${currentThreadId}`)

      try {
        const response = await callAgent(client, message, currentThreadId, userId)
        res.json({ threadId: currentThreadId, response })
      } catch (error) {
        console.error('❌ Error starting conversation:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // POST /chat/:threadId - tiếp tục conversation hiện tại
    app.post('/chat/:threadId', authenticateToken, async (req: Request, res: Response) => {
      const { threadId } = req.params
      const { message } = req.body
      const userId = req.userId

      try {
        const response = await callAgent(client, message, threadId, userId)
        res.json({ response })
      } catch (error) {
        console.error('❌ Error in chat:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    app.post('/guest/chat', async (req: Request, res: Response) => {
      const { message, threadId } = req.body
const currentThreadId = threadId || `guest_${Date.now().toString()}`

      console.log(`🗣️ [Guest] User: ${message}`)
      console.log(`🧵 [Guest] Thread ID: ${currentThreadId}`)

      try {
        // Pass userId = null and shouldSave = false
        const response = await callAgent(client, message, currentThreadId, null, false)
        res.json({ threadId: currentThreadId, response })
      } catch (error: any) {
        console.error('❌ Error in guest chat:', error.message || error)
        res.status(500).json({ error: error.message || 'Internal server error' })
      }
    })

    // Start server
    const PORT = process.env.PORT || 8000
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error)
    process.exit(1)
  }
}