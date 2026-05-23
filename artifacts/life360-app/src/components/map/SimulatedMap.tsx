import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Member } from "@workspace/api-client-react/src/generated/api.schemas";

interface SimulatedMapProps {
  members: Member[];
}

// Default center: middle of Nigeria
const NIGERIA_CENTER: [number, number] = [9.082, 8.676];
const DEFAULT_ZOOM = 6;

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

function makePinIcon(member: Member): L.DivIcon {
  const battery  = member.lastLocation?.batteryLevel ?? null;
  const kmh      = speedKmh(member.lastLocation?.speed);
  const initial  = member.user.firstName?.[0]?.toUpperCase() || "?";
  const isLowBat = battery !== null && battery <= 25;
  const ringColor = isLowBat ? "#ef4444" : "#16a34a";

  const batteryBadge = battery !== null
    ? `<div style="
        position:absolute;top:-6px;right:-8px;
        background:${batteryColor(battery)};
        color:white;border-radius:99px;
        padding:1px 5px;font-size:9px;font-weight:700;
        white-space:nowrap;border:1.5px solid white;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
      ">${battery}%</div>`
    : "";

  const speedBadge = kmh !== null
    ? `<div style="
        position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);
        background:white;border:1px solid #e5e7eb;
        color:#374151;border-radius:99px;
        padding:1px 6px;font-size:9px;font-weight:600;
        white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);
      ">${speedEmoji(kmh)} ${kmh} km/h</div>`
    : "";

  const html = `
    <div style="position:relative;width:48px;">
      <div style="
        width:44px;height:44px;border-radius:50%;
        background:#16a34a;border:3px solid ${ringColor};
        box-shadow:0 2px 10px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;font-weight:700;color:white;
        cursor:pointer;
        font-family:system-ui,sans-serif;
      ">
        ${initial}
      </div>
      ${batteryBadge}
      ${speedBadge}
    </div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize:   [48, 48],
    iconAnchor: [24, 24],
    popupAnchor:[0, -28],
  });
}

// Auto-fit map to member locations whenever they change
function BoundsController({ members }: { members: Member[] }) {
  const map   = useMap();
  const first = useRef(true);

  useEffect(() => {
    const coords = members
      .filter(m => m.lastLocation)
      .map(m => [m.lastLocation!.latitude, m.lastLocation!.longitude] as [number, number]);

    if (coords.length === 0) return;

    if (first.current || coords.length === 1) {
      map.setView(coords[0], 13);
      first.current = false;
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 14 });
      first.current = false;
    }
  }, [members, map]);

  return null;
}

export default function SimulatedMap({ members }: SimulatedMapProps) {
  return (
    <MapContainer
      center={NIGERIA_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
    >
      {/* Free OpenStreetMap tiles — no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BoundsController members={members} />

      {members.map(member => {
        const loc = member.lastLocation;
        if (!loc) return null;

        const lat  = loc.latitude;
        const lng  = loc.longitude;
        const kmh  = speedKmh(loc.speed);
        const icon = makePinIcon(member);

        return (
          <Marker
            key={member.id}
            position={[lat, lng]}
            icon={icon}
          >
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "system-ui,sans-serif" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {member.user.firstName} {member.user.lastName}
                </div>
                {loc.address && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    📍 {loc.address}
                  </div>
                )}
                {loc.batteryLevel != null && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    🔋 {loc.batteryLevel}% battery
                  </div>
                )}
                {kmh !== null && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    {kmh >= 25 ? "🚗" : kmh >= 10 ? "🛵" : "🚶"} {kmh} km/h
                  </div>
                )}
                <button
                  onClick={() => openGoogleMaps(lat, lng)}
                  style={{
                    width: "100%",
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Navigate with Google Maps
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
