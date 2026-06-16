import { useEffect, useRef, useCallback, useState } from "react";
import { useUpdateMyLocation } from "@workspace/api-client-react";
import { useBattery } from "./useBattery";

const MIN_INTERVAL_MS = 30_000; // at most once per 30 s
const MIN_DISTANCE_M  = 40;    // or at least 40 m of movement

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { "Accept-Language": "en", "User-Agent": "WhereYouDey/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export interface AutoTrackState {
  isTracking:  boolean;
  lastUpdate:  Date | null;
  error:       string | null;
  batteryLevel: number | null;
  charging:    boolean;
}

export function useAutoTrack(enabled: boolean): AutoTrackState {
  const updateLocation = useUpdateMyLocation();
  const watchIdRef     = useRef<number | null>(null);
  const lastPostedRef  = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const { level: batteryLevel, charging } = useBattery();
  const batteryRef = useRef<number | null>(batteryLevel);

  // Keep a ref so postLocation always reads the latest battery value
  useEffect(() => { batteryRef.current = batteryLevel; }, [batteryLevel]);

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const postLocation = useCallback(
    async (lat: number, lng: number, accuracy: number, speed: number | null) => {
      const now  = Date.now();
      const prev = lastPostedRef.current;

      if (prev) {
        const dt   = now - prev.time;
        const dist = haversine(prev.lat, prev.lng, lat, lng);
        if (dt < MIN_INTERVAL_MS && dist < MIN_DISTANCE_M) return;
      }

      lastPostedRef.current = { lat, lng, time: now };
      setLastUpdate(new Date());
      setError(null);

      const address = await reverseGeocode(lat, lng);

      updateLocation.mutate(
        {
          data: {
            latitude:     lat,
            longitude:    lng,
            accuracy,
            speed:        speed ?? undefined,
            batteryLevel: batteryRef.current ?? undefined,
            address:      address ?? undefined,
          },
        },
        { onError: () => setError("Failed to share location") }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported on this device");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setIsWatching(true);
        setError(null);
        postLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.speed
        );
      },
      (err) => {
        setError(err.code === 1 ? "Location permission denied" : "Could not get location");
        setIsWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    setIsWatching(true);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsWatching(false);
      }
    };
  }, [enabled, postLocation]);

  return { isTracking: enabled && isWatching, lastUpdate, error, batteryLevel, charging };
}
