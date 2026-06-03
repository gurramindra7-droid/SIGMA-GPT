const BASE_URL = "https://sigma-gpt-backend-obn8.onrender.com";

const api = {
  register: async (username, email, password) => {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  sendMessage: async (message, chatId, token) => {
    const res = await fetch(`${BASE_URL}/chat`, {
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
    const res = await fetch(`${BASE_URL}/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch chats");
    return data;
  },

  getChatById: async (id, token) => {
    const res = await fetch(`${BASE_URL}/chats/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch chat");
    return data;
  },

  deleteChat: async (id, token) => {
    const res = await fetch(`${BASE_URL}/chats/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete chat");
    return data;
  },
};

export default api;

// Named exports for convenience
export const sendMessage = api.sendMessage;
export const getChats = api.getChats;
export const getChatById = api.getChatById;
export const deleteChat = api.deleteChat;