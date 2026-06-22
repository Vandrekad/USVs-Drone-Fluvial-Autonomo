import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { equalTo, limitToLast, onValue, orderByChild, push, query, ref, set, update } from "firebase/database";
import { DRONE_ID, BASE_LAT, BASE_LNG, MOCK_ROUTE_PTS } from "../lib/dashboard";
import { getFirebaseHandles } from "../lib/firebase";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTimestamp(value) {
  const parsed = toNumber(value, Math.floor(Date.now() / 1000));
  if (parsed > 1000000000000) {
    return Math.floor(parsed / 1000);
  }
  return Math.floor(parsed);
}

function normalizePoint(point, idx = 0) {
  return {
    idx: toNumber(point?.idx, idx),
    lat: toNumber(point?.lat, BASE_LAT),
    lon: toNumber(point?.lon, BASE_LNG),
  };
}

function normalizeTelemetry(raw) {
  const timestamp = normalizeTimestamp(raw?.timestamp ?? raw?.ts);
  const position = raw?.position ?? {};
  const sensors = raw?.sensors ?? {};
  const actuators = raw?.actuators ?? {};

  return {
    position: {
      lat: toNumber(position?.lat, BASE_LAT),
      lon: toNumber(position?.lon, BASE_LNG),
      heading: toNumber(position?.heading, 145),
    },
    sensors: {
      battery_mv: toNumber(sensors?.battery_mv, 7600),
      obs_dist: toNumber(sensors?.obs_dist, 999),
    },
    actuators: {
      thrust_l: toNumber(actuators?.thrust_l, 0),
      thrust_r: toNumber(actuators?.thrust_r, 0),
    },
    mission_id: raw?.mission_id || "m_live",
    timestamp,
  };
}

function normalizeStatus(raw) {
  const timestamp = normalizeTimestamp(raw?.last_seen ?? raw?.timestamp);
  return {
    online: Boolean(raw?.online),
    last_seen: timestamp,
    active_mission_id: raw?.active_mission_id || raw?.mission_id || "m_live",
    nav_state: raw?.nav_state || "IDLE_HOLDING_POSITION",
    active_leg: toNumber(raw?.active_leg, 0),
    route_progress: Math.max(0, Math.min(1, toNumber(raw?.route_progress, 0))),
    last_position: {
      lat: toNumber(raw?.last_position?.lat, BASE_LAT),
      lon: toNumber(raw?.last_position?.lon, BASE_LNG),
    },
  };
}

function normalizePath(pathValue) {
  if (!pathValue) {
    return [{ lat: BASE_LAT, lon: BASE_LNG }];
  }

  const items = Array.isArray(pathValue)
    ? pathValue.map((point, idx) => ({ ...normalizePoint(point, idx), ts: normalizeTimestamp(point?.ts ?? point?.timestamp ?? idx) }))
    : Object.entries(pathValue).map(([key, point], idx) => ({
        key,
        ...normalizePoint(point, idx),
        ts: normalizeTimestamp(point?.ts ?? point?.timestamp ?? key),
      }));

  return items.sort((left, right) => left.ts - right.ts).map(({ idx, key, ts, ...point }) => point);
}

function normalizeMission(raw, fallbackPosition) {
  if (!raw) {
    return {
      drone_id: DRONE_ID,
      start_time: Math.floor(Date.now() / 1000),
      status: "idle",
      origin: fallbackPosition,
      target: fallbackPosition,
      route: { source: "firebase_realtime", active_leg: 0, points: MOCK_ROUTE_PTS },
      path: {},
    };
  }

  const routePoints = Array.isArray(raw?.route?.points)
    ? raw.route.points.map((point, idx) => normalizePoint(point, idx))
    : MOCK_ROUTE_PTS;

  return {
    drone_id: raw?.drone_id || DRONE_ID,
    start_time: normalizeTimestamp(raw?.start_time),
    status: raw?.status || "active",
    origin: raw?.origin
      ? {
          lat: toNumber(raw.origin.lat, fallbackPosition.lat),
          lon: toNumber(raw.origin.lon, fallbackPosition.lon),
        }
      : fallbackPosition,
    target: raw?.target
      ? {
          lat: toNumber(raw.target.lat, fallbackPosition.lat),
          lon: toNumber(raw.target.lon, fallbackPosition.lon),
        }
      : fallbackPosition,
    route: {
      source: raw?.route?.source || "firebase_realtime",
      version: toNumber(raw?.route?.version, 1),
      active_leg: toNumber(raw?.route?.active_leg ?? raw?.active_leg, 0),
      points: routePoints,
    },
    path: raw?.path || {},
  };
}

