import { useCallback, useEffect, useRef, useState } from "react";
import { geocodePlace } from "../utils/GeoCodingPlace";
import { searchRoutes } from "../api/routeApi";
import { isBatteryEmpty, isRouteSelectable } from "../utils/routeFormatting";
const empty = { routes: [], selectedRoute: null, recommendedRouteIndex: null, routeBatteryInfo: null, recommendationLevel: "", recommendationMessage: "", scoring: null, startLocation: null, destinationLocation: null, loading: false, error: "" };
export function useRouteSearch(batteryId, currentSoc) {
  const [startPlace, setStartPlace] = useState("");
  const [destinationPlace, setDestinationPlace] = useState("");
  const [state, setState] = useState({ ...empty, batteryId });
  const work = useRef(null);
  useEffect(() => {
    setState({ ...empty, batteryId });
    return () => { work.current?.abort(); work.current = null; };
  }, [batteryId]);
  const findRoutes = async (event) => {
    event?.preventDefault();
    if (work.current) return;
    if (!batteryId || !startPlace.trim() || !destinationPlace.trim()) {
      setState({ ...empty, batteryId, error: "Select a vehicle and enter both locations." }); return;
    }
    const controller = new AbortController();
    work.current = controller;
    setState({ ...empty, batteryId, loading: true });
    try {
      const start = await geocodePlace(startPlace, { signal: controller.signal });
      const destination = await geocodePlace(destinationPlace, { signal: controller.signal });
      const coords = (point) => {
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) throw new Error("Invalid coordinates returned from geocoding.");
        return { latitude: point.lat, longitude: point.lng };
      };
      const data = await searchRoutes({ batteryId, origin: coords(start), destination: coords(destination) }, { signal: controller.signal });
      if (controller.signal.aborted || work.current !== controller) return;
      const routes = data.routes || [];
      const recommended = routes.findIndex((route) => route.routeIndex === data.recommendedRouteIndex);
      const initialSelection = routes.length ? Math.max(0, recommended) : null;
      setState({ ...empty, batteryId, routes, selectedRoute: isRouteSelectable(routes[initialSelection], currentSoc ?? data.battery?.soc) ? initialSelection : null,
        recommendedRouteIndex: data.recommendedRouteIndex ?? null, routeBatteryInfo: data.battery || null,
        recommendationLevel: data.recommendationLevel || "", recommendationMessage: data.recommendationMessage || "",
        scoring: data.scoring, startLocation: start, destinationLocation: destination,
        error: routes.length ? "" : "No routes returned. Try different locations.",
      });
      return routes.length > 0;
    } catch (err) {
      if (!controller.signal.aborted && work.current === controller) setState({ ...empty, batteryId, error: err.message });
    } finally { if (work.current === controller) work.current = null; }
  };
  const setSelectedRoute = useCallback((index) => {
    setState((previous) => isRouteSelectable(previous.routes[index], currentSoc ?? previous.routeBatteryInfo?.soc) ? { ...previous, selectedRoute: index } : previous);
  }, [currentSoc]);
  const visibleState = state.batteryId === batteryId ? state : empty;
  const soc = currentSoc ?? visibleState.routeBatteryInfo?.soc;
  const selectedRoute = isRouteSelectable(visibleState.routes[visibleState.selectedRoute], soc) ? visibleState.selectedRoute : null;
  return { ...visibleState, selectedRoute, currentSoc: soc, batteryEmpty: isBatteryEmpty(soc), startPlace, setStartPlace, destinationPlace, setDestinationPlace, findRoutes, setSelectedRoute };
}
