import { request } from "./client";
export const getProfile = async (options) => (await request("/auth/me", options)).user;
