import { useState, useRef, useEffect } from "react";
import "./App.css";
import formatMessageText from "./utils/formatMessageText";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // const handleSend = async (e) => {
  //   e.preventDefault();
  //   if (!input.trim()) return;

  //   setThreadId(null);
  //   const userMessage = { role: "user", text: input };
  //   setMessages((prev) => [...prev, userMessage]);
  //   setInput("");
  //   setLoading(true);

  //   try {
  //     const res = await fetch("http://localhost:8000/chat", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ threadId, message: userMessage.text }),
  //     });

  //     const data = await res.json();
  //     if (data.threadId) setThreadId(data.threadId);
  //     setLoading(false);

  //     const botMessage = { role: "bot", text: data.response };
  //     setMessages((prev) => [...prev, botMessage]);
  //   } catch (error) {
  //     setLoading(false);
  //     setMessages((prev) => [
  //       ...prev,
  //       { role: "system", text: "⚠️ Lỗi khi kết nối tới server!" },
  //     ]);
  //   }
  // };
const handleSend = async (e, customMessage) => {
  if (e) e.preventDefault();

  const messageToSend = customMessage || input.trim();
  if (!messageToSend) return;

  setThreadId(null);
  const userMessage = { role: "user", text: messageToSend };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: messageToSend }),
    });

    // ✅ Kiểm tra nếu server phản hồi lỗi
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();

    // ✅ Kiểm tra nếu phản hồi không hợp lệ
    if (!data || !data.response) {
      throw new Error("Invalid response format");
    }

    if (data.threadId) setThreadId(data.threadId);
    setLoading(false);

    const botMessage = { role: "bot", text: data.response };
    setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
    console.error("❌ Chat error:", error);
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        text: "⚠️ An error occurred while connecting to the server. Please try again.",
      },
    ]);
  }
};


  /** ✅ Hàm parse nội dung chuyên nghiệp */
  const renderFormattedText = (text) => {
    // Nếu có pattern sản phẩm => tách ra card
    const productRegex =
      /\*\*(.+?)\*\*[\s\S]*?Image:\s*(https[^\s]+)[\s\S]*?Price:\s*([0-9]+)\s*¥[\s\S]*?Description:\s*(.+?)(?=(\*\*|$))/g;

    const parts = [];
    let match;
    let lastIndex = 0;

    while ((match = productRegex.exec(text)) !== null) {
      const [full, name, image, price, desc] = match;

      // Đẩy text trước sản phẩm (nếu có)
      if (match.index > lastIndex) {
        const before = text.slice(lastIndex, match.index);
        parts.push(
          <p
            key={lastIndex}
            dangerouslySetInnerHTML={{ __html: markdownToHTML(before) }}
          />
        );
      }

      // Đẩy card sản phẩm
      parts.push(
        <div className="product-card" key={match.index}>
          <img src={image} alt={name} />
          <div className="product-info">
            <h4>{name}</h4>
            <p className="price">{price} ¥</p>
            <p>{desc.trim()}</p>
          </div>
        </div>
      );

      lastIndex = productRegex.lastIndex;
    }

    // Phần còn lại
    if (lastIndex < text.length) {
      parts.push(
        <p
          key="rest"
          dangerouslySetInnerHTML={{ __html: markdownToHTML(text.slice(lastIndex)) }}
        />
      );
    }

    return parts;
  };

  /** ✅ Chuyển Markdown cơ bản thành HTML */
  const markdownToHTML = (rawText) => {
    if (!rawText) return "";
    return rawText
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **bold**
      .replace(/\n/g, "<br/>") // xuống dòng
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); // link
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Chiikawa Assistant</h2>
        <button
          className="reset-btn"
          onClick={() => {
            setMessages([]);
            setThreadId(null);
          }}
        >
          🔄 Refresh
        </button>
      </header>

      <div className="chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${
              msg.role === "user"
                ? "user-message"
                : msg.role === "bot"
                ? "bot-message"
                : "system-message"
            }`}
          >
            <div className="chat-bubble">
              <strong>
                {msg.role === "user"
                  ? "Bạn:"
                  : msg.role === "bot"
                  ? "Assistant:"
                  : "Hệ thống:"}
              </strong>
              {/* <div className="chat-text">{renderFormattedText(msg.text)}</div> */}
              <div className="chat-text"
     dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="bot-message">
            <div className="chat-bubble typing-indicator">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ✅ Gợi ý khi chưa có tin nhắn */}
      {messages.length === 0 && (
  <div className="suggestion-box">
    <p>💬 You can start by choosing one of the following options:</p>
    <div className="suggestion-buttons">
      {[
        "Show me the most popular items",
        "I’d like to see kitchen products",
        "Do you have any plush toys or mascots?",
      ].map((text, i) => (
        <button
          key={i}
          onClick={() => handleSend(null, text)} // ✅ Gửi luôn
          className="suggestion-btn"
        >
          {text}
        </button>
      ))}
    </div>
  </div>
)}


      <form onSubmit={handleSend} className="chat-form">
        <input
          type="text"
          value={input}
          placeholder="Enter message..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>

      {threadId && <div className="thread-id">🧵 ID: {threadId}</div>}
    </div>
  );
}

export default App;
