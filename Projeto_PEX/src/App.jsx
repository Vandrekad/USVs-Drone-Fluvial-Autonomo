import { useState, useEffect, useRef, useCallback } from "react";
 
// ── Mock data simulation ──────────────────────────────────────────────────────
const BASE_LAT = -3.0610;
const BASE_LNG = -60.0200;
 
const MOCK_WAYPOINTS = [
  { lat: -3.0610, lng: -60.0200 },
  { lat: -3.0618, lng: -60.0192 },
  { lat: -3.0625, lng: -60.0185 },
  { lat: -3.0630, lng: -60.0178 },
];
 
function useMockDrone() {
  const [sensors, setSensors] = useState({
    lat: BASE_LAT, lng: BASE_LNG,
    heading: 42, sonar_cm: 450,
    obstacle: false, ts: Date.now(),
  });
  const [route, setRoute] = useState({
    status: "navigating", current_wp: 1, total_wp: 4,
    waypoints: MOCK_WAYPOINTS,
    history: [{ lat: BASE_LAT, lng: BASE_LNG }],
  });
  const [alerts, setAlerts] = useState([
    { id: 1, type: "info", msg: "Sistema iniciado", ts: Date.now() - 60000 },
    { id: 2, type: "info", msg: "GPS fixado — 7 satélites", ts: Date.now() - 45000 },
  ]);
  const wpIdx = useRef(0);
  const alertId = useRef(3);
 
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        const targetWp = MOCK_WAYPOINTS[Math.min(wpIdx.current, MOCK_WAYPOINTS.length - 1)];
        const newLat = prev.lat + (targetWp.lat - prev.lat) * 0.05;
        const newLng = prev.lng + (targetWp.lng - prev.lng) * 0.05;
        const newSonar = Math.max(80, Math.min(600, prev.sonar_cm + (Math.random() - 0.48) * 30));
        const obstacle = newSonar < 100;
        const dist = Math.sqrt((newLat - targetWp.lat) ** 2 + (newLng - targetWp.lng) ** 2);
        if (dist < 0.00003 && wpIdx.current < MOCK_WAYPOINTS.length - 1) wpIdx.current++;
 
        if (obstacle && !prev.obstacle) {
          setAlerts(a => [{ id: alertId.current++, type: "warning", msg: `Obstáculo detectado a ${newSonar.toFixed(0)}cm`, ts: Date.now() }, ...a].slice(0, 10));
        }
 
        setRoute(r => ({
          ...r,
          current_wp: wpIdx.current,
          status: wpIdx.current >= MOCK_WAYPOINTS.length - 1 ? "arrived" : "navigating",
          history: [...r.history.slice(-60), { lat: newLat, lng: newLng }],
        }));
 
        return { ...prev, lat: newLat, lng: newLng, sonar_cm: newSonar, obstacle, heading: (prev.heading + (Math.random() - 0.5) * 3 + 360) % 360, ts: Date.now() };
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);
 
  const sendWaypoints = useCallback((wps) => {
    setRoute(r => ({ ...r, waypoints: wps, total_wp: wps.length, current_wp: 0 }));
    wpIdx.current = 0;
    setAlerts(a => [{ id: alertId.current++, type: "success", msg: `Nova rota enviada — ${wps.length} waypoints`, ts: Date.now() }, ...a].slice(0, 10));
  }, []);
 
  const emergencyStop = useCallback(() => {
    setRoute(r => ({ ...r, status: "stopped" }));
    setAlerts(a => [{ id: alertId.current++, type: "danger", msg: "PARADA DE EMERGÊNCIA ativada", ts: Date.now() }, ...a].slice(0, 10));
  }, []);
 
  return { sensors, route, alerts, sendWaypoints, emergencyStop };
}
 
// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  return `${Math.floor(s / 3600)}h atrás`;
}
 
function compassLabel(deg) {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}
 
// ── Simple Leaflet-like map using SVG projection ──────────────────────────────
function projectLatLng(lat, lng, centerLat, centerLng, scale, w, h) {
  const x = w / 2 + (lng - centerLng) * scale * Math.cos(centerLat * Math.PI / 180);
  const y = h / 2 - (lat - centerLat) * scale;
  return [x, y];
}
 
