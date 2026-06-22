import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseHandles } from "../lib/firebase";

export function LoginPanel({ onLoginSuccess }) {
  const [email, setEmail] = useState("operador@usv-am.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const handles = getFirebaseHandles();
      if (!handles) {
        setError("Firebase não configurado");
        setLoading(false);
        return;
      }

      const { auth } = handles;
      const result = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("usv_am_user", JSON.stringify({ uid: result.user.uid, email: result.user.email }));
      onLoginSuccess?.();
    } catch (err) {
      setError(err.message || "Falha ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)",
          padding: 48,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>USV-AM Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>Autenticação de Operador</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: 14,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#f9fafb",
                color: "#0f172a",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background-color 0.15s",
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Digite sua senha"
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: 14,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#f9fafb",
                color: "#0f172a",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background-color 0.15s",
                opacity: loading ? 0.6 : 1,
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {error && <div style={{ padding: 12, background: "#fff5f5", borderRadius: 8, fontSize: 12, color: "#ef4444", borderLeft: "3px solid #ef4444" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              background: loading || !email || !password ? "#cbd5e1" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              cursor: loading || !email || !password ? "not-allowed" : "pointer",
              transition: "background-color 0.15s, transform 0.1s",
              opacity: loading ? 0.8 : 1,
            }}
            onMouseDown={(e) => !loading && (e.target.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
          >
            {loading ? "Conectando..." : "Entrar"}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: "16px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 12, color: "#1d4ed8", borderLeft: "3px solid #3b82f6" }}>
          <strong>Demo:</strong> Use `operador@usv-am.local` com sua senha ou dados mockados se Firebase não estiver configurado.
        </div>
      </div>
    </div>
  );
}