function normalizeLogs(snapshot) {
  const items = [];
    snapshot.forEach((child) => {
    const value = child.val() || {};
    const rawType = value.type || value.event_type || "NAV";
    items.push({
      id: child.key,
      type: rawType,
      category: ["obstacle_detected", "connection_lost", "warning", "OBS"].includes(rawType)
        ? "warning"
        : ["emergency_stop", "error", "EMERGENCY"].includes(rawType)
          ? "error"
          : ["connection_restored", "connection", "CONN"].includes(rawType)
            ? "connection"
            : ["mission_started", "mission_complete"].includes(rawType)
              ? "mission_started"
              : "info",
      msg: value.value || value.msg || value.message || rawType || "Evento",
      timestamp: normalizeTimestamp(value.timestamp),
    });
  });

  return items.reverse();
}

export function useFirebaseDrone(options = {}) {
  const handles = useMemo(() => getFirebaseHandles(), []);
  const enabled = Boolean(options.enabled ?? handles);
  const isActive = enabled && Boolean(handles);

  const [telemetry, setTelemetry] = useState({
    position: { lat: BASE_LAT, lon: BASE_LNG, heading: 145 },
    sensors: { battery_mv: 7600, obs_dist: 999 },
    actuators: { thrust_l: 75, thrust_r: 65 },
    mission_id: "m_live",
    timestamp: Math.floor(Date.now() / 1000),
  });
  const [status, setStatus] = useState({
    online: false,
    last_seen: Math.floor(Date.now() / 1000),
    active_mission_id: "m_live",
    nav_state: "IDLE_HOLDING_POSITION",
    active_leg: 0,
    route_progress: 0,
    last_position: { lat: BASE_LAT, lon: BASE_LNG },
  });
  const [mission, setMission] = useState(normalizeMission(null, { lat: BASE_LAT, lon: BASE_LNG }));
  const [logs, setLogs] = useState([]);
  const [path, setPath] = useState([{ lat: BASE_LAT, lon: BASE_LNG }]);
  const [connectionState, setConnectionState] = useState(isActive ? "connecting" : "disabled");
  const [error, setError] = useState("");
  const [activeMissionId, setActiveMissionId] = useState("m_live");

  const hasBootstrapped = useRef(false);
  const latestContext = useRef({
    position: { lat: BASE_LAT, lon: BASE_LNG },
    lastPosition: { lat: BASE_LAT, lon: BASE_LNG },
    missionId: "m_live",
    activeMissionId: "m_live",
  });

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const { auth, db } = handles;
    let disposed = false;

    setConnectionState("connecting");
    signInAnonymously(auth).catch((authError) => {
      if (!disposed) {
        setError(authError.message);
        setConnectionState("error");
      }
    });

    const telemetryRef = ref(db, `drones/${DRONE_ID}/telemetry`);
    const statusRef = ref(db, `drones/${DRONE_ID}/status`);
      const logsRef = query(ref(db, "logs"), orderByChild("timestamp"), limitToLast(100));

    const stopTelemetry = onValue(
      telemetryRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const nextTelemetry = normalizeTelemetry(snapshot.val());
        setTelemetry(nextTelemetry);
        latestContext.current.position = nextTelemetry.position;
        latestContext.current.missionId = nextTelemetry.mission_id;
        setActiveMissionId((current) => nextTelemetry.mission_id || current);
        setConnectionState("connected");
        setError("");
      },
      (listenError) => {
        setError(listenError.message);
        setConnectionState("error");
      }
    );

    const stopStatus = onValue(
      statusRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const nextStatus = normalizeStatus(snapshot.val());
        setStatus(nextStatus);
        latestContext.current.lastPosition = nextStatus.last_position;
        latestContext.current.activeMissionId = nextStatus.active_mission_id;
        setActiveMissionId((current) => nextStatus.active_mission_id || current);
        setConnectionState("connected");
        setError("");
      },
      (listenError) => {
        setError(listenError.message);
        setConnectionState("error");
      }
    );

    const stopLogs = onValue(
      logsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLogs([]);
          return;
        }

          setLogs(normalizeLogs(snapshot).filter((log) => log.drone_id === DRONE_ID));
      },
      (listenError) => {
        setError(listenError.message);
      }
    );

    return () => {
      disposed = true;
      stopTelemetry();
      stopStatus();
      stopLogs();
    };
  }, [handles, isActive]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const { db } = handles;
    const missionId = activeMissionId || latestContext.current.missionId || latestContext.current.activeMissionId;

    if (!missionId) {
      return undefined;
    }

    const missionRef = ref(db, `missions/${missionId}`);

    return onValue(
      missionRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          if (!hasBootstrapped.current) {
            hasBootstrapped.current = true;
          }
          return;
        }

        const nextMission = normalizeMission(snapshot.val(), latestContext.current.lastPosition || { lat: BASE_LAT, lon: BASE_LNG });
        setMission(nextMission);
        setPath(normalizePath(nextMission.path));
        hasBootstrapped.current = true;
      },
      (listenError) => {
        setError(listenError.message);
      }
    );
  }, [activeMissionId, handles, isActive]);

  const writeLog = useCallback(
    async (type, value, missionId) => {
      if (!isActive) {
        return;
      }

      const { db } = handles;
      await set(push(ref(db, "logs")), {
        drone_id: DRONE_ID,
        mission_id: missionId || latestContext.current.missionId || latestContext.current.activeMissionId || "m_live",
        type,
        value,
        timestamp: Math.floor(Date.now() / 1000),
      });
    },
    [activeMissionId, handles, isActive]
  );

  const setDestination = useCallback(
    async (lat, lon) => {
      if (!isActive) {
        return;
      }

      const { db } = handles;
      const timestamp = Math.floor(Date.now() / 1000);
      const basePosition = latestContext.current.position || latestContext.current.lastPosition || { lat: BASE_LAT, lon: BASE_LNG };
      const missionId = `m_${Date.now()}`;
      const commandId = `cmd_${Date.now()}`;
      const midpoint = { lat: (basePosition.lat + lat) / 2, lon: (basePosition.lon + lon) / 2 };
      const routePoints = [
        { idx: 0, lat: basePosition.lat, lon: basePosition.lon },
        { idx: 1, lat: midpoint.lat, lon: midpoint.lon },
        { idx: 2, lat, lon },
      ];

      const missionDoc = {
        drone_id: DRONE_ID,
        start_time: timestamp,
        status: "active",
        origin: basePosition,
        target: { lat, lon },
        route: {
          source: "frontend_set_destination",
          version: 1,
          active_leg: 0,
          points: routePoints,
        },
        path: {
          [`p_${timestamp}`]: { lat: basePosition.lat, lon: basePosition.lon, ts: timestamp },
        },
      };

      const commandDoc = {
        command_id: commandId,
        cmd_type: "set_destination",
        mission_id: missionId,
        target: { lat, lon },
        issued_at: timestamp,
      };

      setMission(missionDoc);
      setPath([{ lat: basePosition.lat, lon: basePosition.lon }]);
      setTelemetry((current) => ({
        ...current,
        mission_id: missionId,
        timestamp,
      }));
      setStatus((current) => ({
        ...current,
        online: true,
        last_seen: timestamp,
        active_mission_id: missionId,
        nav_state: "NAVIGATING_TO_GOAL",
        active_leg: 0,
        route_progress: 0,
        last_position: basePosition,
      }));
      setActiveMissionId(missionId);

      await Promise.all([
        set(ref(db, `missions/${missionId}`), missionDoc),
        set(ref(db, `drones/${DRONE_ID}/command`), commandDoc),
        update(ref(db, `drones/${DRONE_ID}/status`), {
          online: true,
          last_seen: timestamp,
          active_mission_id: missionId,
          nav_state: "NAVIGATING_TO_GOAL",
          active_leg: 0,
          route_progress: 0,
          last_position: basePosition,
        }),
        writeLog("MISSION", `missao_iniciada / destino (${lat.toFixed(4)}, ${lon.toFixed(4)})`, missionId),
      ]);
    },
    [handles, isActive, writeLog]
  );

  const emergencyStop = useCallback(async () => {
    if (!isActive) {
      return;
    }

    const { db } = handles;
    const timestamp = Math.floor(Date.now() / 1000);
    const missionId = activeMissionId || latestContext.current.missionId || latestContext.current.activeMissionId || "m_live";
    const commandId = `cmd_${Date.now()}`;

    const commandDoc = {
      command_id: commandId,
      cmd_type: "emergency_stop",
      mission_id: missionId,
      issued_at: timestamp,
    };

    setStatus((current) => ({
      ...current,
      online: true,
      last_seen: timestamp,
      nav_state: "RETURNING_TO_HOME",
    }));

    await Promise.all([
      set(ref(db, `drones/${DRONE_ID}/command`), commandDoc),
      update(ref(db, `drones/${DRONE_ID}/status`), {
        online: true,
        last_seen: timestamp,
        nav_state: "RETURNING_TO_HOME",
      }),
      writeLog("EMERGENCY", "parada_emergencial / retornando para origem", missionId),
    ]);
  }, [activeMissionId, handles, isActive, writeLog]);

  return {
    telemetry,
    status,
    mission,
    logs,
    path,
    setDestination,
    emergencyStop,
    source: "firebase",
    sourceLabel: "Firebase RTDB",
    connectionState,
    error,
  };
}
