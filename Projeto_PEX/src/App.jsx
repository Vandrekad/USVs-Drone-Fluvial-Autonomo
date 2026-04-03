import { useState, useEffect, useRef, useCallback } from "react";
import nome from "./assets/nome.jpeg"; 
// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const DRONE_ID   = "drone_01";
const BASE_LAT   = -3.1019;
const BASE_LNG   = -60.0250;

// nav_state canônicos conforme manual
const NAV_STATE = {
  NAVIGATING_TO_GOAL:     { label: "Navegando",        color: "#3b82f6", bg: "#eff6ff",  dot: true  },
  IDLE_HOLDING_POSITION:  { label: "Ocioso",            color: "#9ca3af", bg: "#f9fafb",  dot: false },
  OBSTACLE_AVOIDANCE:     { label: "Desviando",         color: "#f59e0b", bg: "#fffbeb",  dot: true  },
  RETURNING_TO_HOME:      { label: "Retornando",        color: "#eab308", bg: "#fefce8",  dot: true  },
  EMERGENCY_STOP:         { label: "Parada emergência", color: "#ef4444", bg: "#fff5f5",  dot: false },
};

// tipos de log → cor/ícone
const LOG_TYPES = {
  NAV:       { color: "#3b82f6", bg: "#eff6ff",  icon: "→",  label: "NAV"     },
  OBS:       { color: "#f59e0b", bg: "#fffbeb",  icon: "⚠",  label: "OBS"     },
  CONN:      { color: "#10b981", bg: "#f0fdf4",  icon: "✓",  label: "CONN"    },
  EMERGENCY: { color: "#ef4444", bg: "#fff5f5",  icon: "!",  label: "EMERG"   },
  MISSION:   { color: "#8b5cf6", bg: "#f5f3ff",  icon: "◉",  label: "MISSÃO"  },
};

// ─── MOCK DATA (substitui Firebase durante dev) ───────────────────────────────
const MOCK_ROUTE_PTS = [
  { idx: 0, lat: BASE_LAT,         lon: BASE_LNG          },
  { idx: 1, lat: BASE_LAT - 0.003, lon: BASE_LNG - 0.004  },
  { idx: 2, lat: BASE_LAT - 0.006, lon: BASE_LNG - 0.007  },
];

