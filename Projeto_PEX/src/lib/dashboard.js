export const DRONE_ID = "drone_01";
export const BASE_LAT = -3.1019;
export const BASE_LNG = -60.0250;

export const NAV_STATE = {
  NAVIGATING_TO_GOAL: { label: "Navegando", color: "#3b82f6", bg: "#eff6ff", dot: true },
  IDLE_HOLDING_POSITION: { label: "Ocioso", color: "#9ca3af", bg: "#f9fafb", dot: false },
  OBSTACLE_AVOIDANCE: { label: "Desviando", color: "#f59e0b", bg: "#fffbeb", dot: true },
  RETURNING_TO_HOME: { label: "Retornando", color: "#eab308", bg: "#fefce8", dot: true },
  EMERGENCY_STOP: { label: "Parada emergência", color: "#ef4444", bg: "#fff5f5", dot: false },
};

export const LOG_TYPES = {
  NAV: { color: "#3b82f6", bg: "#eff6ff", icon: "→", label: "NAV" },
  MISSION: { color: "#8b5cf6", bg: "#f5f3ff", icon: "◉", label: "MISSÃO" },
  CONN: { color: "#10b981", bg: "#f0fdf4", icon: "✓", label: "CONN" },
  OBS: { color: "#f59e0b", bg: "#fffbeb", icon: "⚠", label: "OBS" },
  EMERGENCY: { color: "#ef4444", bg: "#fff5f5", icon: "!", label: "EMERG" },
  mission_started: { color: "#8b5cf6", bg: "#f5f3ff", icon: "◉", label: "MISSÃO" },
  navigating_to_goal: { color: "#3b82f6", bg: "#eff6ff", icon: "→", label: "NAV" },
  leg_complete: { color: "#10b981", bg: "#f0fdf4", icon: "✓", label: "PERNA" },
  obstacle_detected: { color: "#f59e0b", bg: "#fffbeb", icon: "⚠", label: "OBS" },
  connection_lost: { color: "#ef4444", bg: "#fff5f5", icon: "!", label: "CONN" },
  connection_restored: { color: "#10b981", bg: "#f0fdf4", icon: "✓", label: "CONN" },
  emergency_stop: { color: "#ef4444", bg: "#fff5f5", icon: "!", label: "EMERG" },
  returning_to_home: { color: "#eab308", bg: "#fefce8", icon: "↩", label: "HOME" },
  mission_complete: { color: "#10b981", bg: "#f0fdf4", icon: "✓", label: "MISSÃO" },
  offline_buffer_flush: { color: "#0ea5e9", bg: "#ecfeff", icon: "⇄", label: "SYNC" },
  error: { color: "#ef4444", bg: "#fff5f5", icon: "!", label: "ERRO" },
  connection: { color: "#10b981", bg: "#f0fdf4", icon: "✓", label: "CONN" },
  warning: { color: "#f59e0b", bg: "#fffbeb", icon: "⚠", label: "AVISO" },
  info: { color: "#3b82f6", bg: "#eff6ff", icon: "i", label: "INFO" },
};

export const MOCK_ROUTE_PTS = [
  { idx: 0, lat: BASE_LAT, lon: BASE_LNG },
  { idx: 1, lat: BASE_LAT - 0.003, lon: BASE_LNG - 0.004 },
  { idx: 2, lat: BASE_LAT - 0.006, lon: BASE_LNG - 0.007 },
];

export const S = {
  card: {
    background: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#9ca3af",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  mono: { fontFamily: "'DM Mono', monospace" },
  btn: (bg, fg, border = "none") => ({
    background: bg,
    color: fg,
    border,
    borderRadius: 9,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "opacity 0.15s, transform 0.1s",
  }),
};

export function timeStr(ts) {
  return new Date(ts * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function batPct(mv) {
  return Math.max(0, Math.min(100, Math.round(((mv - 6600) / (8400 - 6600)) * 100)));
}

export function batColor(pct) {
  if (pct > 60) return "#10b981";
  if (pct > 30) return "#f59e0b";
  return "#ef4444";
}

export function obsDist(cm) {
  if (cm > 150) return { label: `${(cm / 100).toFixed(1)}m`, color: "#10b981" };
  if (cm > 80) return { label: `${(cm / 100).toFixed(1)}m`, color: "#f59e0b" };
  return { label: `${(cm / 100).toFixed(1)}m`, color: "#ef4444" };
}

export function projectLatLng(lat, lon, cLat, cLon, scale, width, height) {
  const x = width / 2 + (lon - cLon) * scale * Math.cos((cLat * Math.PI) / 180);
  const y = height / 2 - (lat - cLat) * scale;
  return [x, y];
}

export function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}