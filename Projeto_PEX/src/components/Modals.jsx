import { useState } from "react";
import { S, haversineM } from "../lib/dashboard";

export function SetDestinationModal({ onConfirm, onCancel, lastPos, isMobile, initialLat = "", initialLon = "" }) {
  const [lat, setLat] = useState(() => (initialLat === null || initialLat === undefined ? "" : String(initialLat)));
  const [lon, setLon] = useState(() => (initialLon === null || initialLon === undefined ? "" : String(initialLon)));
  const [err, setErr] = useState("");

  const dist = lat && lon && lastPos ? Math.round(haversineM(lastPos.lat, lastPos.lon, parseFloat(lat), parseFloat(lon))) : null;

  const confirm = () => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (Number.isNaN(la) || Number.isNaN(lo)) {
      setErr("Coordenadas inválidas");
      return;
    }
    if (la < -90 || la > 90 || lo < -180 || lo > 180) {
      setErr("Fora do intervalo válido");
      return;
    }
    onConfirm(la, lo);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 10 : 0 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 28, width: isMobile ? "100%" : 380, maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: isMobile ? "92vh" : "none", overflowY: isMobile ? "auto" : "visible" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Definir Novo Destino</h2>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>O firmware ira gerar os pontos de rota intermediarios automaticamente.</p>

        {[["Latitude", lat, setLat, "-3.1050"], ["Longitude", lon, setLon, "-60.0300"]].map(([label, value, setter, placeholder]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ ...S.label, marginBottom: 4 }}>{label}</div>
            <input
              type="number"
              step="0.0001"
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                setter(event.target.value);
                setErr("");
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                boxShadow: err ? "0 0 0 2px #ef4444 inset" : "0 0 0 1px #d1d5db inset",
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                outline: "none",
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

        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>ou clique diretamente no mapa para selecionar a posição</p>

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

export function EmergencyModal({ onConfirm, onCancel, isMobile }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 10 : 0 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 28, width: isMobile ? "100%" : 340, maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ width: 44, height: 44, background: "#fff5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>⚠</span>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Parar Missão?</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>O drone interromperá a navegação e retornará para a origem. Esta ação será registrada nos logs.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ ...S.btn("#f8fafc", "#374151", "none"), flex: 1, padding: "9px" }}>
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