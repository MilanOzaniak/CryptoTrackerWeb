"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        setLoggedIn(!!data.loggedIn);
      } catch {
        setLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  function goLogin() {
    router.push("/login");
  }

  function goRegister() {
    router.push("/register");
  }

  function logout() {
    setLoggedIn(false);
    router.refresh();
  }

  if (loggedIn === null) {
    return <div style={{ padding: 24 }}>Checking auth...</div>;
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f10", color: "#eee", padding: 24 }}>
      <div style={{ width: 720, maxWidth: "95%", padding: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(20,20,21,0.6)", textAlign: "center" }}>
        {loggedIn ? (
          <>
            <h2>Logged in</h2>
            <p>You are currently logged in.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
              <button onClick={() => router.push("/profile")} style={buttonStyle}>Profile</button>
              <button onClick={logout} style={buttonStyle}>Logout</button>
            </div>
          </>
        ) : (
          <>
            <h2>Not logged in</h2>
            <p>Please login or register to continue.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
              <button onClick={goLogin} style={buttonStyle}>Prihlásiť sa</button>
              <button onClick={goRegister} style={linkButtonStyle}>Registrovať</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#9f9f9f",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

const linkButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#eee",
  cursor: "pointer",
  fontWeight: 600,
};
