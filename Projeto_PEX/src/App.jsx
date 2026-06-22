import { useEffect, useState } from "react";
import { LogsPanel } from "./components/LogsPanel";
import { MapPanel } from "./components/MapPanel";
import { Navbar } from "./components/Navbar";
import { EmergencyModal, SetDestinationModal } from "./components/Modals";
import { TelemetryPanel } from "./components/TelemetryPanel";
import { useDroneData } from "./hooks/useDroneData";
import { useAuthState } from "./hooks/useAuthState";
import { LoginPanel } from "./components/LoginPanel";

export default function App() {
  const { user, loading, refresh } = useAuthState();

  if (loading) {
    return <div style={{padding: 24}}>Carregando...</div>;
  }

  if (!user) {
    return <LoginPanel onLoginSuccess={() => refresh()} />;
  }

  const { telemetry, status, mission, logs, path, setDestination, emergencyStop } = useDroneData();

  const [showDestModal, setShowDestModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [mapClickCoord, setMapClickCoord] = useState(null);
  const [nowTs, setNowTs] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 1024 : false));

  useEffect(() => {
    const syncNow = () => setNowTs(Math.floor(Date.now() / 1000));
    syncNow();
    const timer = setInterval(syncNow, 1000);
    return () => clearInterval(timer);
  }, []);

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
    void setDestination(lat, lon);
    setShowDestModal(false);
    setMapClickCoord(null);
  };

  const handleEmergency = () => setShowStopModal(true);
  const handleConfirmStop = () => {
    void emergencyStop();
    setShowStopModal(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #f1f5f9; font-family: 'DM Sans', sans-serif; color: #0f172a; font-size: 15px; }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          80% { transform: scale(2); opacity: 0; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      <Navbar status={status} onEmergency={handleEmergency} isMobile={isMobile} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
          gridTemplateRows: isMobile ? "auto auto" : "1fr auto",
          gap: isMobile ? 12 : 16,
          padding: isMobile ? 10 : 18,
          height: isMobile ? "auto" : "calc(100vh - 52px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: isMobile ? "auto" : 0 }}>
          <div style={{ flex: 1, minHeight: isMobile ? 290 : 420 }}>
            <MapPanel telemetry={telemetry} mission={mission} path={path} isMobile={isMobile} onMapClick={handleMapClick} />
          </div>
          <LogsPanel logs={logs} />
        </div>

        <div style={{ overflowY: isMobile ? "visible" : "auto" }}>
          <TelemetryPanel
            telemetry={telemetry}
            status={status}
            mission={mission}
            nowTs={nowTs}
            onSetDestination={() => {
              setMapClickCoord(null);
              setShowDestModal(true);
            }}
            onEmergency={handleEmergency}
          />
        </div>
      </div>

      <div
        style={{
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
        }}
      >
        <span>USV-AM MVP</span>
      </div>

      {showDestModal && (
        <SetDestinationModal
          key={mapClickCoord ? `${mapClickCoord.lat},${mapClickCoord.lon}` : "manual"}
          onConfirm={handleConfirmDestination}
          onCancel={() => {
            setShowDestModal(false);
            setMapClickCoord(null);
          }}
          lastPos={telemetry?.position}
          isMobile={isMobile}
          initialLat={mapClickCoord?.lat}
          initialLon={mapClickCoord?.lon}
        />
      )}

      {showStopModal && <EmergencyModal onConfirm={handleConfirmStop} onCancel={() => setShowStopModal(false)} isMobile={isMobile} />}
    </>
  );
}