function MapPanel({ sensors, route, onAddWaypoint, pendingWPs, onSendRoute, onClear, onStop, routeStatus }) {
  const svgRef = useRef(null);
  const [mapCenter] = useState({ lat: BASE_LAT, lng: BASE_LNG });
  const scale = 110000;
  const W = 620, H = 340;
 
  const proj = (lat, lng) => projectLatLng(lat, lng, mapCenter.lat, mapCenter.lng, scale, W, H);
 
  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const svgX = (px / rect.width) * W;
    const svgY = (py / rect.height) * H;
    const lng = mapCenter.lng + (svgX - W / 2) / (scale * Math.cos(mapCenter.lat * Math.PI / 180));
    const lat = mapCenter.lat - (svgY - H / 2) / scale;
    onAddWaypoint({ lat, lng });
  };
 
  const dronePos = sensors ? proj(sensors.lat, sensors.lng) : [W / 2, H / 2];
  const historyPoints = (route?.history || []).map(p => proj(p.lat, p.lng));
  const waypointPoints = (route?.waypoints || []).map(p => proj(p.lat, p.lng));
  const pendingPoints = pendingWPs.map(p => proj(p.lat, p.lng));
 
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ede8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: "#1a1a18", letterSpacing: "0.02em" }}>MAPA DE NAVEGAÇÃO</span>
        <div style={{ display: "flex", gap: 8 }}>
          {pendingWPs.length > 0 && (
            <>
              <button onClick={onSendRoute} style={btnStyle("#1a1a18", "#fff")}>
                Enviar rota ({pendingWPs.length})
              </button>
              <button onClick={onClear} style={btnStyle("transparent", "#666", "1px solid #ddd")}>
                Limpar
              </button>
            </>
          )}
          <button onClick={onStop} style={btnStyle("#e53e3e", "#fff")}>
            ⬛ Stop
          </button>
        </div>
      </div>
 
      <div style={{ position: "relative", cursor: "crosshair" }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} onClick={handleClick}
          style={{ display: "block", background: "#eef4f0" }}>
 
          {/* Grid lines (mock map texture) */}
          {[...Array(8)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * H / 7} x2={W} y2={i * H / 7} stroke="#d4e8da" strokeWidth={0.5} />
          ))}
          {[...Array(12)].map((_, i) => (
            <line key={`v${i}`} x1={i * W / 11} y1={0} x2={i * W / 11} y2={H} stroke="#d4e8da" strokeWidth={0.5} />
          ))}
 
          {/* "River" background blob */}
          <ellipse cx={310} cy={200} rx={280} ry={55} fill="#c5dff0" opacity={0.5} />
          <ellipse cx={310} cy={200} rx={240} ry={38} fill="#b8d8ee" opacity={0.6} />
 
          {/* Route waypoints line */}
          {waypointPoints.length > 1 && (
            <polyline
              points={waypointPoints.map(p => p.join(",")).join(" ")}
              fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7}
            />
          )}
 
          {/* Drone trail */}
          {historyPoints.length > 1 && (
            <polyline
              points={historyPoints.map(p => p.join(",")).join(" ")}
              fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.5}
            />
          )}
 
          {/* Pending waypoints line */}
          {pendingPoints.length > 1 && (
            <polyline points={pendingPoints.map(p => p.join(",")).join(" ")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
 
          {/* Waypoint markers */}
          {waypointPoints.map(([x, y], i) => (
            <g key={`wp${i}`}>
              <circle cx={x} cy={y} r={5} fill={i < route.current_wp ? "#22c55e" : "#94a3b8"} />
              <text x={x + 8} y={y + 4} fontSize={9} fill="#374151" fontFamily="monospace">WP{i + 1}</text>
            </g>
          ))}
 
          {/* Pending markers */}
          {pendingPoints.map(([x, y], i) => (
            <g key={`pnd${i}`}>
              <circle cx={x} cy={y} r={5} fill="#f59e0b" />
              <text x={x + 8} y={y + 4} fontSize={9} fill="#374151" fontFamily="monospace">P{i + 1}</text>
            </g>
          ))}
 
          {/* Drone marker */}
          {sensors && (() => {
            const [dx, dy] = dronePos;
            const angle = sensors.heading;
            return (
              <g transform={`translate(${dx},${dy})`}>
                <circle cx={0} cy={0} r={14} fill="#2563eb" opacity={0.15} />
                <circle cx={0} cy={0} r={7} fill="#2563eb" />
                <line x1={0} y1={0} x2={Math.sin(angle * Math.PI / 180) * 14} y2={-Math.cos(angle * Math.PI / 180) * 14}
                  stroke="#fff" strokeWidth={2} strokeLinecap="round" />
              </g>
            );
          })()}
 
          {/* Obstacle warning ring */}
          {sensors?.obstacle && (
            <circle cx={dronePos[0]} cy={dronePos[1]} r={22} fill="none" stroke="#e53e3e" strokeWidth={2} opacity={0.8} />
          )}
        </svg>
 
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 11, color: "#6b7280", background: "rgba(255,255,255,0.85)", padding: "3px 8px", borderRadius: 6, fontFamily: "monospace" }}>
          Clique no mapa para adicionar waypoints
        </div>
        <div style={{ position: "absolute", top: 10, right: 12, fontSize: 10, color: "#6b7280", background: "rgba(255,255,255,0.85)", padding: "3px 8px", borderRadius: 6, display: "flex", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} /> Drone
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> Concluído
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} /> Pendente
          </span>
        </div>
      </div>
    </div>
  );
}
 