function useMockDrone() {
  const [telemetry, setTelemetry] = useState({
    position:   { lat: BASE_LAT, lon: BASE_LNG, heading: 145 },
    sensors:    { battery_mv: 7600, obs_dist: 999 },
    actuators:  { thrust_l: 75, thrust_r: 65 },
    mission_id: "m_mock",
    timestamp:  Math.floor(Date.now() / 1000),
  });
  const [status, setStatus] = useState({
    online: true,
    last_seen: Math.floor(Date.now() / 1000),
    active_mission_id: "m_mock",
    nav_state: "NAVIGATING_TO_GOAL",
    active_leg: 0,
    route_progress: 0,
    last_position: { lat: BASE_LAT, lon: BASE_LNG },
  });
  const [mission, setMission] = useState({
    drone_id: DRONE_ID,
    start_time: Math.floor(Date.now() / 1000),
    status: "active",
    origin: { lat: BASE_LAT, lon: BASE_LNG },
    target: { lat: BASE_LAT - 0.006, lon: BASE_LNG - 0.007 },
    route: { source: "firmware_autonomous", active_leg: 0, points: MOCK_ROUTE_PTS },
    path: {},
  });
  const [logs, setLogs] = useState([
    { id: "l1", type: "MISSION", msg: "missao_iniciada / 3 pontos de rota gerados", timestamp: Date.now() / 1000 - 120 },
    { id: "l2", type: "CONN",    msg: "conexao_restaurada / sincronizacao RTDB",    timestamp: Date.now() / 1000 - 80  },
    { id: "l3", type: "NAV",     msg: "navegando_ao_objetivo / trecho_ativo = 0",   timestamp: Date.now() / 1000 - 40  },
  ]);
  const [path, setPath] = useState([{ lat: BASE_LAT, lon: BASE_LNG }]);

  const legRef      = useRef(0);
  const progressRef = useRef(0);
  const logId       = useRef(4);
  const activeMission = useRef({ ...mission });

  const addLog = useCallback((type, msg) => {
    setLogs(prev => [{
      id: `l${logId.current++}`, type, msg,
      timestamp: Date.now() / 1000
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setTelemetry(prev => {
        const pts  = activeMission.current?.route?.points || MOCK_ROUTE_PTS;
        const leg  = Math.min(legRef.current, pts.length - 1);
        const tgt  = pts[leg];

        const newLat = prev.position.lat + (tgt.lat - prev.position.lat) * 0.04;
        const newLon = prev.position.lon + (tgt.lon - prev.position.lon) * 0.04;
        const newBat = Math.max(6800, prev.sensors.battery_mv - Math.floor(Math.random() * 3));
        const rawObs = Math.max(500, Math.min(2000, prev.sensors.obs_dist + (Math.random() - 0.48) * 80));
        const isObs  = rawObs < 800;

        const dist = Math.hypot(newLat - tgt.lat, newLon - tgt.lon);
        if (dist < 0.0002 && legRef.current < pts.length - 1) {
          legRef.current++;
          addLog("NAV", `navegando_ao_objetivo / trecho_ativo = ${legRef.current}`);
        }
        progressRef.current = Math.min(1, legRef.current / Math.max(pts.length - 1, 1) + (1 - dist / 0.005) / Math.max(pts.length - 1, 1));
        const isDone = legRef.current >= pts.length - 1 && dist < 0.0001;

        if (isObs && prev.sensors.obs_dist >= 800) {
          addLog("OBS", `obstaculo_detectado @ ${(rawObs / 100).toFixed(1)}m`);
        }

        const newNav = isDone ? "IDLE_HOLDING_POSITION" : isObs ? "OBSTACLE_AVOIDANCE" : "NAVIGATING_TO_GOAL";

        setStatus(s => ({
          ...s,
          online:         true,
          last_seen:      Math.floor(Date.now() / 1000),
          nav_state:      newNav,
          active_leg:     legRef.current,
          route_progress: Math.min(1, progressRef.current),
          last_position:  { lat: newLat, lon: newLon },
        }));

        setPath(p => [...p.slice(-80), { lat: newLat, lon: newLon }]);
        setMission(m => ({
          ...m, route: { ...m.route, active_leg: legRef.current },
          status: isDone ? "completed" : "active",
        }));

        return {
          ...prev,
          position:  { lat: newLat, lon: newLon, heading: (prev.position.heading + (Math.random() - 0.5) * 4 + 360) % 360 },
          sensors:   { battery_mv: newBat, obs_dist: rawObs },
          actuators: { thrust_l: 75 + Math.round((Math.random() - 0.5) * 10), thrust_r: 65 + Math.round((Math.random() - 0.5) * 10) },
          timestamp: Math.floor(Date.now() / 1000),
        };
      });
    }, 900);
    return () => clearInterval(tick);
  }, [addLog]);

  const setDestination = useCallback((lat, lon) => {
    const mid = { lat: (BASE_LAT + lat) / 2, lon: (BASE_LNG + lon) / 2 };
    const pts  = [
      { idx: 0, lat: BASE_LAT, lon: BASE_LNG },
      { idx: 1, lat: mid.lat,  lon: mid.lon  },
      { idx: 2, lat,           lon            },
    ];
    legRef.current      = 0;
    progressRef.current = 0;
    const newMission = {
      drone_id:   DRONE_ID,
      start_time: Math.floor(Date.now() / 1000),
      status:     "active",
      origin:     { lat: BASE_LAT, lon: BASE_LNG },
      target:     { lat, lon },
      route:      { source: "firmware_autonomous", active_leg: 0, points: pts },
      path:       {},
    };
    activeMission.current = newMission;
    setMission(newMission);
    setPath([{ lat: BASE_LAT, lon: BASE_LNG }]);
    setStatus(s => ({ ...s, nav_state: "NAVIGATING_TO_GOAL", active_leg: 0, route_progress: 0 }));
    addLog("MISSION", `missao_iniciada / destino (${lat.toFixed(4)}, ${lon.toFixed(4)}) / 3 pontos de rota gerados`);
  }, [addLog]);

  const emergencyStop = useCallback(() => {
    setStatus(s => ({ ...s, nav_state: "RETURNING_TO_HOME" }));
    addLog("EMERGENCY", "parada_emergencial / retornando para origem");
  }, [addLog]);

  return { telemetry, status, mission, logs, path, setDestination, emergencyStop };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function timeStr(ts) {
  return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function batPct(mv) { return Math.max(0, Math.min(100, Math.round((mv - 6600) / (8400 - 6600) * 100))); }

function batColor(pct) {
  if (pct > 60) return "#10b981";
  if (pct > 30) return "#f59e0b";
  return "#ef4444";
}

function obsDist(cm) {
  if (cm > 150) return { label: `${(cm/100).toFixed(1)}m`, color: "#10b981" };
  if (cm > 80)  return { label: `${(cm/100).toFixed(1)}m`, color: "#f59e0b" };
  return { label: `${(cm/100).toFixed(1)}m`, color: "#ef4444" };
}

function projectLatLng(lat, lon, cLat, cLon, scale, W, H) {
  const x = W / 2 + (lon - cLon) * scale * Math.cos(cLat * Math.PI / 180);
  const y = H / 2 - (lat - cLat) * scale;
  return [x, y];
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── ESTILOS COMPARTILHADOS ───────────────────────────────────────────────────
const S = {
  card: {
    background: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
  },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    color: "#9ca3af", marginBottom: 6, textTransform: "uppercase",
  },
  mono: { fontFamily: "'DM Mono', monospace" },
  btn: (bg, fg, border="none") => ({
    background: bg, color: fg, border, borderRadius: 9,
    padding: "9px 18px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.01em",
    transition: "opacity 0.15s, transform 0.1s",
  }),
};

// ─── COMPONENTES ──────────────────────────────────────────────────────────────

// Navbar
function Navbar({ status, onEmergency, isMobile }) {
  const ns  = NAV_STATE[status?.nav_state] || NAV_STATE.IDLE_HOLDING_POSITION;
  const isOnline = status?.online;

  return (
    <nav style={{
      background: "#fff",
      padding: isMobile ? "6px 10px" : "0 26px",
      minHeight: isMobile ? 72 : 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: isMobile ? "wrap" : "nowrap",
      gap: isMobile ? 8 : 0,
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
    }}>
      {/* Esquerda: Logo + ID */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={nome} alt="Logo" style={{ width: isMobile ? 84 : 112, height: isMobile ? 26 : 34, objectFit: "cover" }} />
        </div>
        {!isMobile && <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />}
        {!isMobile && <span style={{ fontSize: 12, color: "#6b7280", ...S.mono }}>ID: {DRONE_ID}</span>}
      </div>

      {/* Centro: nav_state */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: ns.bg, borderRadius: 20, padding: isMobile ? "4px 10px" : "7px 16px", maxWidth: isMobile ? "52%" : "none" }}>
        {ns.dot && (
          <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: ns.color, animation: "ping 1.5s ease-out infinite", opacity: 0.6 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ns.color, display: "block" }} />
          </span>
        )}
        <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: ns.color, letterSpacing: "0.06em" }}>
          {ns.label || "—"}
        </span>
      </div>

      {/* Direita: online + emergency */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: isOnline ? "#f0fdf4" : "#fff5f5", borderRadius: 16, padding: isMobile ? "3px 8px" : "6px 14px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? "#10b981" : "#ef4444" }} />
          <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: isOnline ? "#065f46" : "#9b1c1c" }}>
            {isOnline ? "CONECTADO" : "DESCONECTADO"}
          </span>
        </div>
        <button
          onClick={onEmergency}
          style={{ ...S.btn("#ef4444", "#fff"), padding: isMobile ? "5px 8px" : "8px 16px", fontSize: isMobile ? 10 : 12, borderRadius: 9 }}
          onMouseEnter={e => e.target.style.opacity = "0.85"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          {isMobile ? "PARAR" : "⬛ PARADA DE EMERGENCIA"}
        </button>
      </div>
    </nav>
  );
}

