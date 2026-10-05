// Safe browser integration tests: every auth, API, geocoder and Maps integration is mocked.
// No test imports real Firebase configuration or sends requests to the backend.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const runtime = process.env.GREENMILE_NODE_PACKAGES;
if (!runtime) throw new Error("Set GREENMILE_NODE_PACKAGES to the bundled Node packages directory (see FRONTEND_PHASE_REPORT.md).");
const { chromium } = await import(pathToFileURL(resolve(runtime, "playwright/index.mjs")));
const authMock = `
const listeners = new Set();
export const auth = { currentUser: null };
export const googleProvider = {};
function user(uid, anonymous = false) { return { uid, isAnonymous: anonymous, displayName: 'Test Driver', email: 'driver@example.test', getIdToken: async () => 'mock-token-' + uid, reload: async () => {} }; }
window.__setAuth = (uid, anonymous = false) => { auth.currentUser = uid ? user(uid, anonymous) : null; listeners.forEach((fn) => fn(auth.currentUser)); };
export const onAuthStateChanged = (_, fn) => { listeners.add(fn); queueMicrotask(() => { if (listeners.has(fn)) fn(auth.currentUser); }); return () => listeners.delete(fn); };
async function credential(uid, anonymous = false) { window.__setAuth(uid, anonymous); const current = auth.currentUser; await new Promise((done) => setTimeout(done, window.__credentialDelay || 0)); return { user: current }; }
export const signInWithEmailAndPassword = async () => credential('account-a');
export const signInWithPopup = async () => credential('account-a');
export const signInAnonymously = async () => credential('guest-a', true);
export const createUserWithEmailAndPassword = async () => credential('new-account');
export const updateProfile = async (user, values) => Object.assign(user, values);
export const signOut = async () => window.__setAuth(null);
`;
const mapsMock = `
window.__maps = { maps: 0, lines: [], markers: [], fits: 0 };
export const setOptions = () => {};
class Map { constructor(element) { window.__maps.maps++; element.innerHTML = '<div style="height:100%;background:repeating-linear-gradient(30deg,#dde8df,#dde8df 40px,#e9f0e9 40px,#e9f0e9 43px)"></div>'; } fitBounds() { window.__maps.fits++; } unbindAll() {} }
class Polyline { constructor(options) { Object.assign(this, options); window.__maps.lines.push(this); } setMap(map) { this.map = map; } addListener(_, callback) { this.click = callback; return { remove: () => { this.click = null; } }; } }
class Marker { constructor(options) { Object.assign(this, options); window.__maps.markers.push(this); } setMap(map) { this.map = map; } }
class LatLngBounds { extend() {} }
export async function importLibrary(name) { await new Promise((resolve) => setTimeout(resolve, 30)); return name === 'maps' ? { Map, Polyline } : name === 'marker' ? { Marker } : { LatLngBounds, ControlPosition: { LEFT_BOTTOM: 6 } }; }
`;
const server = await createServer({
  configLoader: "runner",
  server: { host: "127.0.0.1", port: 4178, strictPort: true },
  define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(process.env.GREENMILE_SMOKE_API_BASE_URL || "http://127.0.0.1:4178"), "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify("mock-map-key") },
  plugins: [{ name: "greenmile-safe-test-integrations", enforce: "pre",
    resolveId(source) { if (source === "firebase/auth") return "\0greenmile-auth"; if (source === "@googlemaps/js-api-loader") return "\0greenmile-maps"; },
    load(id) { if (id === "\0greenmile-auth") return authMock; if (id.replaceAll("\\", "/").endsWith("/src/firebase/firebase.js")) return `export { auth, googleProvider } from 'firebase/auth';`; if (id === "\0greenmile-maps") return mapsMock; },
  }],
});
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.GREENMILE_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
const vehicles = [
  { id: "vehicle-a", vehicleName: "City EV", batteryId: "test-battery-a", batteryCapacityKWh: 25 },
  { id: "vehicle-b", vehicleName: "Family EV", batteryId: "test-battery-b", batteryCapacityKWh: 40 },
];
const guestVehicles = new Map();
let added = null;
let routeDelay = 0;
let batteryDelay = 0;
let profileDelay = 0;
let failSimulation = false;
let simulationDelay = 0;
let profileRole = null;
let missingHealth = false;
let aiFailure = false;
let failBattery = false;
let auxiliaryDelay = 0;
let failProfile = false;
const calls = [];
const profile = (uid) => ({ id: uid, role: profileRole ?? (uid.startsWith("guest") ? "GUEST" : "USER"), vehicles: uid.startsWith("guest") ? (guestVehicles.has(uid) ? [guestVehicles.get(uid)] : []) : uid === "new-account" ? (added ? [added] : []) : [...vehicles, ...(added ? [added] : [])] });
const routes = [0, 1].map((index) => ({ routeIndex: index, distanceMeters: 8000 + index * 1500, durationSeconds: 1200 + index * 120, estimatedEnergyWh: 900 + index * 100, projectedArrivalSoc: 75 - index, feasible: true, reserveSafe: index === 0, recommended: index === 0, encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@", averageSpeedKmh: 24, finalScore: 1.2 + index, normalTrafficRatio: 0.8, slowTrafficRatio: 0.1, trafficJamRatio: 0.1 }));
routes.forEach((route, index) => { route.batteryStressScore = 0.2 + index * 0.1; });
let returnedRoutes = routes;
let recommendationLevel = "BATTERY_SAFE";
let currentSocOverride = null;
let healthOverride = null;
let routingSoc = 80;
let returnedRecommendedIndex = 0;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
await page.route("**/*", async (interception) => {
  const request = interception.request();
  const url = new URL(request.url());
  if (url.hostname === "nominatim.openstreetmap.org") return interception.fulfill({ json: [{ lat: "23.8", lon: "90.4" }] });
  if (url.hostname !== "127.0.0.1") return interception.abort();
  if (!url.pathname.startsWith("/api/")) return interception.continue();
  const token = request.headers().authorization;
  assert.match(token || "", /^Bearer mock-token-/);
  const uid = token.replace("Bearer mock-token-", "");
  const body = request.method() === "POST" ? request.postDataJSON() : null;
  calls.push({ path: url.pathname, uid, body, batteryId: url.searchParams.get("batteryId") });
  let data;
  if (url.pathname.endsWith("/auth/me")) {
    if (failProfile) return interception.fulfill({ status: 503, json: { message: "Mock profile service unavailable." } });
    data = { user: profile(uid) }; await pause(profileDelay);
  }
  else if (url.pathname.endsWith("/demo/vehicle")) {
    assert.deepEqual(body, {});
    const vehicle = { id: `dedicated-demo-${uid}`, vehicleName: "GreenMile Demo Vehicle", batteryId: `server-generated-test-demo-${uid}`, batteryCapacityKWh: 15 };
    guestVehicles.set(uid, vehicle);
    data = { simulation: true, vehicle };
  } else if (url.pathname.endsWith("/demo/simulate-cycle")) {
    assert.deepEqual(Object.keys(body), ["cycles"]);
    await pause(simulationDelay);
    if (failSimulation) return interception.fulfill({ status: 409, json: { message: "Not enough elapsed time for another chronological demo batch." } });
    data = { vehicle: guestVehicles.get(uid), simulation: true, cyclesCompleted: body.cycles, readingsGenerated: body.cycles * 9, results: [{ automaticSoH: aiFailure ? { error: "AI unavailable" } : {} }] };
  } else if (url.pathname.endsWith("/vehicles")) {
    assert.deepEqual(Object.keys(body).sort(), ["batteryCapacityKWh", "batteryId", "vehicleName"]);
    added = { id: "created-vehicle", ...body }; data = { vehicle: added };
  } else if (url.pathname.endsWith("/routes")) {
    assert.deepEqual(Object.keys(body).sort(), ["batteryId", "destination", "origin"]);
    data = { routes: returnedRoutes, recommendedRouteIndex: returnedRecommendedIndex, battery: { batteryId: body.batteryId, soc: routingSoc, sohPercent: 95, minimumReserveSoc: 20 }, recommendationLevel, recommendationMessage: "Backend recommendation message preserved.", scoring: { note: "Mock prototype calibration note" } };
    await pause(routeDelay);
  } else if (url.pathname.endsWith("/battery/latest")) {
    if (failBattery) return interception.fulfill({ status: 404, json: { message: "No battery readings yet." } });
    data = { batteryId: url.searchParams.get("batteryId"), soc: currentSocOverride ?? (url.searchParams.get("batteryId") === "test-battery-b" ? 60 : 80), temperature: 29, current: -2, power: 8, energyWh: 0.2, chargingStatus: "Discharging", cycleInformation: { equivalentFullCycles: 1.2, completedDischargeCycles: 2, totalDischargedCapacityMah: 2400, ratedCapacityMah: 2000 } };
    if (data.batteryId === "test-battery-a") await pause(batteryDelay);
  } else if (url.pathname.endsWith("/battery/energy-total")) { await pause(auxiliaryDelay); data = { totalEnergyWh: 16 }; }
  else if (url.pathname.endsWith("/ai/soh/latest")) {
    await pause(auxiliaryDelay);
    if (missingHealth) return interception.fulfill({ status: 404, json: { message: "No prediction" } });
    data = { sohPercent: healthOverride ?? 95 };
  } else throw new Error(`Unexpected test endpoint: ${url.pathname}`);
  try { await interception.fulfill({ json: { success: true, data } }); } catch { /* Cancelled requests are expected. */ }
});
let checks = 0;
async function check(name, action) {
  try { await action(); checks++; console.log(`PASS ${name}`); }
  catch (error) { await mkdir("test-artifacts", { recursive: true }); await page.screenshot({ path: "test-artifacts/failure.png" }); throw error; }
}
async function visible(text) { await page.getByText(text, { exact: true }).filter({ visible: true }).first().waitFor(); }
async function search() {
  if (await page.getByRole("button", { name: "Hide Details", exact: true }).count()) await page.getByRole("button", { name: "Hide Details", exact: true }).click();
  if (!await page.getByLabel("Starting Location").isVisible()) await page.getByRole("button", { name: "Edit journey", exact: true }).click();
  await page.getByLabel("Starting Location").fill("Gulshan1"); await page.getByLabel("Destination", { exact: true }).fill("Dhanmondi"); await page.getByRole("button", { name: "Find GreenMile Routes" }).click();
}
async function waitHome() { await page.getByLabel("Active vehicle").waitFor(); }
try {
  await check("Home redirects unauthenticated users", async () => {
    await page.goto("http://127.0.0.1:4178/"); await page.waitForURL("**/login");
    await mkdir("test-artifacts", { recursive: true });
    for (const width of [360, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)); }
    await page.screenshot({ path: "test-artifacts/login-1440.png" });
  });
  await check("Google sign-in and owned vehicles", async () => { await page.getByRole("button", { name: "Continue with Google" }).click(); await waitHome(); assert.equal(await page.getByLabel("Active vehicle").inputValue(), "vehicle-a"); assert.equal(await page.getByRole("button", { name: "Simulate IoT Cycle", exact: true }).count(), 0); });
  await check("Authenticated route response, map geometry, markers and selection", async () => {
    await search(); await visible("Compare GreenMile Routes");
    await page.waitForFunction(() => window.__maps.lines.filter((line) => line.map).length === 2 && window.__maps.markers.filter((marker) => marker.map).length === 2 && window.__maps.fits > 0);
    await page.evaluate(() => window.__maps.lines.filter((line) => line.map)[1].click());
    await page.waitForFunction(() => window.__maps.lines.filter((line) => line.map)[1]?.strokeWeight === 9);
    await page.getByRole("article", { name: "Route 2", exact: true }).getByRole("button", { name: "View Details" }).click(); await visible("Route Score");
    assert.equal(await page.getByText("2.2000", { exact: true }).count(), 1);
  });
  await check("Single-route summaries are neutral, warnings honest, and expansion removed", async () => {
    returnedRoutes = [routes[0]];
    for (const [level, title, state] of [
      ["BATTERY_SAFE", "GreenMile Recommended", "Battery Safe"],
      ["LOW_RESERVE", "Best Available Route", "Low Battery Reserve"],
      ["NO_FEASIBLE_ROUTE", "Not Reachable With Current Charge", "Not Reachable With Current Charge"],
    ]) {
      recommendationLevel = level;
      returnedRoutes = [{ ...routes[0], reserveSafe: level === "BATTERY_SAFE", feasible: level !== "NO_FEASIBLE_ROUTE" }];
      await search(); await visible("GreenMile Route Evaluation"); await visible(title);
      assert(await page.getByRole("article").getByText(state, { exact: false }).count());
      await visible("Only one route was returned for this journey. GreenMile evaluated it using your current battery condition.");
      assert.equal(await page.getByRole("article").count(), 1);
      for (const badge of ["Fastest", "Lowest Energy", "Most Battery-Friendly", "Highest Charge Left"]) assert.equal(await page.getByText(badge, { exact: true }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), level === "NO_FEASIBLE_ROUTE" ? 0 : 1);
      if (level === "NO_FEASIBLE_ROUTE") assert(await page.getByRole("button", { name: "Insufficient Charge", exact: true }).isDisabled());
      await visible("Battery Impact"); await visible("Evaluated");
      for (const label of ["Battery Use", "Charge Left at Arrival", "Battery Safety", "Why this route?"]) await visible(label);
      assert.equal(await page.getByText("Route Score", { exact: true }).count(), 0);
      assert.equal(await page.getByText("0.2000", { exact: true }).count(), 0);
      assert.equal(await page.getByRole("button", { name: /^(Expand|Collapse)$/ }).count(), 0);
      if (level !== "BATTERY_SAFE") assert.equal(await page.getByText(/^(Possible · )?Battery Safe$/).count(), 0);
      if (level !== "BATTERY_SAFE") assert.equal(await page.getByText("GreenMile Recommended", { exact: true }).count(), 0);
    }
    await page.getByRole("article", { name: "Route 1", exact: true }).getByRole("button", { name: "View Details", exact: true }).click();
    await visible("Route Score"); await visible("Battery Impact (raw battery stress score)"); await visible("Static duration"); await visible("Backend recommendation message preserved.");
    await page.getByRole("button", { name: "Hide Details", exact: true }).click();
    assert.equal(await page.getByText("Route Score", { exact: true }).count(), 0);
  });
  await check("Comparison badges are presentation-only; card and button selection still work", async () => {
    recommendationLevel = "BATTERY_SAFE";
    returnedRoutes = [routes[0], { ...routes[1], estimatedEnergyWh: 600, batteryStressScore: 0.1, projectedArrivalSoc: 85 }];
    await search(); await visible("Compare GreenMile Routes");
    const first = page.getByRole("article", { name: "Route 1", exact: true });
    const second = page.getByRole("article", { name: "Route 2", exact: true });
    assert.equal(await first.getByText("Fastest", { exact: true }).count(), 1);
    for (const badge of ["Lowest Energy", "Most Battery-Friendly", "Highest Charge Left"]) assert(await second.getByText(badge, { exact: true }).count());
    await first.getByText("Highest Battery Impact", { exact: true }).waitFor();
    assert.equal(await first.getByText("GreenMile Recommended", { exact: true }).count(), 1);
    assert.equal(await first.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    assert.equal(await page.getByText(/Only one route was returned/).count(), 0);
    await second.getByRole("button", { name: "Select Route", exact: true }).click();
    assert.equal(await second.getByRole("button", { name: "Selected", exact: true }).getAttribute("aria-pressed"), "true");
    await first.getByRole("heading", { name: "Route 1", exact: true }).click();
    assert.equal(await first.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    returnedRoutes = routes;
  });
  await check("Three-route impact comparisons handle middle ranks and ties without thresholds", async () => {
    returnedRoutes = [...routes, { ...routes[1], routeIndex: 2, batteryStressScore: 0.4, finalScore: 3.2 }];
    await search(); await visible("Compare GreenMile Routes");
    const first = page.getByRole("article", { name: "Route 1", exact: true });
    const second = page.getByRole("article", { name: "Route 2", exact: true });
    const third = page.getByRole("article", { name: "Route 3", exact: true });
    assert(await first.getByText("Most Battery-Friendly", { exact: true }).count());
    assert.equal(await second.getByText("Higher Battery Impact", { exact: true }).count(), 1);
    assert.equal(await third.getByText("Highest Battery Impact", { exact: true }).count(), 1);
    returnedRoutes = returnedRoutes.map((route) => ({ ...route, batteryStressScore: 0.2 }));
    await search(); await visible("Compare GreenMile Routes");
    for (const card of await page.getByRole("article").all()) assert(await card.getByText("Most Battery-Friendly", { exact: true }).count());
    assert.equal(await page.getByText("Highest Battery Impact", { exact: true }).count(), 0);
    returnedRoutes = routes;
  });
  await check("Negative arrival estimates stay raw while impossible routes cannot be selected", async () => {
    returnedRoutes = [
      { ...routes[0], projectedArrivalSoc: -13.1, feasible: true, reserveSafe: false },
      { ...routes[1], projectedArrivalSoc: 9, feasible: true, reserveSafe: false },
      { ...routes[0], routeIndex: 2, projectedArrivalSoc: 35, feasible: true, reserveSafe: true },
    ];
    recommendationLevel = "BATTERY_SAFE"; returnedRecommendedIndex = 0;
    await search(); await visible("Compare GreenMile Routes");
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
    returnedRecommendedIndex = 2;
    await search(); await visible("Compare GreenMile Routes");
    const impossible = page.getByRole("article", { name: "Route 1", exact: true });
    const lowReserve = page.getByRole("article", { name: "Route 2", exact: true });
    const safe = page.getByRole("article", { name: "Route 3", exact: true });
    assert(await impossible.getByRole("button", { name: "Insufficient Charge", exact: true }).isDisabled());
    await impossible.getByText("0%", { exact: true }).waitFor();
    await impossible.getByText("Not Reachable With Current Charge", { exact: true }).waitFor();
    await safe.getByRole("button", { name: "Selected", exact: true }).waitFor();
    await impossible.getByRole("heading", { name: "Route 1", exact: true }).click();
    await page.evaluate(() => window.__maps.lines.filter((line) => line.map)[0].click());
    assert.equal(await safe.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    await impossible.getByRole("button", { name: "View Details", exact: true }).click();
    await visible("Estimated Charge Shortfall"); await visible("13.1%");
    assert.equal(await page.getByText("-13.1%", { exact: true }).count(), 0);
    assert.equal(returnedRoutes[0].projectedArrivalSoc, -13.1);
    assert.equal(await safe.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    await page.getByRole("button", { name: "Hide Details", exact: true }).click();
    await lowReserve.getByText("9.0%", { exact: true }).waitFor();
    await lowReserve.getByText("Possible · Low Battery Reserve", { exact: true }).waitFor();
    await lowReserve.getByRole("button", { name: "Select Route", exact: true }).click();
    assert.equal(await lowReserve.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    await safe.getByText("35.0%", { exact: true }).waitFor();
    await safe.getByText("Possible · Battery Safe", { exact: true }).waitFor();
    await safe.getByRole("heading", { name: "Route 3", exact: true }).click();
    assert.equal(await safe.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    returnedRoutes = [{ ...routes[0], feasible: false, projectedArrivalSoc: 2 }];
    recommendationLevel = "NO_FEASIBLE_ROUTE"; returnedRecommendedIndex = 0;
    await search(); await visible("GreenMile Route Evaluation");
    assert(await page.getByRole("button", { name: "Insufficient Charge", exact: true }).isDisabled());
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
    await page.evaluate(() => window.__maps.lines.filter((line) => line.map)[0].click());
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
    returnedRoutes = routes; recommendationLevel = "BATTERY_SAFE";
  });
  await check("Empty battery keeps one/two/three routes informational and health warnings separate", async () => {
    await search(); await visible("Compare GreenMile Routes");
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 1);
    currentSocOverride = 0; healthOverride = 50; routingSoc = 0; recommendationLevel = "NO_FEASIBLE_ROUTE";
    await page.getByRole("button", { name: "Battery details", exact: true }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("dialog").getByText("0.0%", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await visible("Battery Empty — Charge Before Driving");
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
    assert.equal(await page.getByText("⚠ Poor Battery Health", { exact: true }).filter({ visible: true }).count(), 1);
    assert.equal(await page.getByText("⚠ Critically Low Battery", { exact: true }).count(), 0);
    for (const count of [1, 2, 3]) {
      returnedRoutes = Array.from({ length: count }, (_, index) => ({ ...routes[0], routeIndex: index, feasible: false, reserveSafe: false, projectedArrivalSoc: -13.1 - index * 5 }));
      await search(); await visible(count === 1 ? "GreenMile Route Evaluation" : "Compare GreenMile Routes");
      const cards = await page.getByRole("article").all();
      assert.equal(cards.length, count);
      for (const card of cards) {
        assert(await card.getByRole("button", { name: "Insufficient Charge", exact: true }).isDisabled());
        await card.getByText("0%", { exact: true }).waitFor();
        assert.equal(await card.getByText(/^(Possible · )?Battery Safe$/).count(), 0);
      }
      await cards[count - 1].getByRole("button", { name: "View Details", exact: true }).click();
      await visible("Estimated Charge Shortfall"); await visible(`${(13.1 + (count - 1) * 5).toFixed(1)}%`);
      await page.evaluate(() => window.__maps.lines.filter((line) => line.map)[0].click());
      assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => window.__maps.lines.filter((line) => line.map).length), count);
      assert.equal(await page.getByText(/^-\d+(\.\d+)?%$/).count(), 0);
    }
    await page.getByRole("button", { name: "Hide Details", exact: true }).click();
    // Even a stale positive routing snapshot cannot make an empty live battery usable.
    routingSoc = 80; returnedRoutes = [{ ...routes[0], projectedArrivalSoc: 35, feasible: true, reserveSafe: true }]; recommendationLevel = "BATTERY_SAFE";
    await search(); await visible("GreenMile Route Evaluation");
    assert(await page.getByRole("button", { name: "Insufficient Charge", exact: true }).isDisabled());
    assert.equal(await page.getByRole("button", { name: "Selected", exact: true }).count(), 0);
    assert.equal(await page.getByRole("article").getByText("GreenMile Recommended", { exact: true }).count(), 0);
    await page.getByRole("article").getByText("0%", { exact: true }).waitFor();
    // Capture the ordinary empty-battery case; the positive snapshot above is a stale-data guard test.
    returnedRoutes = [{ ...routes[0], projectedArrivalSoc: -13.1, feasible: false, reserveSafe: false }]; recommendationLevel = "NO_FEASIBLE_ROUTE"; routingSoc = 0;
    await search(); await visible("GreenMile Route Evaluation");
    await page.setViewportSize({ width: 360, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: "test-artifacts/battery-empty-360.png" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "test-artifacts/battery-empty-1440.png" });
    await page.getByRole("button", { name: "Insufficient Charge", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-artifacts/battery-empty-card-1440.png" });
    currentSocOverride = null; healthOverride = null; returnedRoutes = routes; recommendationLevel = "BATTERY_SAFE"; routingSoc = 80;
    await page.getByRole("button", { name: "Battery details", exact: true }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click(); await visible("95.0%"); await page.keyboard.press("Escape");
  });
  await check("Vehicle switch clears routes and chooses battery", async () => {
    await page.getByLabel("Active vehicle").selectOption("vehicle-b");
    await page.getByRole("region", { name: "Route results" }).waitFor({ state: "detached" });
    await visible("60%"); assert.equal(await page.evaluate(() => window.__maps.lines.filter((line) => line.map).length), 0);
  });
  await check("Delayed old routes cannot restore after switch; Enter cannot duplicate", async () => {
    routeDelay = 600;
    const before = calls.filter((c) => c.path.endsWith("/routes")).length;
    await search(); await page.getByLabel("Destination", { exact: true }).press("Enter");
    await pause(100); await page.getByLabel("Active vehicle").selectOption("vehicle-a"); await pause(850);
    assert.equal(calls.filter((c) => c.path.endsWith("/routes")).length - before, 1);
    assert.equal(await page.getByRole("region", { name: "Route results" }).count(), 0); routeDelay = 0;
  });
  await check("Delayed old battery response cannot mix vehicles", async () => {
    batteryDelay = 650;
    await page.getByLabel("Active vehicle").selectOption("vehicle-b"); await visible("60%");
    await page.getByLabel("Active vehicle").selectOption("vehicle-a"); await pause(100);
    await page.getByLabel("Active vehicle").selectOption("vehicle-b"); await pause(850); await visible("60%");
    assert.equal(await page.getByText("80%", { exact: true }).count(), 0); batteryDelay = 0;
  });
  await check("Failed reading does not schedule a poll while other requests are unfinished", async () => {
    failBattery = true; auxiliaryDelay = 5700;
    const before = calls.filter((c) => c.path.endsWith("/battery/latest")).length;
    await page.getByLabel("Active vehicle").selectOption("vehicle-a"); await pause(5200);
    assert.equal(calls.filter((c) => c.path.endsWith("/battery/latest")).length - before, 1);
    failBattery = false; auxiliaryDelay = 0; await page.getByLabel("Active vehicle").selectOption("vehicle-b"); await visible("60%");
  });
  await check("Add vehicle modal, owned refresh and automatic selection", async () => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole("button", { name: "Add Vehicle", exact: true }).click();
    const modal = await page.getByRole("dialog").boundingBox(); assert(modal.x >= 0 && modal.x + modal.width <= 360);
    await page.keyboard.press("Escape"); assert.equal(await page.getByRole("dialog").count(), 0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Add Vehicle", exact: true }).click();
    await page.getByLabel("Vehicle name", { exact: true }).fill("Weekend EV"); await page.getByLabel("Battery ID", { exact: true }).fill("test-new-battery");
    await page.getByLabel("Nominal vehicle battery capacity (kWh)").fill("32");
    await page.getByRole("dialog").getByRole("button", { name: "Add Vehicle", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#active-vehicle")?.value === "created-vehicle");
    assert.equal(await page.getByRole("dialog").count(), 0);
  });
  await check("Logout clears profile and routes", async () => { await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL("**/login"); assert.equal(await page.getByLabel("Active vehicle").count(), 0); });
  await check("Email sign-in", async () => { await page.getByLabel("Email", { exact: true }).fill("driver@example.test"); await page.getByLabel("Password", { exact: true }).fill("test-password"); await page.getByRole("button", { name: "Sign in with email" }).click(); await waitHome(); });
  await check("Account response rejected after newer identity", async () => {
    profileDelay = 600; await page.evaluate(() => window.__setAuth("slow-account")); await pause(70);
    profileDelay = 0; await page.evaluate(() => window.__setAuth("guest-b", true)); await waitHome(); await pause(800);
    assert.equal(await page.getByLabel("Active vehicle").inputValue(), "dedicated-demo-guest-b"); await visible("Demo Mode");
  });
  await check("Guest reaches Home with server-prepared isolated vehicle", async () => {
    await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL("**/login");
    guestVehicles.delete("guest-a"); await page.getByRole("button", { name: "Explore as Guest" }).click(); await waitHome();
    await visible("Demo Mode"); assert.equal(await page.getByLabel("Active vehicle").inputValue(), "dedicated-demo-guest-a");
    assert.notEqual(guestVehicles.get("guest-a").batteryId, guestVehicles.get("guest-b").batteryId);
    assert(calls.some((c) => c.uid === "guest-a" && c.path.endsWith("/demo/vehicle")));
    assert.equal(await page.getByRole("button", { name: "Add Vehicle", exact: true }).count(), 0);
  });
  await check("SoH demo sends ten cycles, blocks duplicate clicks and refreshes battery/SoH", async () => {
    const controls = page.getByRole("region", { name: "Demo simulation" });
    assert.equal(await controls.getByRole("button").count(), 1);
    assert.equal(await page.getByRole("button", { name: "Simulate IoT Cycle", exact: true }).count(), 0);
    await visible("Generates the 10-cycle history required by the current SoH model.");
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await controls.evaluate((element) => element.scrollWidth <= element.clientWidth));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    const batteryCount = calls.filter((c) => c.path.endsWith("/battery/latest")).length;
    const healthCount = calls.filter((c) => c.path.endsWith("/ai/soh/latest")).length;
    simulationDelay = 600;
    await controls.getByRole("button", { name: "Prepare SoH Demo (10 Cycles)", exact: true }).click();
    const loading = controls.getByRole("button", { name: "Preparing SoH Demo...", exact: true });
    await loading.waitFor(); assert(await loading.isDisabled());
    await loading.evaluate((button) => { button.click(); button.click(); });
    await page.getByText(/10 demo cycle\(s\) processed · 90 readings/).waitFor();
    simulationDelay = 0;
    await pause(120);
    assert(calls.filter((c) => c.path.endsWith("/battery/latest")).length > batteryCount);
    assert(calls.filter((c) => c.path.endsWith("/ai/soh/latest")).length > healthCount);
    assert.deepEqual(calls.filter((c) => c.path.endsWith("/demo/simulate-cycle")).map((c) => c.body.cycles), [10]);
    assert(await controls.getByRole("button").isEnabled());
  });
  await check("Simulation cooldown and AI partial failure are visible", async () => {
    failSimulation = true; await page.getByRole("button", { name: "Prepare SoH Demo (10 Cycles)", exact: true }).click(); await page.getByText(/Not enough elapsed time/).waitFor();
    failSimulation = false; aiFailure = true; await page.getByRole("button", { name: "Prepare SoH Demo (10 Cycles)", exact: true }).click(); await page.getByText(/Readings saved; AI prediction failed/).waitFor(); aiFailure = false;
  });
  await check("SoH demo controls remain limited to GUEST, DEMO and ADMIN", async () => {
    for (const role of ["DEMO", "ADMIN", "USER"]) {
      profileRole = role;
      await page.evaluate((uid) => window.__setAuth(uid), `role-${role}`); await waitHome();
      assert.equal(await page.getByRole("button", { name: "Prepare SoH Demo (10 Cycles)", exact: true }).count(), role === "USER" ? 0 : 1);
    }
    profileRole = null;
    await page.evaluate(() => window.__setAuth("guest-a", true)); await waitHome();
    assert.equal(await page.getByRole("button", { name: "Prepare SoH Demo (10 Cycles)", exact: true }).count(), 1);
  });
  await check("Seven battery concepts, missing SoH and accessible dialog", async () => {
    missingHealth = true;
    await page.getByRole("button", { name: "Battery details", exact: true }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click(); await visible("AI prediction is not available yet.");
    for (const title of ["Battery Temperature", "State of Charge", "State of Health", "Charging Status", "Energy Consumption", "Cycle Information", "Battery Warnings"]) await visible(title);
    await page.keyboard.press("Escape"); assert.equal(await page.getByRole("dialog").count(), 0); missingHealth = false;
  });
  await check("Responsive two/three-card grids and technical details at 360/768/1024/1440", async () => {
    await mkdir("test-artifacts", { recursive: true });
    for (const count of [2, 3]) {
      returnedRoutes = count === 2 ? routes : [...routes, { ...routes[1], routeIndex: 2, batteryStressScore: 0.4, finalScore: 3.2 }];
      await search(); await visible("Compare GreenMile Routes");
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await pause(100);
      await page.getByRole("region", { name: "Route results" }).evaluate((panel) => { panel.lastElementChild.scrollTop = 0; });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      const active = await page.getByLabel("Active vehicle").boundingBox(); assert(active.x >= 0 && active.x + active.width <= width);
      const cards = await page.getByRole("article").all();
      const boxes = await Promise.all(cards.map((card) => card.boundingBox()));
      assert.equal(boxes.length, count);
      if (width >= 768) { assert(Math.abs(boxes[0].y - boxes[1].y) < 2); assert(boxes[1].x >= boxes[0].x + boxes[0].width); }
      else assert(boxes[1].y >= boxes[0].y + boxes[0].height);
      if (count === 3 && width >= 1024) assert(Math.abs(boxes[0].y - boxes[2].y) < 2);
      if (width >= 1024) {
        assert(await page.getByRole("region", { name: "Route results" }).evaluate((panel) => { const body = panel.lastElementChild; return body.scrollHeight <= body.clientHeight + 1 && panel.getBoundingClientRect().top >= 192; }));
      }
      if (width >= 768) {
        const panel = await page.getByRole("region", { name: "Route results" }).boundingBox();
        const controls = await page.getByRole("button", { name: "Edit journey", exact: true }).boundingBox();
        assert(panel.y > controls.y + controls.height);
        const timeLabels = await Promise.all(cards.slice(0, 2).map((card) => card.getByText("Travel Time", { exact: true }).boundingBox()));
        assert(Math.abs(timeLabels[0].y - timeLabels[1].y) < 2);
      }
      for (const card of cards) {
        const button = await card.getByRole("button", { name: /^(Select Route|Selected)$/ }).boundingBox(); assert(button.height >= 44);
        assert(await card.evaluate((element) => element.scrollWidth <= element.clientWidth));
      }
      await page.screenshot({ path: `test-artifacts/routes-${count}-${width}.png` });
      await page.getByRole("article", { name: "Route 1", exact: true }).getByRole("button", { name: "View Details", exact: true }).click(); await visible("Route Score");
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.getByRole("button", { name: "Hide Details", exact: true }).click();
    }
    }
    returnedRoutes = routes;
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole("button", { name: "Edit journey", exact: true }).click();
    await page.getByRole("region", { name: "Route results" }).waitFor({ state: "hidden" });
    await search(); await visible("Compare GreenMile Routes");
    const status = await page.getByRole("button", { name: "Battery details", exact: true }).filter({ visible: true }).boundingBox();
    assert(status.y + status.height < 640);
    await page.screenshot({ path: "test-artifacts/home-360-short.png" });
  });
  await check("Registration and first-vehicle setup", async () => {
    await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL("**/login");
    await page.getByRole("link", { name: "Create account", exact: true }).click();
    for (const width of [360, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)); }
    await page.getByLabel("Full name", { exact: true }).fill("Test Driver"); await page.getByLabel("Email", { exact: true }).fill("new@example.test");
    await page.getByLabel("Password", { exact: true }).fill("test-password"); await page.getByLabel("Confirm password", { exact: true }).fill("different-password");
    await page.getByRole("button", { name: "Create account", exact: true }).click(); await visible("Passwords do not match.");
    added = null; await page.getByLabel("Confirm password", { exact: true }).fill("test-password"); await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.waitForURL("**/vehicle-setup");
    for (const width of [360, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)); }
    await page.getByLabel("Vehicle name", { exact: true }).fill("First EV"); await page.getByLabel("Battery ID", { exact: true }).fill("first-test-battery"); await page.getByLabel("Nominal vehicle battery capacity (kWh)").fill("28"); await page.getByRole("button", { name: "Add Vehicle", exact: true }).click(); await waitHome();
  });
  await check("Late sign-in completion cannot undo logout", async () => {
    await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL("**/login");
    await page.evaluate(() => { window.__credentialDelay = 450; });
    await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    await pause(60); await page.evaluate(() => window.__setAuth(null)); await pause(650);
    await page.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    assert(page.url().endsWith("/login")); assert.equal(await page.getByLabel("Active vehicle").count(), 0);
    await page.evaluate(() => { window.__credentialDelay = 0; });
  });
  await check("Initial profile failure recovers through retry", async () => {
    failProfile = true; await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    await page.getByRole("link", { name: /GreenMile/ }).click(); await visible("Unable to prepare your account");
    failProfile = false; await page.getByRole("button", { name: "Try again", exact: true }).click(); await waitHome();
    assert(new URL(page.url()).pathname === "/");
  });
  assert.deepEqual(failures, []);
  await writeFile("test-artifacts/results.json", JSON.stringify({ checks, browserErrors: failures, safeMockedOnly: true, requestCount: calls.length }, null, 2));
  console.log(`${checks} checks passed. No real backend, auth, geocoder or Maps calls.`);
} finally { await context.close(); await browser.close(); await server.close(); }

