import { useCallback, useEffect, useRef, useState } from "react";
import { getLatestBatteryReading, getLatestSoH, getTotalEnergyConsumption } from "../api/batteryApi";
const empty = { battery: null, totalEnergy: null, soh: null, sohError: "", loading: false, error: "", updatedAt: null };
export function useBatteryData(batteryId) {
  const [snapshot, setSnapshot] = useState({ ...empty, batteryId });
  const [revision, setRevision] = useState(0);
  const work = useRef(null);
  const refresh = useCallback(() => { work.current?.abort(); setRevision((value) => value + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    work.current = controller;
    let timer;
    setSnapshot({ ...empty, batteryId, loading: Boolean(batteryId) });
    async function poll() {
      try {
        const options = { signal: controller.signal };
        const [reading, energy, health] = await Promise.allSettled([
          getLatestBatteryReading(batteryId, options), getTotalEnergyConsumption(batteryId, options),
          getLatestSoH(batteryId, options),
        ]);
        if (controller.signal.aborted) return;
        if (reading.status === "rejected") throw reading.reason;
        if (energy.status === "rejected") throw energy.reason;
        const battery = reading.value;
        const percent = health.value?.sohPercent;
        setSnapshot({ ...empty, batteryId, battery, totalEnergy: energy.value?.totalEnergyWh ?? null,
          soh: percent != null && Number.isFinite(Number(percent)) ? Number(percent) : null,
          sohError: health.status === "rejected" && health.reason.status !== 404 ? health.reason.message : "", updatedAt: Date.now(),
        });
      } catch (err) {
        if (!controller.signal.aborted) setSnapshot({ ...empty, batteryId, error: err.message });
      } finally {
        // Schedule after completion: a slow network cannot overlap polls.
        if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
      }
    }
    if (batteryId) poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [batteryId, revision]);
  // Hide the old snapshot in the very render that changes vehicle, before effects.
  return { ...(snapshot.batteryId === batteryId ? snapshot : { ...empty, loading: Boolean(batteryId) }), refresh };
}