// Mapa SVG
function MapPanel({ telemetry, mission, path, onMapClick, isMobile }) {
  const svgRef = useRef(null);
  const W = 920, H = 520;
  const cLat = BASE_LAT, cLon = BASE_LNG;
  const scale = 90000;

  const proj = (lat, lon) => projectLatLng(lat, lon, cLat, cLon, scale, W, H);

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx   = ((e.clientX - rect.left)  / rect.width)  * W;
    const sy   = ((e.clientY - rect.top)   / rect.height) * H;
    const lon  = cLon + (sx - W/2) / (scale * Math.cos(cLat * Math.PI / 180));
    const lat  = cLat - (sy - H/2) / scale;
    onMapClick(lat, lon);
  };

  const dronePos     = telemetry ? proj(telemetry.position.lat, telemetry.position.lon) : [W/2, H/2];
  const pathPoints   = path.map(p => proj(p.lat, p.lon));
  const routePoints  = (mission?.route?.points || []).map(p => proj(p.lat, p.lon));
  const activeLeg    = mission?.route?.active_leg ?? 0;

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)" }}>
      <svg
        ref={svgRef}
        width="100%" viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        style={{ display: "block", height: isMobile ? "clamp(250px, 46vh, 340px)" : "clamp(360px, 62vh, 640px)", background: "#e8f4ea", cursor: "crosshair" }}
      >
        {/* Grid */}
        {[...Array(10)].map((_, i) => <line key={`h${i}`} x1={0} y1={i*H/9} x2={W} y2={i*H/9} stroke="#c8e6c9" strokeWidth={0.5}/>)}
        {[...Array(14)].map((_, i) => <line key={`v${i}`} x1={i*W/13} y1={0} x2={i*W/13} y2={H} stroke="#c8e6c9" strokeWidth={0.5}/>)}

        {/* Rio Amazonas (blob) */}
        <ellipse cx={W * 0.5} cy={H * 0.62} rx={W * 0.47} ry={H * 0.17} fill="#93c5fd" opacity={0.4}/>
        <ellipse cx={W * 0.5} cy={H * 0.62} rx={W * 0.42} ry={H * 0.125} fill="#60a5fa" opacity={0.35}/>
        <ellipse cx={W * 0.25} cy={H * 0.67} rx={W * 0.22} ry={H * 0.11} fill="#60a5fa" opacity={0.2}/>
        <text x={W * 0.05} y={H * 0.64} fontSize={10} fill="#1d4ed8" opacity={0.5} fontFamily="monospace">Rio Negro</text>
        {/* Rota planejada (firmware) */}
        {routePoints.length > 1 && (
          <polyline
            points={routePoints.map(p => p.join(",")).join(" ")}
            fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5}
          />
        )}

        {/* Trilha GPS percorrida */}
        {pathPoints.length > 1 && (
          <polyline
            points={pathPoints.map(p => p.join(",")).join(" ")}
            fill="none" stroke="#2563eb" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.65}
          />
        )}

        {/* Waypoints */}
        {routePoints.map(([x, y], i) => {
          const done   = i < activeLeg;
          const active = i === activeLeg;
          return (
            <g key={`wp${i}`}>
              <circle cx={x} cy={y} r={active ? 8 : 6}
                fill={done ? "#10b981" : active ? "#3b82f6" : "#94a3b8"}
                stroke="#fff" strokeWidth={1.5}/>
              <text x={x} y={y + 4} fontSize={8} textAnchor="middle" fill="#fff" fontFamily="monospace" fontWeight="bold">{i+1}</text>
            </g>
          );
        })}

        {/* Destino final (target) */}
        {mission?.target && (() => {
          const [tx, ty] = proj(mission.target.lat, mission.target.lon);
          return (
            <g>
              <circle cx={tx} cy={ty} r={10} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 2"/>
              <circle cx={tx} cy={ty} r={4}  fill="#8b5cf6"/>
              <text x={tx+13} y={ty+4} fontSize={9} fill="#8b5cf6" fontFamily="monospace">Destino</text>
            </g>
          );
        })()}

        {/* Drone */}
        {telemetry && (() => {
          const [dx, dy] = dronePos;
          const a = telemetry.position.heading;
          return (
            <g transform={`translate(${dx},${dy})`}>
              <circle r={16} fill="#3b82f6" opacity={0.12}/>
              <circle r={8}  fill="#1d4ed8" stroke="#fff" strokeWidth={1.5}/>
              <line x1={0} y1={0}
                x2={Math.sin(a*Math.PI/180)*14} y2={-Math.cos(a*Math.PI/180)*14}
                stroke="#fff" strokeWidth={2.5} strokeLinecap="round"/>
            </g>
          );
        })()}

        {/* Obstáculo ring */}
        {telemetry?.sensors?.obs_dist < 800 && (
          <circle cx={dronePos[0]} cy={dronePos[1]} r={24}
            fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.8}/>
        )}
      </svg>

      {/* Legenda */}
      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, right: isMobile ? 8 : 10, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: isMobile ? "4px 6px" : "6px 10px", fontSize: isMobile ? 9 : 10, color: "#4b5563", display: "flex", gap: isMobile ? 8 : 12, flexWrap: "wrap", maxWidth: isMobile ? "68%" : "none" }}>
        {[["#1d4ed8","Veiculo"],["#10b981","Ponto concluido"],["#3b82f6","Ponto ativo"],["#8b5cf6","Destino"]].map(([c,l]) => (
          <span key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:c, display:"inline-block" }}/> {l}
          </span>
        ))}
      </div>

      {/* Instrução */}
      <div style={{ position: "absolute", bottom: isMobile ? 8 : 10, left: isMobile ? 8 : 10, background: "rgba(255,255,255,0.88)", borderRadius: 6, padding: isMobile ? "3px 6px" : "4px 9px", fontSize: isMobile ? 9 : 10, color: "#6b7280", maxWidth: isMobile ? "42%" : "none" }}>
        Clique no mapa para definir destino
      </div>
    </div>
  );
}

