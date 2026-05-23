import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_LAT, BASE_LNG, DRONE_ID, MOCK_ROUTE_PTS } from "../lib/dashboard";

const INITIAL_TS = Math.floor(Date.now() / 1000);

export function useMockDrone() {
  const [telemetry, setTelemetry] = useState({
    position: { lat: BASE_LAT, lon: BASE_LNG, heading: 145 },
    sensors: { battery_mv: 7600, obs_dist: 999 },
    actuators: { thrust_l: 75, thrust_r: 65 },
    mission_id: "m_mock",
    timestamp: INITIAL_TS,
  });
  const [status, setStatus] = useState({
    online: true,
    last_seen: INITIAL_TS,
    active_mission_id: "m_mock",
    nav_state: "NAVIGATING_TO_GOAL",
    active_leg: 0,
    route_progress: 0,
    last_position: { lat: BASE_LAT, lon: BASE_LNG },
  });
  const [mission, setMission] = useState({
    drone_id: DRONE_ID,
    start_time: INITIAL_TS,
    status: "active",
    origin: { lat: BASE_LAT, lon: BASE_LNG },
    target: { lat: BASE_LAT - 0.006, lon: BASE_LNG - 0.007 },
    route: { source: "firmware_autonomous", active_leg: 0, points: MOCK_ROUTE_PTS },
    path: {},
  });
  const [logs, setLogs] = useState([
    { id: "l1", type: "MISSION", msg: "missao_iniciada / 3 pontos de rota gerados", timestamp: INITIAL_TS - 120 },
    { id: "l2", type: "CONN", msg: "conexao_restaurada / sincronizacao RTDB", timestamp: INITIAL_TS - 80 },
    { id: "l3", type: "NAV", msg: "navegando_ao_objetivo / trecho_ativo = 0", timestamp: INITIAL_TS - 40 },
  ]);
  const [path, setPath] = useState([{ lat: BASE_LAT, lon: BASE_LNG }]);

  const legRef = useRef(0);
  const progressRef = useRef(0);
  const logId = useRef(4);
  const activeMission = useRef({ ...mission });

  const addLog = useCallback((type, msg) => {
    setLogs((prev) => [{ id: `l${logId.current++}`, type, msg, timestamp: Math.floor(Date.now() / 1000) }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setTelemetry((prev) => {
        const pts = activeMission.current?.route?.points || MOCK_ROUTE_PTS;
        const leg = Math.min(legRef.current, pts.length - 1);
        const tgt = pts[leg];

        const newLat = prev.position.lat + (tgt.lat - prev.position.lat) * 0.04;
        const newLon = prev.position.lon + (tgt.lon - prev.position.lon) * 0.04;
        const newBat = Math.max(6800, prev.sensors.battery_mv - Math.floor(Math.random() * 3));
        const rawObs = Math.max(500, Math.min(2000, prev.sensors.obs_dist + (Math.random() - 0.48) * 80));
        const isObs = rawObs < 800;

        const dist = Math.hypot(newLat - tgt.lat, newLon - tgt.lon);
        if (dist < 0.0002 && legRef.current < pts.length - 1) {
          legRef.current += 1;
          addLog("NAV", `navegando_ao_objetivo / trecho_ativo = ${legRef.current}`);
        }

        progressRef.current = Math.min(1, legRef.current / Math.max(pts.length - 1, 1) + (1 - dist / 0.005) / Math.max(pts.length - 1, 1));
        const isDone = legRef.current >= pts.length - 1 && dist < 0.0001;

        if (isObs && prev.sensors.obs_dist >= 800) {
          addLog("OBS", `obstaculo_detectado @ ${(rawObs / 100).toFixed(1)}m`);
        }

        const newNav = isDone ? "IDLE_HOLDING_POSITION" : isObs ? "OBSTACLE_AVOIDANCE" : "NAVIGATING_TO_GOAL";

        setStatus((current) => ({
          ...current,
          online: true,
          last_seen: Math.floor(Date.now() / 1000),
          nav_state: newNav,
          active_leg: legRef.current,
          route_progress: Math.min(1, progressRef.current),
          last_position: { lat: newLat, lon: newLon },
        }));

        setPath((current) => [...current.slice(-80), { lat: newLat, lon: newLon }]);
        setMission((current) => ({ ...current, route: { ...current.route, active_leg: legRef.current }, status: isDone ? "completed" : "active" }));

        return {
          ...prev,
          position: { lat: newLat, lon: newLon, heading: (prev.position.heading + (Math.random() - 0.5) * 4 + 360) % 360 },
          sensors: { battery_mv: newBat, obs_dist: rawObs },
          actuators: { thrust_l: 75 + Math.round((Math.random() - 0.5) * 10), thrust_r: 65 + Math.round((Math.random() - 0.5) * 10) },
          timestamp: Math.floor(Date.now() / 1000),
        };
      });
    }, 900);

    return () => clearInterval(tick);
  }, [addLog]);

  const setDestination = useCallback(
    (lat, lon) => {
      const mid = { lat: (BASE_LAT + lat) / 2, lon: (BASE_LNG + lon) / 2 };
      const pts = [
        { idx: 0, lat: BASE_LAT, lon: BASE_LNG },
        { idx: 1, lat: mid.lat, lon: mid.lon },
        { idx: 2, lat, lon },
      ];

      legRef.current = 0;
      progressRef.current = 0;
      const newMission = {
        drone_id: DRONE_ID,
        start_time: Math.floor(Date.now() / 1000),
        status: "active",
        origin: { lat: BASE_LAT, lon: BASE_LNG },
        target: { lat, lon },
        route: { source: "firmware_autonomous", active_leg: 0, points: pts },
        path: {},
      };
      activeMission.current = newMission;
      setMission(newMission);
      setPath([{ lat: BASE_LAT, lon: BASE_LNG }]);
      setStatus((current) => ({ ...current, nav_state: "NAVIGATING_TO_GOAL", active_leg: 0, route_progress: 0 }));
      addLog("MISSION", `missao_iniciada / destino (${lat.toFixed(4)}, ${lon.toFixed(4)}) / 3 pontos de rota gerados`);
    },
    [addLog]
  );

  const emergencyStop = useCallback(() => {
    setStatus((current) => ({ ...current, nav_state: "RETURNING_TO_HOME" }));
    addLog("EMERGENCY", "parada_emergencial / retornando para origem");
  }, [addLog]);

  return { telemetry, status, mission, logs, path, setDestination, emergencyStop };
}