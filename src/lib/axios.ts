import axios from "axios";

export const api = axios.create({
  baseURL: typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    : "",
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (process.env.NODE_ENV === "development") {
      console.error("[api]", err?.response?.status, err?.config?.url, err?.response?.data);
    }
    return Promise.reject(err);
  },
);
