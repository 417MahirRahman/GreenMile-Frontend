export function number(value, digits = 1, suffix = "") {
  return value != null && Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits)}${suffix}` : "—";
}
export function formatDistance(meters) { return number(meters == null ? null : meters / 1000, 1, " km"); }
export function isBatteryEmpty(soc) {
  return soc != null && String(soc).trim() !== "" && Number.isFinite(Number(soc)) && Number(soc) <= 0;
}
export function isRouteSelectable(route, soc) {
  return Boolean(route) && !isBatteryEmpty(soc) && route.feasible !== false && !(route.projectedArrivalSoc != null && Number(route.projectedArrivalSoc) < 0);
}
export function formatArrivalCharge(value) {
  if (value == null || String(value).trim() === "" || !Number.isFinite(Number(value))) return "—";
  return Number(value) <= 0 ? "0%" : number(value, 1, "%");
}
export function formatChargeShortfall(value) {
  return value != null && Number.isFinite(Number(value)) && Number(value) < 0 ? number(Math.abs(Number(value)), 1, "%") : null;
}
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "—";
  const minutes = Math.round(Number(seconds) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`;
}
