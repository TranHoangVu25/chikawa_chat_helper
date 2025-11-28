import { Router, Request, Response } from "express"
import { ConversationModel } from "../models/conversation.model"

const router = Router()

// ===============================
// GET /conversations/user/:userId
// Lấy tất cả conversation theo userId
// ===============================
router.get("/conversations/user/:userId", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.params.userId
    console.log("🚀 userIdParam:", userIdParam)

    // Chuyển sang number nếu có thể
    const userIdNumber = Number(userIdParam)
    console.log("🚀 userIdNumber:", userIdNumber)

    // Query DB, match cả string và number
    const conversations = await ConversationModel.find({
      $or: [
        { userId: userIdNumber },
        { userId: userIdParam } // trường hợp DB lưu dạng string
      ]
    }).sort({ createdAt: -1 })

    // DEBUG: in toàn bộ conversation tìm được
    console.log("🚀 conversations found:", conversations)

    return res.json({
      count: conversations.length,
      data: conversations,
    })
  } catch (error) {
    console.error("❌ Error fetching conversations:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router
