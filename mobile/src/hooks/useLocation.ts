import { useEffect, useState } from "react";

export type LocationInfo = {
  label: string;
  lat: number;
  lng: number;
  isMock: boolean;
};

const MOCK_LOCATION: LocationInfo = {
  label: "Home — Hallway",
  lat: 40.7412,
  lng: -73.9896,
  isMock: true,
};

/**
 * TODO(backend): wire to the real capture session. Currently a stub that
 * attempts `expo-location` and always falls back to a neutral mock
 * coordinate so the location card, chip and "Open in Maps" all render.
 *
 * Resolve sequence:
 *  1. Permission + position via expo-location (device only)
 *  2. Mock fallback (Expo Go restriction / simulator / denial)
 */
export function useLocation() {
  const [info, setInfo] = useState<LocationInfo>(MOCK_LOCATION);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return; // keep mock
        const pos = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setInfo({
          label: "Current location",
          lat,
          lng,
          isMock: false,
        });
      } catch {
        // Keep the mock on any failure — UI must never depend on location.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