// Painel de telemetria lateral
function TelemetryPanel({ telemetry, status, mission, onSetDestination, onEmergency }) {
  const bat  = batPct(telemetry?.sensors?.battery_mv ?? 7400);
  const bc   = batColor(bat);
  const obs  = obsDist(telemetry?.sensors?.obs_dist ?? 999);
  const ns   = NAV_STATE[status?.nav_state] || NAV_STATE.IDLE_HOLDING_POSITION;
  const pct  = Math.round((status?.route_progress ?? 0) * 100);
  const leg  = (status?.active_leg ?? 0) + 1;
  const total = (mission?.route?.points?.length) ?? 1;
  const lastSeen = status?.last_seen ? Math.floor(Date.now()/1000) - status.last_seen : 0;
  const stale = lastSeen > 8;

  const distTotal = mission?.origin && mission?.target
    ? haversineM(mission.origin.lat, mission.origin.lon, mission.target.lat, mission.target.lon)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Modo operacional */}
      <div style={{ ...S.card }}>
        <div style={S.label}>Modo operacional</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: ns.bg, borderRadius: 8, padding: "8px 12px" }}>
          {ns.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: ns.color, flexShrink: 0 }}/>}
          <span style={{ fontSize: 12, fontWeight: 700, color: ns.color, letterSpacing: "0.04em" }}>
            {ns.label || "—"}
          </span>
        </div>
      </div>

      {/* Bateria */}
      <div style={S.card}>
        <div style={S.label}>Bateria</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: bc, ...S.mono }}>{bat}%</span>
          <span style={{ fontSize: 11, color: "#9ca3af", ...S.mono }}>
            {((telemetry?.sensors?.battery_mv ?? 0) / 1000).toFixed(2)}V
          </span>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99 }}>
          <div style={{ height: "100%", width: `${bat}%`, background: bc, borderRadius: 99, transition: "width 1s ease" }}/>
        </div>
      </div>

      {/* Progresso da rota */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={S.label}>Progresso da rota</div>
          <span style={{ fontSize: 11, ...S.mono, color: "#6b7280" }}>Perna {leg}/{total}</span>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, marginBottom: 5 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#3b82f6", borderRadius: 99, transition: "width 0.8s ease" }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{pct}% concluído</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>
            {distTotal > 0 ? `~${Math.round(distTotal)}m total` : ""}
          </span>
        </div>
      </div>

      {/* Obstáculo */}
      <div style={S.card}>
        <div style={S.label}>Sensor ultrassônico</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${obs.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: obs.color, ...S.mono }}>{obs.label}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: obs.color, ...S.mono }}>{obs.label}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>
              {telemetry?.sensors?.obs_dist < 800
                ? "⚠ Obstáculo próximo"
                : telemetry?.sensors?.obs_dist < 1500
                ? "Atenção"
                : "Caminho livre"}
            </div>
          </div>
        </div>
      </div>

      {/* Motores */}
      <div style={S.card}>
        <div style={S.label}>Atuadores (PWM)</div>
        {[["Motor L", telemetry?.actuators?.thrust_l ?? 0], ["Motor R", telemetry?.actuators?.thrust_r ?? 0]].map(([name, val]) => (
          <div key={name} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{name}</span>
              <span style={{ fontSize: 11, ...S.mono, color: "#374151" }}>{val}</span>
            </div>
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${(val/255)*100}%`, background: "#3b82f6", borderRadius: 99 }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Última atualização */}
      <div style={{ ...S.card, padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: stale ? "#ef4444" : "#9ca3af" }}>
            {stale ? "⚠ Sem dados" : `Atualizado ${lastSeen}s atrás`}
          </span>
          <span style={{ fontSize: 10, ...S.mono, color: "#9ca3af" }}>
            {telemetry?.timestamp ? new Date(telemetry.timestamp * 1000).toLocaleTimeString("pt-BR") : "—"}
          </span>
        </div>
      </div>

      {/* Botões de ação */}
      <button
        onClick={onSetDestination}
        style={{ ...S.btn("#1e293b", "#fff"), padding: "10px", fontSize: 13, borderRadius: 8, textAlign: "center" }}
        onMouseEnter={e => e.target.style.opacity = "0.88"}
        onMouseLeave={e => e.target.style.opacity = "1"}
      >
        ◎ Definir Destino
      </button>
      <button
        onClick={onEmergency}
        style={{ ...S.btn("#ef4444", "#fff"), padding: "10px", fontSize: 13, borderRadius: 8, textAlign: "center" }}
        onMouseEnter={e => e.target.style.opacity = "0.88"}
        onMouseLeave={e => e.target.style.opacity = "1"}
      >
        ⬛ Parada de Emergencia
      </button>
    </div>
  );
}

// Painel de logs
function LogsPanel({ logs }) {
  const [filter, setFilter] = useState("ALL");

  const warnings = logs.filter(l => l.type === "OBS").length;
  const errors   = logs.filter(l => l.type === "EMERGENCY").length;

  const filtered = logs.filter(l => {
    if (filter === "WARNINGS") return l.type === "OBS";
    if (filter === "ERRORS")   return l.type === "EMERGENCY";
    return true;
  });

  const tabs = [
    { id: "ALL",      label: `Todos (${logs.length})` },
    { id: "WARNINGS", label: `Avisos (${warnings})` },
    { id: "ERRORS",   label: `Erros (${errors})` },
  ];

  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
      {/* Abas */}
      <div style={{ display: "flex", padding: "6px 8px 0" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
            background: filter === tab.id ? "#eff6ff" : "transparent", border: "none",
            padding: "10px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            color: filter === tab.id ? "#3b82f6" : "#9ca3af",
            borderRadius: 8,
            transition: "color 0.15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 210, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
            Sem eventos
          </div>
        ) : filtered.map(log => {
          const t = LOG_TYPES[log.type] || LOG_TYPES.NAV;
          return (
            <div key={log.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "8px 14px",
              animation: "fadeIn 0.25s ease",
            }}>
              <span style={{ fontSize: 10, ...S.mono, color: "#9ca3af", whiteSpace: "nowrap", paddingTop: 1 }}>
                {timeStr(log.timestamp)}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                color: t.color, background: t.bg, borderRadius: 4,
                padding: "2px 5px", whiteSpace: "nowrap", marginTop: 1,
              }}>
                {t.label}
              </span>
              <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.4, flex: 1 }}>
                {log.msg}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Modal: Set Destination
function SetDestinationModal({ onConfirm, onCancel, lastPos, isMobile }) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [err, setErr] = useState("");

  const dist = lat && lon && lastPos
    ? Math.round(haversineM(lastPos.lat, lastPos.lon, parseFloat(lat), parseFloat(lon)))
    : null;

  const confirm = () => {
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) { setErr("Coordenadas inválidas"); return; }
    if (la < -90 || la > 90 || lo < -180 || lo > 180) { setErr("Fora do intervalo válido"); return; }
    onConfirm(la, lo);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 10 : 0 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 28, width: isMobile ? "100%" : 380, maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: isMobile ? "92vh" : "none", overflowY: isMobile ? "auto" : "visible" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Definir Novo Destino</h2>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
          O firmware ira gerar os pontos de rota intermediarios automaticamente.
        </p>

        {[["Latitude", lat, setLat, "-3.1050"], ["Longitude", lon, setLon, "-60.0300"]].map(([label, val, setter, ph]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ ...S.label, marginBottom: 4 }}>{label}</div>
            <input
              type="number" step="0.0001" value={val} placeholder={ph}
              onChange={e => { setter(e.target.value); setErr(""); }}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "none",
                boxShadow: err ? "0 0 0 2px #ef4444 inset" : "0 0 0 1px #d1d5db inset",
                fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}

        {err && <p style={{ fontSize: 11, color: "#ef4444", marginBottom: 10 }}>{err}</p>}

        {dist !== null && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#475569" }}>
            Distância estimada: <strong>{dist}m</strong>
            {dist > 0 && <> · ~{Math.round(dist / 0.5 / 60)} min (0.5 m/s)</>}
          </div>
        )}

        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>
          ou clique diretamente no mapa para selecionar a posição
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ ...S.btn("#f8fafc", "#374151", "none"), flex: 1, padding: "9px" }}>
            Cancelar
          </button>
          <button onClick={confirm} style={{ ...S.btn("#1e293b", "#fff"), flex: 1, padding: "9px" }}>
            Confirmar Destino
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal: Emergency Stop
function EmergencyModal({ onConfirm, onCancel, isMobile }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 10 : 0 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 28, width: isMobile ? "100%" : 340, maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ width: 44, height: 44, background: "#fff5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>⚠</span>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Parar Missão?</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>
          O drone interromperá a navegação e retornará para a origem. Esta ação será registrada nos logs.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}  style={{ ...S.btn("#f8fafc", "#374151", "none"), flex: 1, padding: "9px" }}>
            Não, continuar
          </button>
          <button onClick={onConfirm} style={{ ...S.btn("#ef4444", "#fff"), flex: 1, padding: "9px" }}>
            Sim, parar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { telemetry, status, mission, logs, path, setDestination, emergencyStop } = useMockDrone();

  const [showDestModal, setShowDestModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [mapClickCoord, setMapClickCoord] = useState(null);
  const [tick, setTick]                   = useState(0);
  const [isMobile, setIsMobile]           = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 1024 : false
  );

  // Atualiza timestamps dos logs a cada 15s
  useEffect(() => { const t = setInterval(() => setTick(x => x+1), 15000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleMapClick = (lat, lon) => {
    setMapClickCoord({ lat, lon });
    setShowDestModal(true);
  };

  const handleConfirmDestination = (lat, lon) => {
    setDestination(lat, lon);
    setShowDestModal(false);
    setMapClickCoord(null);
  };

  const handleEmergency = () => setShowStopModal(true);
  const handleConfirmStop = () => { emergencyStop(); setShowStopModal(false); };

  // Pré-preenche lat/lon se veio do clique no mapa
  const destModalKey = mapClickCoord ? `${mapClickCoord.lat},${mapClickCoord.lon}` : "manual";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #f1f5f9; font-family: 'DM Sans', sans-serif; color: #0f172a; font-size: 15px; }
        @keyframes ping {
          0%   { transform: scale(1); opacity: 0.6; }
          80%  { transform: scale(2); opacity: 0; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* Navbar */}
      <Navbar status={status} onEmergency={handleEmergency} isMobile={isMobile}/>

      {/* Main layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
        gridTemplateRows: isMobile ? "auto auto" : "1fr auto",
        gap: isMobile ? 12 : 16,
        padding: isMobile ? 10 : 18,
        height: isMobile ? "auto" : "calc(100vh - 52px)",
      }}>

        {/* COLUNA ESQUERDA: Mapa + Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: isMobile ? "auto" : 0 }}>
          {/* Mapa (flex-grow) */}
          <div style={{ flex: 1, minHeight: isMobile ? 290 : 420 }}>
            <MapPanel
              telemetry={telemetry}
              mission={mission}
              path={path}
              isMobile={isMobile}
              onMapClick={handleMapClick}
            />
          </div>
          {/* Logs */}
          <LogsPanel logs={logs}/>
        </div>

        {/* COLUNA DIREITA: Telemetria */}
        <div style={{ overflowY: isMobile ? "visible" : "auto" }}>
          <TelemetryPanel
            telemetry={telemetry}
            status={status}
            mission={mission}
            onSetDestination={() => { setMapClickCoord(null); setShowDestModal(true); }}
            onEmergency={handleEmergency}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: isMobile ? "static" : "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.9)",
        padding: "4px 16px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        color: "#9ca3af",
        fontFamily: "'DM Mono', monospace",
        marginTop: isMobile ? 6 : 0,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 2 : 0,
        alignItems: isMobile ? "flex-start" : "center",
      }}>
        <span>AruaTech v1.0.0-MVP · {DRONE_ID} · Modo: Simulação</span>
        <span>{new Date().toLocaleString("pt-BR")}</span>
      </div>

      {/* Modais */}
      {showDestModal && (
        <SetDestinationModal
          key={destModalKey}
          onConfirm={handleConfirmDestination}
          onCancel={() => { setShowDestModal(false); setMapClickCoord(null); }}
          lastPos={telemetry?.position}
          isMobile={isMobile}
          initialLat={mapClickCoord?.lat}
          initialLon={mapClickCoord?.lon}
        />
      )}
      {showStopModal && (
        <EmergencyModal
          onConfirm={handleConfirmStop}
          isMobile={isMobile}
          onCancel={() => setShowStopModal(false)}
        />
      )}
    </>
  );
}