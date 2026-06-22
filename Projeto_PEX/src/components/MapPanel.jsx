import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASE_LAT, BASE_LNG, MOCK_ROUTE_PTS } from "../lib/dashboard";

function MapClickListener({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapFollower({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) {
      return;
    }

    map.setView(center, Math.max(map.getZoom(), 14), { animate: true });
  }, [center, map]);

  return null;
}

function createDivIcon({ label, color, background, borderColor, size = 34, rotation = 0 }) {
  return L.divIcon({
    className: "usv-map-marker",
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${background};
        border:2px solid ${borderColor};
        color:${color};
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 8px 18px rgba(15, 23, 42, 0.18);
        transform: rotate(${rotation}deg);
        font-size:${Math.max(12, Math.round(size * 0.42))}px;
        font-weight:700;
      ">${label}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function toLatLng(point) {
  return [point.lat, point.lon];
}

export function MapPanel({ telemetry, mission, path, onMapClick, isMobile }) {
  const routePoints = mission?.route?.points?.length ? mission.route.points : MOCK_ROUTE_PTS;
  const pathPoints = path?.length ? path : [];
  const activeLeg = mission?.route?.active_leg ?? 0;
  const dronePosition = telemetry?.position ? [telemetry.position.lat, telemetry.position.lon] : [BASE_LAT, BASE_LNG];
  const mapCenter = dronePosition;

  const droneIcon = useMemo(
    () =>
      createDivIcon({
        label: "▲",
        color: "#ffffff",
        background: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)",
        borderColor: "#ffffff",
        size: 36,
        rotation: telemetry?.position?.heading ?? 0,
      }),
    [telemetry?.position?.heading]
  );

  const targetIcon = useMemo(
    () =>
      createDivIcon({
        label: "⌖",
        color: "#7c3aed",
        background: "rgba(255,255,255,0.95)",
        borderColor: "#8b5cf6",
        size: 30,
      }),
    []
  );

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        minZoom={11}
        scrollWheelZoom
        style={{ width: "100%", height: isMobile ? "clamp(250px, 46vh, 340px)" : "clamp(360px, 62vh, 640px)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFollower center={mapCenter} />
        <MapClickListener onMapClick={onMapClick} />

        <Polyline positions={routePoints.map(toLatLng)} pathOptions={{ color: "#3b82f6", weight: 3, dashArray: "8 6", opacity: 0.65 }} />
        {pathPoints.length > 1 && <Polyline positions={pathPoints.map(toLatLng)} pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.85 }} />}

        {routePoints.map((point, index) => {
          const current = index === activeLeg;
          const completed = index < activeLeg;

          return (
            <CircleMarker
              key={`${point.idx ?? index}-${point.lat}-${point.lon}`}
              center={toLatLng(point)}
              radius={current ? 10 : 8}
              pathOptions={{
                color: completed ? "#10b981" : current ? "#3b82f6" : "#94a3b8",
                fillColor: completed ? "#10b981" : current ? "#3b82f6" : "#94a3b8",
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent>
                {index + 1}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {mission?.target && (
          <Marker position={[mission.target.lat, mission.target.lon]} icon={targetIcon}>
            <Popup>Destino planejado</Popup>
          </Marker>
        )}

        <Marker position={dronePosition} icon={droneIcon}>
          <Popup>
            <div style={{ display: "grid", gap: 4 }}>
              <strong>USV-AM</strong>
              <span>Rumo: {Math.round(telemetry?.position?.heading ?? 0)}°</span>
              <span>Missao: {mission?.status || "-"}</span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, right: isMobile ? 8 : 10, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: isMobile ? "4px 6px" : "6px 10px", fontSize: isMobile ? 9 : 10, color: "#4b5563", display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap", maxWidth: isMobile ? "68%" : "none" }}>
        {["Veiculo", "Rota", "Pontos", "Destino"].map((label, index) => {
          const colors = ["#1d4ed8", "#3b82f6", "#10b981", "#8b5cf6"];
          return (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[index], display: "inline-block" }} /> {label}
            </span>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, left: isMobile ? 8 : 10, background: "rgba(255,255,255,0.88)", borderRadius: 6, padding: isMobile ? "3px 6px" : "4px 9px", fontSize: isMobile ? 9 : 10, color: "#6b7280", maxWidth: isMobile ? "42%" : "none" }}>
        Clique no mapa para definir destino
      </div>
    </div>
  );
}
