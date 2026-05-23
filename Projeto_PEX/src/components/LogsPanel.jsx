import { useState } from "react";
import { LOG_TYPES, S, timeStr } from "../lib/dashboard";

export function LogsPanel({ logs }) {
  const [filter, setFilter] = useState("ALL");

  const warnings = logs.filter((log) => log.type === "OBS").length;
  const errors = logs.filter((log) => log.type === "EMERGENCY").length;

  const filtered = logs.filter((log) => {
    if (filter === "WARNINGS") return log.type === "OBS";
    if (filter === "ERRORS") return log.type === "EMERGENCY";
    return true;
  });

  const tabs = [
    { id: "ALL", label: `Todos (${logs.length})` },
    { id: "WARNINGS", label: `Avisos (${warnings})` },
    { id: "ERRORS", label: `Erros (${errors})` },
  ];

  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", padding: "6px 8px 0" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              background: filter === tab.id ? "#eff6ff" : "transparent",
              border: "none",
              padding: "10px 12px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              color: filter === tab.id ? "#3b82f6" : "#9ca3af",
              borderRadius: 8,
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 210, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>Sem eventos</div>
        ) : (
          filtered.map((log) => {
            const t = LOG_TYPES[log.type] || LOG_TYPES.NAV;
            return (
              <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 14px", animation: "fadeIn 0.25s ease" }}>
                <span style={{ fontSize: 10, ...S.mono, color: "#9ca3af", whiteSpace: "nowrap", paddingTop: 1 }}>{timeStr(log.timestamp)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: t.color, background: t.bg, borderRadius: 4, padding: "2px 5px", whiteSpace: "nowrap", marginTop: 1 }}>
                  {t.label}
                </span>
                <span style={{ fontSize: 11, color: "#374151", lineHeight: 1.4, flex: 1 }}>{log.msg}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}