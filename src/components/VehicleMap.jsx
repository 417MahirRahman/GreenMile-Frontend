import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { decodePolyline } from "../utils/polyline";
export default function VehicleMap({ routes, startLocation, destinationLocation, selectedRoute, setSelectedRoute }) {
  const element = useRef(null);
  const [libraries, setLibraries] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let map;
    async function initialize() {
      try {
        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) throw new Error("Google Maps is not configured. Set the frontend Maps key to display the map.");
        setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: "weekly" });
        const [maps, core, marker] = await Promise.all([importLibrary("maps"), importLibrary("core"), importLibrary("marker")]);
        if (cancelled || !element.current) return;
        map = new maps.Map(element.current, { center: { lat: 23.8103, lng: 90.4125 }, zoom: 12, mapTypeControl: false, fullscreenControl: false, streetViewControl: false, zoomControl: true, zoomControlOptions: { position: core.ControlPosition?.LEFT_BOTTOM } });
        setLibraries({ map, maps, core, marker });
      } catch (err) { if (!cancelled) setError(err.message || "Unable to load Google Maps."); }
    }
    initialize();
    return () => { cancelled = true; if (map) { map.unbindAll(); } };
  }, []);
  // Routes use already-loaded libraries: no late asynchronous drawing can restore old geometry.
  useEffect(() => {
    if (!libraries) return;
    const { map, maps, core } = libraries;
    const lines = [];
    const listeners = [];
    const bounds = new core.LatLngBounds();
    const colors = ["#15803d", "#2563eb", "#d97706", "#9333ea", "#dc2626"];
    setError("");
    try {
      routes.forEach((route, index) => {
        const path = decodePolyline(route.encodedPolyline ?? route.polyline?.encodedPolyline ?? "");
        if (!path.length) return;
        const selected = index === selectedRoute;
        const line = new maps.Polyline({ map, path, geodesic: true, strokeColor: colors[index % colors.length], strokeWeight: selected ? 9 : 6, strokeOpacity: selected ? 1 : 0.7, zIndex: selected ? 100 : index + 10 });
        lines.push(line); listeners.push(line.addListener("click", () => setSelectedRoute(index)));
        path.forEach((point) => bounds.extend(point));
      });
      if (lines.length) map.fitBounds(bounds, { top: 100, left: window.innerWidth >= 768 ? 410 : 35, right: 35, bottom: window.innerWidth >= 768 ? 100 : 290 });
    } catch { setError("A returned route has invalid geometry. Route summaries remain available."); }
    return () => { listeners.forEach((listener) => listener.remove()); lines.forEach((line) => line.setMap(null)); };
  }, [libraries, routes, selectedRoute, setSelectedRoute]);
  useEffect(() => {
    if (!libraries) return;
    const markers = [[startLocation, "Start"], [destinationLocation, "Destination"]]
      .filter(([position]) => position).map(([position, title]) => new libraries.marker.Marker({ map: libraries.map, position, title }));
    return () => markers.forEach((marker) => marker.setMap(null));
  }, [libraries, startLocation, destinationLocation]);
  return <div className="absolute inset-0 bg-slate-200" aria-label="Journey map"><div ref={element} className="h-full w-full" />{error && <p role="alert" className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-xl bg-white p-3 text-xs text-red-700 shadow-lg md:max-w-sm">{error}</p>}</div>;
}
