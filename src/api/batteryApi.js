import { request } from "./client";
const query = (batteryId) => `?batteryId=${encodeURIComponent(batteryId)}`;
export const getLatestBatteryReading = (id, options) => request(`/battery/latest${query(id)}`, options);
export const getTotalEnergyConsumption = (id, options) => request(`/battery/energy-total${query(id)}`, options);
export const getLatestSoH = (id, options) => request(`/ai/soh/latest${query(id)}`, options);
