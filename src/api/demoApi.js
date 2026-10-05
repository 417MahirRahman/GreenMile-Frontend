import { request } from "./client";
export const prepareDemoVehicle = async (options) => (await request("/demo/vehicle", { ...options, method: "POST", body: {} })).vehicle;
export const simulateCycles = (cycles, options) => request("/demo/simulate-cycle", { ...options, method: "POST", body: { cycles } });
