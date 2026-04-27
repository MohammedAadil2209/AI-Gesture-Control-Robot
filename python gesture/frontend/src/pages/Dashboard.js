import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

// Use specific transports to solve "Offline" status issues
const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  timeout: 10000,
});

export default function Dashboard() {
  const [cmd, setCmd] = useState("STOP");
  const [speed, setSpeed] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      console.log("CORE LINK ESTABLISHED");
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("CORE LINK TERMINATED");
      setConnected(false);
    };

    const handleData = (data) => {
      setCmd(data.cmd || "STOP");
      setSpeed(data.speed || 0);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("data", handleData);

    // Initial check for existing connection
    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("data", handleData);
    };
  }, []);

  const sendCommand = useCallback((c) => {
    console.log("Dispatching command:", c);
    socket.emit("manual", { cmd: c });
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.scanline}></div>
      
      {/* HEADER SECTION */}
      <header style={styles.topBar}>
        <div style={styles.brandContainer}>
          <div style={styles.logoBox}>
            <span style={styles.logoIcon}>🤖</span>
          </div>
          <div style={styles.titleGroup}>
            <h1 style={styles.mainTitle}>NEXORA <span style={styles.accentText}>GS-1</span></h1>
            <p style={styles.subtitle}>TACTICAL GESTURE INTERFACE</p>
          </div>
        </div>

        <div style={styles.sysStatus}>
          <div style={{...styles.statusChip, borderColor: connected ? "#00ffcc" : "#ff3e3e"}}>
            <div style={{...styles.statusDot, background: connected ? "#00ffcc" : "#ff3e3e", boxShadow: connected ? "0 0 10px #00ffcc" : "0 0 10px #ff3e3e"}}></div>
            <span style={{...styles.statusText, color: connected ? "#00ffcc" : "#ff3e3e"}}>
              {connected ? "NEURAL LINK ACTIVE" : "LINK OFFLINE"}
            </span>
          </div>
          <button style={styles.killBtn} onClick={logout}>DISCONNECT</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={styles.layout}>
        {/* LEFT COLUMN: TELEMETRY & CONTROLS */}
        <div style={styles.sidePanel}>
          <div style={styles.frame}>
            <div style={styles.frameHeader}>CORE TELEMETRY</div>
            
            <div style={styles.telemetryGroup}>
              <div style={styles.dataCard}>
                <label style={styles.label}>MOTION VECTOR</label>
                <div style={{...styles.vectorValue, color: cmd === "STOP" ? "#ff3e3e" : "#00f2ff"}}>
                  {cmd}
                </div>
              </div>

              <div style={styles.dataCard}>
                <label style={styles.label}>PROPULSION ENERGY</label>
                <div style={styles.gaugeContainer}>
                  <div style={styles.gauge}>
                    <div style={{
                      ...styles.gaugeFill, 
                      width: `${(speed / 255) * 100}%`,
                      background: `linear-gradient(90deg, #00d4ff, ${speed > 200 ? "#ff3e3e" : "#00ffcc"})`
                    }}></div>
                  </div>
                  <div style={styles.percentText}>{Math.round((speed / 255) * 100)}%</div>
                </div>
              </div>
            </div>

            <div style={styles.controlModule}>
              <label style={styles.label}>MANUAL OVERRIDE [M-HID]</label>
              <div style={styles.dpad}>
                <button style={{...styles.dirBtn, gridArea: "f"}} onClick={() => sendCommand("F")}>▲</button>
                <button style={{...styles.dirBtn, gridArea: "l"}} onClick={() => sendCommand("L")}>◀</button>
                <button style={{...styles.dirBtn, ...styles.stopBtn, gridArea: "s"}} onClick={() => sendCommand("S")}>STOP</button>
                <button style={{...styles.dirBtn, gridArea: "r"}} onClick={() => sendCommand("R")}>▶</button>
                <button style={{...styles.dirBtn, gridArea: "b"}} onClick={() => sendCommand("B")}>▼</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: VIDEO FEED */}
        <div style={styles.feedPanel}>
          <div style={styles.frame}>
            <div style={styles.frameHeader}>OPTICAL RECOGNITION FEED</div>
            <div style={styles.videoContainer}>
              <img 
                src="http://localhost:5000/video" 
                style={styles.webcam} 
                alt="Feed"
                onError={(e) => { e.target.src = "https://via.placeholder.com/1280x720/0c0c12/1a1a25?text=OPTICAL+LINK+LOST"; }}
              />
              <div style={styles.hudOverlay}>
                <div style={styles.reticle}></div>
                <div style={styles.cornerTL}></div>
                <div style={styles.cornerTR}></div>
                <div style={styles.cornerBL}></div>
                <div style={styles.cornerBR}></div>
                <div style={styles.recIndicator}>
                  <div style={styles.pulseDot}></div>
                  <span>LIVE</span>
                </div>
              </div>
            </div>
            <div style={styles.feedFooter}>
              <span>ENCRYPTION: ENABLED</span>
              <span>RESOLUTION: 1280x720</span>
              <span>BITRATE: 4.8Mbps</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    background: "#060608",
    color: "#d0d0e0",
    height: "100vh",
    width: "100vw",
    fontFamily: "'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  scanline: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
    zIndex: 10,
    backgroundSize: "100% 3px, 3px 100%",
    pointerEvents: "none",
    opacity: 0.1,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    background: "rgba(10, 10, 15, 0.95)",
    borderBottom: "1px solid #1a1a25",
    zIndex: 5,
  },
  brandContainer: { display: "flex", alignItems: "center", gap: "20px" },
  logoBox: {
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, #1a1a25, #0a0a0f)",
    border: "1px solid #00f2ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 15px rgba(0, 242, 255, 0.2)",
  },
  logoIcon: { fontSize: "24px" },
  titleGroup: { display: "flex", flexDirection: "column" },
  mainTitle: { margin: 0, fontSize: "20px", fontWeight: "900", letterSpacing: "2px", color: "#fff" },
  accentText: { color: "#00f2ff", textShadow: "0 0 10px #00f2ff" },
  subtitle: { margin: 0, fontSize: "10px", fontWeight: "700", color: "#555", letterSpacing: "1px" },
  sysStatus: { display: "flex", alignItems: "center", gap: "20px" },
  statusChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 16px",
    borderRadius: "100px",
    border: "1px solid",
    background: "rgba(0,0,0,0.5)",
  },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
  statusText: { fontSize: "11px", fontWeight: "800", letterSpacing: "1px" },
  killBtn: {
    background: "transparent",
    border: "1px solid #333",
    color: "#666",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  layout: {
    display: "flex",
    flex: 1,
    padding: "20px",
    gap: "20px",
    zIndex: 2,
    minHeight: 0, // Critical for nested flex scrolling/fit
  },
  sidePanel: { width: "380px", display: "flex", flexDirection: "column", minHeight: 0 },
  feedPanel: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
  frame: {
    background: "rgba(15, 15, 20, 0.8)",
    border: "1px solid #1a1a25",
    borderRadius: "20px",
    padding: "20px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
  },
  frameHeader: {
    fontSize: "12px",
    fontWeight: "900",
    color: "#444",
    letterSpacing: "2px",
    marginBottom: "24px",
    paddingBottom: "12px",
    borderBottom: "1px solid #1a1a25",
  },
  telemetryGroup: { display: "flex", flexDirection: "column", gap: "15px", flex: 1, minHeight: 0 },
  dataCard: {
    background: "#0c0c12",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #1a1a25",
  },
  label: { fontSize: "10px", fontWeight: "800", color: "#555", letterSpacing: "1px", display: "block", marginBottom: "15px" },
  vectorValue: { fontSize: "36px", fontWeight: "900", textAlign: "center", textShadow: "0 0 20px currentColor" },
  gaugeContainer: { display: "flex", alignItems: "center", gap: "15px" },
  gauge: { flex: 1, height: "10px", background: "#000", borderRadius: "100px", overflow: "hidden", border: "1px solid #1a1a25" },
  gaugeFill: { height: "100%", transition: "all 0.4s cubic-bezier(0.1, 0.7, 0.1, 1)", boxShadow: "0 0 15px currentColor" },
  percentText: { fontSize: "20px", fontWeight: "900", color: "#fff", width: "50px" },
  controlModule: { marginTop: "auto", padding: "20px", background: "#08080c", borderRadius: "20px", border: "1px solid #1a1a25" },
  dpad: {
    display: "grid",
    gridTemplateAreas: `' . f . ' ' l s r ' ' . b . '`,
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    width: "280px",
    margin: "0 auto",
  },
  dirBtn: {
    aspectRatio: "1/1",
    background: "#121217",
    border: "1px solid #222",
    borderRadius: "16px",
    color: "#fff",
    fontSize: "22px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 5px 0 #000",
  },
  stopBtn: { background: "#4e1a1a", borderColor: "#7a2a2a", color: "#ff3e3e", fontSize: "12px", fontWeight: "900" },
  videoContainer: {
    position: "relative",
    flex: 1,
    background: "#000",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid #1a1a25",
  },
  webcam: { width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 },
  hudOverlay: { position: "absolute", inset: 0, pointerEvents: "none" },
  cornerTL: { position: "absolute", top: "20px", left: "20px", width: "30px", height: "30px", borderTop: "2px solid #00f2ff", borderLeft: "2px solid #00f2ff" },
  cornerTR: { position: "absolute", top: "20px", right: "20px", width: "30px", height: "30px", borderTop: "2px solid #00f2ff", borderRight: "2px solid #00f2ff" },
  cornerBL: { position: "absolute", bottom: "20px", left: "20px", width: "30px", height: "30px", borderBottom: "2px solid #00f2ff", borderLeft: "2px solid #00f2ff" },
  cornerBR: { position: "absolute", bottom: "20px", right: "20px", width: "30px", height: "30px", borderBottom: "2px solid #00f2ff", borderRight: "2px solid #00f2ff" },
  recIndicator: {
    position: "absolute",
    top: "30px",
    right: "30px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(0,0,0,0.6)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "900",
    color: "#ff3e3e",
  },
  pulseDot: { width: "8px", height: "8px", background: "#ff3e3e", borderRadius: "50%", animation: "pulse 1.5s infinite" },
  feedFooter: { display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "10px", fontWeight: "700", color: "#333", letterSpacing: "1px" },
};

// Injection of global animations
if (typeof document !== 'undefined') {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
    button:hover { background: #1a1a25 !important; border-color: #00f2ff !important; color: #00f2ff !important; transform: translateY(-3px); boxShadow: 0 8px 15px rgba(0,242,255,0.2) !important; }
    button:active { transform: translateY(0); boxShadow: none !important; }
  `;
  document.head.appendChild(style);
}