// ── Styles helpers ─────────────────────────────────────────────────────────────
const btnStyle = (bg, color, border = "none") => ({
  background: bg, color, border, borderRadius: 7,
  padding: "6px 14px", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.01em",
});
 
const cardStyle = {
  background: "#fff",
  border: "1px solid #e8e6e0",
  borderRadius: 12,
  padding: "16px 20px",
};
 
// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  navigating: { label: "Navegando", color: "#2563eb", bg: "#eff6ff" },
  stopped: { label: "Parado", color: "#e53e3e", bg: "#fff5f5" },
  arrived: { label: "Chegou", color: "#16a34a", bg: "#f0fdf4" },
};
 
// ── Alert colors ───────────────────────────────────────────────────────────────
const ALERT_COLORS = {
  info: { dot: "#3b82f6", text: "#1e40af", bg: "#eff6ff" },
  warning: { dot: "#f59e0b", text: "#92400e", bg: "#fffbeb" },
  danger: { dot: "#e53e3e", text: "#9b1c1c", bg: "#fff5f5" },
  success: { dot: "#22c55e", text: "#14532d", bg: "#f0fdf4" },
};
 
// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { sensors, route, alerts, sendWaypoints, emergencyStop } = useMockDrone();
  const [pendingWPs, setPendingWPs] = useState([]);
  const [tick, setTick] = useState(0);
 
  // Re-render alerts timestamps
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 10000);
    return () => clearInterval(t);
  }, []);
 
  const handleAddWaypoint = (wp) => setPendingWPs(prev => [...prev, wp]);
  const handleSendRoute = () => { sendWaypoints(pendingWPs); setPendingWPs([]); };
  const handleClear = () => setPendingWPs([]);
 
  const st = STATUS_CONFIG[route?.status] || STATUS_CONFIG.navigating;
  const progressPct = route ? Math.round((route.current_wp / Math.max(route.total_wp - 1, 1)) * 100) : 0;
 
  const sensorItems = [
    {
      label: "LATITUDE", value: sensors?.lat?.toFixed(6) ?? "—",
      unit: "°", icon: "◎", accent: "#2563eb",
    },
    {
      label: "LONGITUDE", value: sensors?.lng?.toFixed(6) ?? "—",
      unit: "°", icon: "◎", accent: "#2563eb",
    },
    {
      label: "RUMO", value: sensors?.heading?.toFixed(1) ?? "—",
      unit: `° ${compassLabel(sensors?.heading ?? 0)}`, icon: "↑", accent: "#7c3aed",
    },
    {
      label: "SONAR", value: sensors?.sonar_cm?.toFixed(0) ?? "—",
      unit: "cm", icon: "◉",
      accent: sensors?.obstacle ? "#e53e3e" : "#059669",
      alert: sensors?.obstacle,
    },
  ];
 
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f3ef; font-family: 'DM Sans', sans-serif; color: #1a1a18; }
 
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alert-item { animation: fadeIn 0.3s ease; }
 
        .sensor-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .sensor-card { transition: transform 0.15s, box-shadow 0.15s; }
      `}</style>
 
      <div style={{ minHeight: "100vh", padding: "24px 20px" }}>
 
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, background: "#1a1a18", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 16 }}>⛵</span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "#1a1a18" }}>
                USV-AM
              </h1>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", letterSpacing: "0.01em" }}>
              Drone Fluvial Autônomo — Amazonas
            </p>
          </div>
 
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: st.bg, border: `1px solid ${st.color}22`, borderRadius: 20, padding: "6px 14px" }}>
              <div style={{ position: "relative", width: 8, height: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
                {route?.status === "navigating" && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: st.color, animation: "pulse-ring 1.5s ease-out infinite" }} />
                )}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: st.color, letterSpacing: "0.04em" }}>
                {st.label.toUpperCase()}
              </span>
            </div>
 
            <button
              onClick={emergencyStop}
              style={{ ...btnStyle("#1a1a18", "#fff"), padding: "8px 16px", fontSize: 12, borderRadius: 8 }}
            >
              ⬛ Emergência
            </button>
          </div>
        </div>
 
        {/* Sensor cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {sensorItems.map((s) => (
            <div key={s.label} className="sensor-card" style={{
              ...cardStyle,
              borderLeft: `3px solid ${s.accent}`,
              background: s.alert ? "#fff5f5" : "#fff",
              borderColor: s.alert ? "#e53e3e" : "#e8e6e0",
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em", marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: s.alert ? "#e53e3e" : "#1a1a18", letterSpacing: "-0.02em" }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono', monospace" }}>
                  {s.unit}
                </span>
              </div>
              {s.alert && (
                <div style={{ marginTop: 6, fontSize: 10, color: "#e53e3e", fontWeight: 600, letterSpacing: "0.04em" }}>
                  ⚠ OBSTÁCULO DETECTADO
                </div>
              )}
            </div>
          ))}
        </div>
 
        {/* Route progress */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em" }}>PROGRESSO DA ROTA</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#6b7280" }}>
              WP {(route?.current_wp ?? 0) + 1} / {route?.total_wp ?? "—"}
            </span>
          </div>
          <div style={{ height: 6, background: "#f0ede8", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: route?.status === "arrived" ? "#22c55e" : "#2563eb",
              width: `${progressPct}%`,
              transition: "width 0.8s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Início</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{progressPct}% concluído</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Destino</span>
          </div>
        </div>
 
        {/* Map + Alerts side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
 
          {/* Map */}
          <MapPanel
            sensors={sensors}
            route={route}
            onAddWaypoint={handleAddWaypoint}
            pendingWPs={pendingWPs}
            onSendRoute={handleSendRoute}
            onClear={handleClear}
            onStop={emergencyStop}
            routeStatus={route?.status}
          />
 
          {/* Alerts feed */}
          <div style={{ ...cardStyle }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em", marginBottom: 12 }}>
              ALERTAS E EVENTOS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.length === 0 && (
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
                  Sem alertas
                </p>
              )}
              {alerts.map(alert => {
                const c = ALERT_COLORS[alert.type] || ALERT_COLORS.info;
                return (
                  <div key={alert.id} className="alert-item" style={{
                    background: c.bg, borderRadius: 8, padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: c.text, fontWeight: 500, lineHeight: 1.4, wordBreak: "break-word" }}>
                          {alert.msg}
                        </p>
                        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>
                          {timeAgo(alert.ts)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#c4c0b8", fontFamily: "'DM Mono', monospace" }}>
            USV-AM v0.1.0 — Dados simulados (mock)
          </span>
          <span style={{ fontSize: 11, color: "#c4c0b8", fontFamily: "'DM Mono', monospace" }}>
            {new Date().toLocaleString("pt-BR")}
          </span>
        </div>
 
      </div>
    </>
  );
}