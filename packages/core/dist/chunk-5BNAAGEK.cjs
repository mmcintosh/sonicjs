'use strict';

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
function sanitizeDeep(value) {
  if (typeof value === "string") {
    return sanitizeInput(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep);
  }
  if (value !== null && typeof value === "object") {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeDeep(v);
    }
    return result;
  }
  return value;
}

exports.escapeHtml = escapeHtml;
exports.sanitizeDeep = sanitizeDeep;
exports.sanitizeInput = sanitizeInput;
exports.sanitizeObject = sanitizeObject;
//# sourceMappingURL=chunk-5BNAAGEK.cjs.map
//# sourceMappingURL=chunk-5BNAAGEK.cjs.map