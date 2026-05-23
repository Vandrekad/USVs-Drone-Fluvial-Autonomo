import { useRef } from "react";
import { BASE_LAT, BASE_LNG, projectLatLng } from "../lib/dashboard";

export function MapPanel({ telemetry, mission, path, onMapClick, isMobile }) {
  const svgRef = useRef(null);
  const width = 920;
  const height = 520;
  const cLat = BASE_LAT;
  const cLon = BASE_LNG;
  const scale = 90000;

  const proj = (lat, lon) => projectLatLng(lat, lon, cLat, cLon, scale, width, height);

  const handleClick = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * width;
    const sy = ((event.clientY - rect.top) / rect.height) * height;
    const lon = cLon + (sx - width / 2) / (scale * Math.cos((cLat * Math.PI) / 180));
    const lat = cLat - (sy - height / 2) / scale;
    onMapClick(lat, lon);
  };

  const dronePos = telemetry ? proj(telemetry.position.lat, telemetry.position.lon) : [width / 2, height / 2];
  const pathPoints = path.map((point) => proj(point.lat, point.lon));
  const routePoints = (mission?.route?.points || []).map((point) => proj(point.lat, point.lon));
  const activeLeg = mission?.route?.active_leg ?? 0;

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleClick}
        style={{ display: "block", height: isMobile ? "clamp(250px, 46vh, 340px)" : "clamp(360px, 62vh, 640px)", background: "#e8f4ea", cursor: "crosshair" }}
      >
        {[...Array(10)].map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i * height) / 9} x2={width} y2={(i * height) / 9} stroke="#c8e6c9" strokeWidth={0.5} />
        ))}
        {[...Array(14)].map((_, i) => (
          <line key={`v${i}`} x1={(i * width) / 13} y1={0} x2={(i * width) / 13} y2={height} stroke="#c8e6c9" strokeWidth={0.5} />
        ))}

        <ellipse cx={width * 0.5} cy={height * 0.62} rx={width * 0.47} ry={height * 0.17} fill="#93c5fd" opacity={0.4} />
        <ellipse cx={width * 0.5} cy={height * 0.62} rx={width * 0.42} ry={height * 0.125} fill="#60a5fa" opacity={0.35} />
        <ellipse cx={width * 0.25} cy={height * 0.67} rx={width * 0.22} ry={height * 0.11} fill="#60a5fa" opacity={0.2} />
        <text x={width * 0.05} y={height * 0.64} fontSize={10} fill="#1d4ed8" opacity={0.5} fontFamily="monospace">Rio Negro</text>

        {routePoints.length > 1 && (
          <polyline points={routePoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5} />
        )}

        {pathPoints.length > 1 && (
          <polyline points={pathPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
        )}

        {routePoints.map(([x, y], index) => {
          const done = index < activeLeg;
          const active = index === activeLeg;
          return (
            <g key={`wp${index}`}>
              <circle cx={x} cy={y} r={active ? 8 : 6} fill={done ? "#10b981" : active ? "#3b82f6" : "#94a3b8"} stroke="#fff" strokeWidth={1.5} />
              <text x={x} y={y + 4} fontSize={8} textAnchor="middle" fill="#fff" fontFamily="monospace" fontWeight="bold">{index + 1}</text>
            </g>
          );
        })}

        {mission?.target && (() => {
          const [tx, ty] = proj(mission.target.lat, mission.target.lon);
          return (
            <g>
              <circle cx={tx} cy={ty} r={10} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 2" />
              <circle cx={tx} cy={ty} r={4} fill="#8b5cf6" />
              <text x={tx + 13} y={ty + 4} fontSize={9} fill="#8b5cf6" fontFamily="monospace">Destino</text>
            </g>
          );
        })()}

        {telemetry && (() => {
          const [dx, dy] = dronePos;
          const angle = telemetry.position.heading;
          return (
            <g transform={`translate(${dx},${dy})`}>
              <circle r={16} fill="#3b82f6" opacity={0.12} />
              <circle r={8} fill="#1d4ed8" stroke="#fff" strokeWidth={1.5} />
              <line x1={0} y1={0} x2={Math.sin((angle * Math.PI) / 180) * 14} y2={-Math.cos((angle * Math.PI) / 180) * 14} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            </g>
          );
        })()}

        {telemetry?.sensors?.obs_dist < 800 && <circle cx={dronePos[0]} cy={dronePos[1]} r={24} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.8} />}
      </svg>

      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, right: isMobile ? 8 : 10, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: isMobile ? "4px 6px" : "6px 10px", fontSize: isMobile ? 9 : 10, color: "#4b5563", display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap", maxWidth: isMobile ? "68%" : "none" }}>
        {[["#1d4ed8", "Veiculo"], ["#10b981", "Ponto concluido"], ["#3b82f6", "Ponto ativo"], ["#8b5cf6", "Destino"]].map(([color, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} /> {label}
          </span>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, left: isMobile ? 8 : 10, background: "rgba(255,255,255,0.88)", borderRadius: 6, padding: isMobile ? "3px 6px" : "4px 9px", fontSize: isMobile ? 9 : 10, color: "#6b7280", maxWidth: isMobile ? "42%" : "none" }}>
        Clique no mapa para definir destino
      </div>
    </div>
  );
}