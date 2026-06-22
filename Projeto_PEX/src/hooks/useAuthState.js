import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { getFirebaseHandles } from "../lib/firebase";

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("usv_am_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        localStorage.removeItem("usv_am_user");
      }
    }
    setLoading(false);
  }, []);

  const logout = async () => {
    const handles = getFirebaseHandles();
    if (handles?.auth) {
      try {
        await signOut(handles.auth);
      } catch (err) {
        setError(err.message);
      }
    }
    localStorage.removeItem("usv_am_user");
    setUser(null);
  };

  function refresh() {
    const stored = localStorage.getItem("usv_am_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        localStorage.removeItem("usv_am_user");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }

  return { user, loading, error, logout, refresh };
}
