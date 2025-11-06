// src/utils/formatMessageText.js
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Làm sạch URL ảnh
function cleanImageUrl(url) {
  if (!url) return url;
  try {
    const decoded = decodeURIComponent(url);
    const m = decoded.match(/^(.*?\.(?:jpg|jpeg|png|webp|gif))/i);
    if (m && m[1]) return m[1];
  } catch {}
  const m2 = url.match(/^(.*?\.(?:jpg|jpeg|png|webp|gif))/i);
  return m2 && m2[1] ? m2[1] : url;
}

export default function formatMessageText(raw) {
  if (!raw && raw !== 0) return "";
  let text = String(raw);

  // --- B1: tách image URL ra và thay bằng token ---
  const imageTokenPrefix = "<<<IMG_TOKEN_";
  let imageTokens = [];
  let tokenCounter = 0;

  text = text.replace(
    /(https?:\/\/[^\s'"]+?\.(?:jpg|jpeg|png|webp|gif)[^\s'"]*)/gi,
    (match) => {
      const clean = cleanImageUrl(match);
      const token = `${imageTokenPrefix}${tokenCounter}>>>`;
      imageTokens.push({ token, url: clean });
      tokenCounter += 1;
      return token;
    }
  );

  // --- B2: Escape toàn bộ HTML ---
  text = escapeHtml(text);

  // --- B3: Xử lý markdown (bold, link, newline) ---
  text = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br/>")
    .replace(
      /(https?:\/\/[^\s<>()"'`]+)/gi,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );

  // --- B4: Chèn lại các <img> an toàn ---
  imageTokens.forEach(({ token, url }) => {
    if (/^https?:\/\//i.test(url)) {
      const safe = escapeHtml(url);
      text = text.replace(
        escapeHtml(token), // vì token đã bị escape ở B2
        `<img src="${safe}" alt="image" class="chat-image" />`
      );
    } else {
      text = text.replace(escapeHtml(token), ""); // loại bỏ nếu không hợp lệ
    }
  });

  return text;
}
