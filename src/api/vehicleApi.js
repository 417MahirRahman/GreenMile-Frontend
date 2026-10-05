import { request } from "./client";
export const createVehicle = async (body, options) => (await request("/vehicles", { ...options, method: "POST", body })).vehicle;
