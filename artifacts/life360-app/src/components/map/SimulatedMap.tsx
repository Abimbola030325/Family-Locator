import { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Member } from "@workspace/api-client-react/src/generated/api.schemas";

interface SimulatedMapProps {
  members: Member[];
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

// Auto-fit map bounds when member locations load
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

function MemberPin({ member }: { member: Member }) {
  const battery = member.lastLocation?.batteryLevel ?? null;
  const kmh = speedKmh(member.lastLocation?.speed);
  const initial = member.user.firstName?.[0]?.toUpperCase() || "?";

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      {/* Battery badge */}
      {battery !== null && (
        <div style={{
          position: "absolute",
          top: -8,
          right: -10,
          background: batteryColor(battery),
          color: "white",
          borderRadius: 99,
          padding: "1px 5px",
          fontSize: 9,
          fontWeight: 700,
          border: "1.5px solid white",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          zIndex: 1,
        }}>
          {battery}%
        </div>
      )}

      {/* Avatar circle */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "#16a34a",
        border: "3px solid white",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color: "white",
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
      }}>
        {initial}
      </div>

      {/* Speed badge */}
      {kmh !== null && (
        <div style={{
          marginTop: 4,
          background: "white",
          border: "1px solid #e5e7eb",
          color: "#374151",
          borderRadius: 99,
          padding: "1px 7px",
          fontSize: 9,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}>
          {speedEmoji(kmh)} {kmh} km/h
        </div>
      )}
    </div>
  );
}

export default function SimulatedMap({ members }: SimulatedMapProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={NIGERIA_CENTER}
        defaultZoom={6}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <BoundsController members={members} />

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
            <div style={{ minWidth: 160, fontFamily: "system-ui, sans-serif", padding: "2px 0" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {selectedMember.user.firstName} {selectedMember.user.lastName}
              </div>
              {selectedMember.lastLocation.address && (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  📍 {selectedMember.lastLocation.address}
                </div>
              )}
              {selectedMember.lastLocation.batteryLevel != null && (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  🔋 {selectedMember.lastLocation.batteryLevel}% battery
                </div>
              )}
              {speedKmh(selectedMember.lastLocation.speed) !== null && (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  {speedEmoji(speedKmh(selectedMember.lastLocation.speed)!)} {speedKmh(selectedMember.lastLocation.speed)} km/h
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
                  width: "100%",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Navigate with Google Maps
              </button>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
