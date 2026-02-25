// src/utils/sanitize.ts
function escapeHtml(text) {
  if (typeof text !== "string") {
    return "";
  }
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
function sanitizeInput(input) {
  if (!input) {
    return "";
  }
  return escapeHtml(String(input).trim());
}
function sanitizeObject(obj, fields) {
  const sanitized = { ...obj };
  for (const field of fields) {
    if (typeof obj[field] === "string") {
      sanitized[field] = sanitizeInput(obj[field]);
    }
  }
  return sanitized;
}

export { escapeHtml, sanitizeInput, sanitizeObject };
//# sourceMappingURL=chunk-USI3FQPO.js.map
//# sourceMappingURL=chunk-USI3FQPO.js.map