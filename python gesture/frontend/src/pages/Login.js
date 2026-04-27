import React, { useState } from "react";
import axios from "axios";

export default function Login({ setAuth }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backendUrl = "http://localhost:5000";

  const login = async () => {
    if (!user || !pass) {
      setError("Please enter both username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${backendUrl}/login`, {
        username: user,
        password: pass
      });

      localStorage.setItem("token", res.data.token);
      setAuth(true);
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h2 style={styles.title}>Secure Access</h2>
          <p style={styles.subtitle}>Gesture Control System v1.0</p>
        </div>

        <div style={styles.inputGroup}>
          <input 
            style={styles.input} 
            placeholder="Username" 
            value={user}
            name="username"
            autoComplete="username"
            onChange={e => setUser(e.target.value)} 
          />
          <input 
            type="password" 
            style={styles.input} 
            placeholder="Password" 
            value={pass}
            name="password"
            autoComplete="current-password"
            onChange={e => setPass(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && login()}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button 
          id="login-button"
          style={{...styles.button, opacity: loading ? 0.7 : 1}} 
          onClick={login}
          disabled={loading}
        >
          {loading ? "AUTHENTICATING..." : "SIGN IN"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0a0a0f",
    backgroundImage: "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 40%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  glassCard: {
    background: "rgba(17, 17, 25, 0.8)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "28px",
    padding: "48px 32px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
    textAlign: "center",
  },
  header: {
    marginBottom: "40px",
  },
  icon: {
    fontSize: "48px",
    marginBottom: "16px",
    display: "block",
  },
  title: {
    color: "#fff",
    fontSize: "26px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "14px",
    margin: 0,
    fontWeight: "400",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px",
  },
  input: {
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "14px",
    padding: "16px",
    color: "#fff",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s, background-color 0.2s",
    boxSizing: "border-box",
  },
  error: {
    color: "#ff5f5f",
    fontSize: "14px",
    marginBottom: "20px",
    minHeight: "20px",
  },
  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 8px 20px -5px rgba(79, 70, 229, 0.4)",
  }
};