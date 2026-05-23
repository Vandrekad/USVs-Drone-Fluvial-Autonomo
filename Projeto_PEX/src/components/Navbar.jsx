import nome from "../assets/nome.jpeg";
import { DRONE_ID, NAV_STATE, S } from "../lib/dashboard";

export function Navbar({ status, onEmergency, isMobile }) {
  const ns = NAV_STATE[status?.nav_state] || NAV_STATE.IDLE_HOLDING_POSITION;
  const isOnline = status?.online;

  return (
    <nav
      style={{
        background: "#fff",
        padding: isMobile ? "6px 10px" : "0 26px",
        minHeight: isMobile ? 72 : 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: isMobile ? "wrap" : "nowrap",
        gap: isMobile ? 8 : 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={nome} alt="Logo" style={{ width: isMobile ? 84 : 112, height: isMobile ? 26 : 34, objectFit: "cover" }} />
        </div>
        {!isMobile && <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />}
        {!isMobile && <span style={{ fontSize: 12, color: "#6b7280", ...S.mono }}>ID: {DRONE_ID}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: ns.bg, borderRadius: 20, padding: isMobile ? "4px 10px" : "7px 16px", maxWidth: isMobile ? "52%" : "none" }}>
        {ns.dot && (
          <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: ns.color, animation: "ping 1.5s ease-out infinite", opacity: 0.6 }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ns.color, display: "block" }} />
          </span>
        )}
        <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: ns.color, letterSpacing: "0.06em" }}>{ns.label || "—"}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: isOnline ? "#f0fdf4" : "#fff5f5", borderRadius: 16, padding: isMobile ? "3px 8px" : "6px 14px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? "#10b981" : "#ef4444" }} />
          <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: isOnline ? "#065f46" : "#9b1c1c" }}>{isOnline ? "CONECTADO" : "DESCONECTADO"}</span>
        </div>
        <button
          onClick={onEmergency}
          style={{ ...S.btn("#ef4444", "#fff"), padding: isMobile ? "5px 8px" : "8px 16px", fontSize: isMobile ? 10 : 12, borderRadius: 9 }}
          onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.target.style.opacity = "1")}
        >
          {isMobile ? "PARAR" : "⬛ PARADA DE EMERGÊNCIA"}
        </button>
      </div>
    </nav>
  );
}