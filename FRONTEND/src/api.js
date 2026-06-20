// src/api.js
import API_BASE_URL from "./config/api";

// Retry logic for Render cold starts (free tier sleeps after 15 min)
export async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // If server error (5xx), retry; otherwise throw immediately
      if (res.status < 500) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
    await new Promise((r) => setTimeout(r, 2000)); // wait 2s between retries
  }
}

const api = {
  register: async (fullName, email, password, username) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, username: username || fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  login: async (email, password) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  sendMessage: async (message, chatId, token) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, chatId }),
    });
    return res;
  },

  getChats: async (token) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch chats");
    return data;
  },

  getChatById: async (id, token) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/chats/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch chat");
    return data;
  },

  deleteChat: async (id, token) => {
    const res = await fetchWithRetry(`${API_BASE_URL}/api/chats/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete chat");
    return data;
  },

  uploadImage: async (file, token) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Image upload failed");
    return data;
  },

  uploadPdf: async (file, token) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/upload/pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "PDF upload failed");
    return data;
  },
};

export default api;

// Named exports for convenience
export const sendMessage = api.sendMessage;
export const getChats = api.getChats;
export const getChatById = api.getChatById;
export const deleteChat = api.deleteChat;
export const uploadImage = api.uploadImage;
export const uploadPdf = api.uploadPdf;