"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  user_id: number;
  email: string;
  role: string;
  p_language?: string;
  p_currency?: string;
  created_at?: string;
};

type UserListItem = {
  user_id: number;
  email: string;
  role: string;
  p_language?: string;
  p_currency?: string;
  created_at?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // admin users state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // password change UI state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || `Request failed (${res.status})`);
          return;
        }

        const data = await res.json();
        setUser(data.user ?? null);
      } catch (err: any) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  // fetch all users if current user is admin
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    async function fetchUsers() {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await fetch("/api/users", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setUsersError(data?.error || `Request failed (${res.status})`);
          return;
        }

        const data = await res.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err: any) {
        setUsersError("Network error");
      } finally {
        setUsersLoading(false);
      }
    }

    fetchUsers();
  }, [user]);

  function validatePasswordForm() {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "Zadajte aktuálne heslo";
    if (!newPassword) e.newPassword = "Zadajte nové heslo";
    else {
      if (newPassword.length < 8) e.newPassword = "Minimálna dĺžka 8 znakov";
      if (!/[A-Z]/.test(newPassword)) e.newPassword = "Musí obsahovať aspoň jedno veľké písmeno";
    }
    setPwErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitPasswordChange(ev?: React.FormEvent) {
    ev?.preventDefault();
    setPwMessage(null);
    if (!validatePasswordForm()) return;
    setPwSubmitting(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPwMessage("Heslo úspešne zmenené");
        setCurrentPassword("");
        setNewPassword("");
        setShowPasswordForm(false);
      } else {
        setPwMessage(data?.error || `Chyba (${res.status})`);
      }
    } catch (err) {
      setPwMessage("Sieťová chyba");
    } finally {
      setPwSubmitting(false);
    }
  }

  if (loading) return <div style={styles.center}>Loading profile...</div>;
  if (error) return <div style={{ ...styles.center, color: "#ff6b6b" }}>{error}</div>;
  if (!user) return <div style={styles.center}>No user data</div>;

  const initials = user.email ? user.email.charAt(0).toUpperCase() : "?";

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.headText}>
            <h1 style={styles.title}>Profil</h1>
            <div style={styles.subtitle}>{user.email}</div>
          </div>
        </header>

        <section style={styles.grid}>
          <div style={styles.row}>
            <div style={styles.label}>ID</div>
            <div style={styles.value}>{user.user_id}</div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Rola</div>
            <div style={styles.value}>{user.role}</div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Jazyk</div>
            <div style={styles.value}>{user.p_language ?? "en"}</div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Mena</div>
            <div style={styles.value}>{user.p_currency ?? "USD"}</div>
          </div>

        </section>

        <div style={styles.actions}>
          <button className="buttonNormal" onClick={() => router.push("/")}>
            Domov
          </button>

          <button
            className="buttonLink"
            onClick={() => {
              setShowPasswordForm((s) => !s);
              setPwMessage(null);
            }}
          >
            Zmeniť heslo
          </button>
        </div>

        {/* password form toggles under profile card */}
        {showPasswordForm && (
          <form onSubmit={submitPasswordChange} style={styles.passwordCard}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={styles.pwLabel}>
                Aktuálne heslo
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                />
                {pwErrors.currentPassword && <div style={styles.err}>{pwErrors.currentPassword}</div>}
              </label>

              <label style={styles.pwLabel}>
                Nové heslo
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                />
                {pwErrors.newPassword && <div style={styles.err}>{pwErrors.newPassword}</div>}
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="submit" className="buttonNormal">
                  Uložiť
                </button>
                <button
                  type="button"
                  className="buttonLink"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPwErrors({});
                    setPwMessage(null);
                  }}
                >
                  Zrušiť
                </button>
              </div>

              {pwMessage && <div style={{ marginTop: 8, color: pwMessage.includes("úspešne") ? "#8ce99a" : "#ff6b6b" }}>{pwMessage}</div>}
            </div>
          </form>
        )}
      </div>

{/* admin */}
      {user.role === "admin" && (
        <div style={{ ...styles.card, marginTop: 20 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Všetci používatelia</h2>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{usersLoading ? "Načítavam..." : `${users.length} položiek`}</div>
          </header>

          {usersError && <div className="errBlock">{usersError}</div>}

          <div style={styles.table}>
            <div style={{ ...styles.tableRow, fontWeight: 700, background: "rgba(255,255,255,0.02)" }}>
              <div style={styles.tableCell}>ID</div>
              <div style={styles.tableCell}>Email</div>
              <div style={styles.tableCell}>Rola</div>
              <div style={styles.tableCell}>Mena</div>
              <div style={styles.tableCell}>Registrovaný</div>
            </div>

            {users.map((u) => (
              <div key={u.user_id} style={styles.tableRow}>
                <div style={styles.tableCell}>{u.user_id}</div>
                <div style={styles.tableCell}>{u.email}</div>
                <div style={styles.tableCell}>{u.role}</div>
                <div style={styles.tableCell}>{u.p_currency ?? "USD"}</div>
                <div style={styles.tableCell}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</div>
              </div>
            ))}

            {!usersLoading && users.length === 0 && <div style={{ padding: 12, color: "rgba(255,255,255,0.6)" }}>Žiadni používatelia</div>}
          </div>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    background: "var(--bg)",
    padding: 24,
    gap: 20,
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    width: 720,
    maxWidth: "95%",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 28,
    background: "linear-gradient(180deg, rgba(20,20,21,0.75), rgba(12,12,13,0.7))",
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
    color: "var(--text)",
  },
  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: "linear-gradient(135deg,#3a3a3a,#222)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.04)",
  },
  headText: {
    display: "flex",
    flexDirection: "column",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 6,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.02)",
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  value: {
    color: "var(--text)",
    fontWeight: 600,
  },
  actions: {
    marginTop: 18,
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  primary: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#9f9f9f",
    color: "#111",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondary: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "var(--text)",
    cursor: "pointer",
    fontWeight: 700,
  },
  center: {
    padding: 24,
    textAlign: "center",
  },

  /* users table styles */
  table: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.03)",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "80px 1fr 120px 100px 160px",
    gap: 8,
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  tableCell: {
    fontSize: 13,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /* password form */
  passwordCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.03)",
  },
  pwLabel: {
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  input: {
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "var(--text)",
  },
  err: {
    marginTop: 6,
    color: "#ff6b6b",
    fontSize: 12,
  },
};