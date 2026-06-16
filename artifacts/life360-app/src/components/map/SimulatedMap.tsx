import { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Member, LocationRecord } from "@workspace/api-client-react/src/generated/api.schemas";
import { useGetMemberTrail } from "@workspace/api-client-react";

interface SimulatedMapProps {
  members: Member[];
  circleId?: number;
}

const NIGERIA_CENTER = { lat: 9.082, lng: 8.676 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

function openGoogleMaps(lat: number, lng: number) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    "_blank",
    "noopener,noreferrer"
  );
}

function batteryColor(level: number): string {
  if (level <= 10) return "#ef4444";
  if (level <= 25) return "#f97316";
  if (level <= 50) return "#eab308";
  return "#22c55e";
}

function speedKmh(speed: number | null | undefined): number | null {
  if (speed == null || speed < 0) return null;
  const kmh = speed * 3.6;
  return kmh >= 3 ? Math.round(kmh) : null;
}

function speedEmoji(kmh: number): string {
  if (kmh >= 25) return "🚗";
  if (kmh >= 10) return "🛵";
  return "🚶";
}

function BoundsController({ members }: { members: Member[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;
    const coords = members
      .filter((m) => m.lastLocation)
      .map((m) => ({
        lat: m.lastLocation!.latitude,
        lng: m.lastLocation!.longitude,
      }));

    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setCenter(coords[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, 80);
  }, [map, members]);

  return null;
}

function TrailPolyline({ trail }: { trail: LocationRecord[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || trail.length < 2) return;

    const path = [...trail].reverse().map((l) => ({ lat: l.latitude, lng: l.longitude }));

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#16a34a",
      strokeOpacity: 0.75,
      strokeWeight: 3,
    });
    polyline.setMap(map);

    const dots = trail.slice(1).map((l) =>
      new window.google.maps.Circle({
        center: { lat: l.latitude, lng: l.longitude },
        radius: 8,
        strokeColor: "#16a34a",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#16a34a",
        fillOpacity: 0.4,
        map,
      })
    );

    return () => {
      polyline.setMap(null);
      dots.forEach((d) => d.setMap(null));
    };
  }, [map, trail]);

  return null;
}

function MemberPin({ member }: { member: Member }) {
  const battery = member.lastLocation?.batteryLevel ?? null;
  const kmh = speedKmh(member.lastLocation?.speed);
  const initial = member.user.firstName?.[0]?.toUpperCase() || "?";

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      {battery !== null && (
        <div style={{
          position: "absolute", top: -8, right: -10,
          background: batteryColor(battery), color: "white",
          borderRadius: 99, padding: "1px 5px", fontSize: 9, fontWeight: 700,
          border: "1.5px solid white", whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)", zIndex: 1,
        }}>
          {battery}%
        </div>
      )}

      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "#16a34a", border: "3px solid white",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700, color: "white",
        fontFamily: "system-ui, sans-serif", cursor: "pointer",
      }}>
        {initial}
      </div>

      {kmh !== null && (
        <div style={{
          marginTop: 4, background: "white", border: "1px solid #e5e7eb",
          color: "#374151", borderRadius: 99, padding: "1px 7px",
          fontSize: 9, fontWeight: 600, whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}>
          {speedEmoji(kmh)} {kmh} km/h
        </div>
      )}
    </div>
  );
}

function MapWithTrail({ members, circleId, selectedId, setSelectedId }: {
  members: Member[];
  circleId?: number;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
}) {
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  const { data: trail } = useGetMemberTrail(
    circleId ?? 0,
    selectedId ?? 0,
    { query: { enabled: !!circleId && !!selectedId } }
  );

  return (
    <Map
      style={{ width: "100%", height: "100%" }}
      defaultCenter={NIGERIA_CENTER}
      defaultZoom={6}
      mapId="DEMO_MAP_ID"
      gestureHandling="greedy"
      disableDefaultUI={false}
    >
      <BoundsController members={members} />

      {trail && trail.length >= 2 && <TrailPolyline trail={trail} />}

      {members.map((member) => {
        const loc = member.lastLocation;
        if (!loc) return null;

        return (
          <AdvancedMarker
            key={member.id}
            position={{ lat: loc.latitude, lng: loc.longitude }}
            onClick={() => setSelectedId(member.id === selectedId ? null : member.id)}
          >
            <MemberPin member={member} />
          </AdvancedMarker>
        );
      })}

      {selectedMember?.lastLocation && (
        <InfoWindow
          position={{
            lat: selectedMember.lastLocation.latitude,
            lng: selectedMember.lastLocation.longitude,
          }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -60]}
        >
          <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif", padding: "2px 0" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              {selectedMember.user.firstName} {selectedMember.user.lastName}
            </div>
            {selectedMember.lastLocation.address && (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                📍 {selectedMember.lastLocation.address}
              </div>
            )}
            {selectedMember.lastLocation.batteryLevel != null && (
              <div style={{ fontSize: 12, color: selectedMember.lastLocation.batteryLevel <= 20 ? "#ef4444" : "#6b7280", marginBottom: 4 }}>
                🔋 {selectedMember.lastLocation.batteryLevel}% battery
                {selectedMember.lastLocation.batteryLevel <= 20 && " ⚠️ Low!"}
              </div>
            )}
            {speedKmh(selectedMember.lastLocation.speed) !== null && (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                {speedEmoji(speedKmh(selectedMember.lastLocation.speed)!)} {speedKmh(selectedMember.lastLocation.speed)} km/h
              </div>
            )}
            {trail && trail.length >= 2 && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                📍 Showing last {trail.length} locations
              </div>
            )}
            <button
              onClick={() =>
                openGoogleMaps(
                  selectedMember.lastLocation!.latitude,
                  selectedMember.lastLocation!.longitude
                )
              }
              style={{
                width: "100%", background: "#16a34a", color: "white",
                border: "none", borderRadius: 6, padding: "7px 12px",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Navigate with Google Maps
            </button>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

export default function SimulatedMap({ members, circleId }: SimulatedMapProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <APIProvider apiKey={API_KEY}>
      <MapWithTrail
        members={members}
        circleId={circleId}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
    </APIProvider>
  );
}
