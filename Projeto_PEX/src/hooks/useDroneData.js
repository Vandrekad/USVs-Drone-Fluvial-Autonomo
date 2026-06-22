import { useEffect } from "react";
import { useFirebaseDrone } from "./useFirebaseDrone";
import { useMockDrone } from "./useMockDrone";
import { getFirebaseHandles } from "../lib/firebase";

export function useDroneData(opts = {}) {
  const handles = getFirebaseHandles();
  const useFirebaseMode = Boolean(handles);

  const enabled = Boolean(opts.enabled ?? true);
  const firebase = useFirebaseDrone({ enabled: enabled && useFirebaseMode });
  const mock = useMockDrone({ enabled: enabled && !useFirebaseMode });

  useEffect(() => {
    const source = useFirebaseMode ? "firebase" : "mock";
    window.__USV_AM_DATA_SOURCE__ = source;
    console.info(`[USV-AM] data source: ${source}`);
  }, [useFirebaseMode]);

  return useFirebaseMode ? firebase : mock;
}
