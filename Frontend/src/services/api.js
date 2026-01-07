// API configuration - uses environment variable or defaults to production
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://quizmakerai-backend.vercel.app";

export const generateQuiz = async (url) => {
  const response = await fetch(`${API_BASE_URL}/generate_quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return response;
};

export const getQuiz = async (id) => {
  const response = await fetch(`${API_BASE_URL}/quiz/${id}`);
  return response;
};

export const getHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/history`);
  return response;
};
