import { S, NAV_STATE, batColor, batPct, haversineM, obsDist } from "../lib/dashboard";

export function TelemetryPanel({ telemetry, status, mission, nowTs, onSetDestination, onEmergency }) {
  const bat = batPct(telemetry?.sensors?.battery_mv ?? 7400);
  const bc = batColor(bat);
  const obs = obsDist(telemetry?.sensors?.obs_dist ?? 999);
  const ns = NAV_STATE[status?.nav_state] || NAV_STATE.IDLE_HOLDING_POSITION;
  const pct = Math.round((status?.route_progress ?? 0) * 100);
  const leg = (status?.active_leg ?? 0) + 1;
  const total = mission?.route?.points?.length ?? 1;
  const lastSeen = nowTs && status?.last_seen ? nowTs - status.last_seen : 0;
  const stale = lastSeen > 8;

  const distTotal = mission?.origin && mission?.target ? haversineM(mission.origin.lat, mission.origin.lon, mission.target.lat, mission.target.lon) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...S.card }}>
        <div style={S.label}>Modo operacional</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: ns.bg, borderRadius: 8, padding: "8px 12px" }}>
          {ns.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: ns.color, flexShrink: 0 }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: ns.color, letterSpacing: "0.04em" }}>{ns.label || "—"}</span>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>Bateria</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: bc, ...S.mono }}>{bat}%</span>
          <span style={{ fontSize: 11, color: "#9ca3af", ...S.mono }}>{((telemetry?.sensors?.battery_mv ?? 0) / 1000).toFixed(2)}V</span>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99 }}>
          <div style={{ height: "100%", width: `${bat}%`, background: bc, borderRadius: 99, transition: "width 1s ease" }} />
        </div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={S.label}>Progresso da rota</div>
          <span style={{ fontSize: 11, ...S.mono, color: "#6b7280" }}>Perna {leg}/{total}</span>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, marginBottom: 5 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#3b82f6", borderRadius: 99, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{pct}% concluído</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{distTotal > 0 ? `~${Math.round(distTotal)}m total` : ""}</span>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>Sensor ultrassônico</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${obs.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: obs.color, ...S.mono }}>{obs.label}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: obs.color, ...S.mono }}>{obs.label}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>
              {telemetry?.sensors?.obs_dist < 800 ? "⚠ Obstáculo próximo" : telemetry?.sensors?.obs_dist < 1500 ? "Atenção" : "Caminho livre"}
            </div>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>Atuadores (PWM)</div>
        {[["Motor L", telemetry?.actuators?.thrust_l ?? 0], ["Motor R", telemetry?.actuators?.thrust_r ?? 0]].map(([name, value]) => (
          <div key={name} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{name}</span>
              <span style={{ fontSize: 11, ...S.mono, color: "#374151" }}>{value}</span>
            </div>
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${(value / 255) * 100}%`, background: "#3b82f6", borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...S.card, padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: stale ? "#ef4444" : "#9ca3af" }}>{stale ? "⚠ Sem dados" : `Atualizado ${lastSeen}s atrás`}</span>
          <span style={{ fontSize: 10, ...S.mono, color: "#9ca3af" }}>{telemetry?.timestamp ? new Date(telemetry.timestamp * 1000).toLocaleTimeString("pt-BR") : "—"}</span>
        </div>
      </div>

      <button onClick={onSetDestination} style={{ ...S.btn("#1e293b", "#fff"), padding: "10px", fontSize: 13, borderRadius: 8, textAlign: "center" }} onMouseEnter={(e) => (e.target.style.opacity = "0.88")} onMouseLeave={(e) => (e.target.style.opacity = "1")}>
        ◎ Definir Destino
      </button>
      <button onClick={onEmergency} style={{ ...S.btn("#ef4444", "#fff"), padding: "10px", fontSize: 13, borderRadius: 8, textAlign: "center" }} onMouseEnter={(e) => (e.target.style.opacity = "0.88")} onMouseLeave={(e) => (e.target.style.opacity = "1")}>
        ⬛ Parada de Emergência
      </button>
    </div>
  );
}