import { request } from "./client";
export const searchRoutes = (body, options) => request("/routes", { ...options, method: "POST", body });
