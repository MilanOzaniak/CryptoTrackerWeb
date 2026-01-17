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
  const [showLangForm, setShowLangForm] = useState(false);
  const [showCurrForm, setShowCurrForm] = useState(false);
  const [langValue, setLangValue] = useState("en");
  const [langMessage, setLangMessage] = useState<string | null>(null);
  const [langSubmitting, setLangSubmitting] = useState(false);
  const [currValue, setCurrValue] = useState("USD");
  const [currMessage, setCurrMessage] = useState<string | null>(null);
  const [currSubmitting, setCurrSubmitting] = useState(false);

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

  useEffect(() => {
    if (user?.p_language) setLangValue(user.p_language);
    if (user?.p_currency) setCurrValue(user.p_currency);
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

  async function submitLanguageChange(ev?: React.FormEvent) {
    ev?.preventDefault();
    setLangMessage(null);
    const code = langValue.trim().toLowerCase();
    if (!code) {
      setLangMessage("Enter a language code");
      return;
    }
    setLangSubmitting(true);
    try {
      const res = await fetch("/api/users/me/planguage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ p_language: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLangMessage("Preferred language updated");
        setUser((u) => (u ? { ...u, p_language: data?.p_language ?? code } : u));
      } else {
        setLangMessage(data?.error || `Error (${res.status})`);
      }
    } catch {
      setLangMessage("Network error");
    } finally {
      setLangSubmitting(false);
    }
  }

  async function submitCurrencyChange(ev?: React.FormEvent) {
    ev?.preventDefault();
    setCurrMessage(null);
    const code = currValue.trim().toUpperCase();
    if (!code) {
      setCurrMessage("Enter a currency code");
      return;
    }
    setCurrSubmitting(true);
    try {
      const res = await fetch("/api/users/me/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ p_currency: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCurrMessage("Preferred currency updated");
        setUser((u) => (u ? { ...u, p_currency: data?.p_currency ?? code } : u));
      } else {
        setCurrMessage(data?.error || `Error (${res.status})`);
      }
    } catch {
      setCurrMessage("Network error");
    } finally {
      setCurrSubmitting(false);
    }
  }

  async function handleUserDisable(userId: number) {
    if (!confirm("Are you sure you want to disable this user?")) return;
    try {
      const res = await fetch(`/api/users/${userId}/disable`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        alert("User disabled successfully");
        // Refresh the users list
        const usersRes = await fetch("/api/users", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } else {
        const data = await res.json();
        alert(data?.error || "Error disabling user");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  async function handleUserDelete(userId: number) {
    if (!confirm("Are you sure you want to DELETE this user? This action is IRREVERSIBLE!")) return;
    try {
      const res = await fetch(`/api/users/${userId}/delete`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        alert("User deleted successfully");
        const usersRes = await fetch("/api/users", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } else {
        const data = await res.json();
        alert(data?.error || "Error deleting user");
      }
    } catch (err) {
      alert("Network error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">No user data</div>
      </div>
    );
  }

  const initials = user.email ? user.email.charAt(0).toUpperCase() : "?";
  const languageOptions = ["en", "es", "de", "fr", "sk", "cs", "pl", "it", "pt", "tr"];
  const currencyOptions = ["USD", "EUR", "GBP", "CHF", "JPY", "AUD", "CAD", "NZD", "SEK", "CZK"];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold">Profile</h1>
              <p className="text-gray-400 mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-bold mb-4">Account Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">User ID</div>
              <div className="text-white font-medium">{user.user_id}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Role</div>
              <div className="text-white font-medium capitalize">{user.role}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Language</div>
              <div className="text-white font-medium">{user.p_language ?? "en"}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Currency</div>
              <div className="text-white font-medium">{user.p_currency ?? "USD"}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
          <h2 className="text-xl font-bold mb-4">Account Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                setShowPasswordForm((s) => !s);
                setShowLangForm(false);
                setShowCurrForm(false);
                setPwMessage(null);
              }}
              className={`px-6 py-2 text-white rounded-lg transition font-medium ${
                showPasswordForm
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => {
                setShowLangForm((s) => !s);
                setShowPasswordForm(false);
                setShowCurrForm(false);
                setLangMessage(null);
              }}
              className={`px-6 py-2 text-white rounded-lg transition font-medium ${
                showLangForm
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Change Language
            </button>
            <button
              onClick={() => {
                setShowCurrForm((s) => !s);
                setShowPasswordForm(false);
                setShowLangForm(false);
                setCurrMessage(null);
              }}
              className={`px-6 py-2 text-white rounded-lg transition font-medium ${
                showCurrForm
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Change Currency
            </button>
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to disable your account?")) return;
                try {
                  const res = await fetch(`/api/users/${user.user_id}/disable`, {
                    method: "POST",
                    credentials: "include",
                  });
                  if (res.ok) {
                    alert("Account disabled");
                    localStorage.removeItem("user");
                    router.push("/login");
                  } else {
                    const data = await res.json();
                    alert(data?.error || "Error");
                  }
                } catch (err) {
                  alert("Network error");
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Disable Account
            </button>
          </div>
        </div>

        {/* Change Language */}
        {showLangForm && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-4">Change Preferred Language</h2>
            <form onSubmit={submitLanguageChange} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Language</label>
                <select
                  value={langValue}
                  onChange={(e) => setLangValue(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {languageOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={langSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {langSubmitting ? "Saving..." : "Save Language"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLangValue(user.p_language ?? "en");
                    setLangMessage(null);
                    setShowLangForm(false);
                  }}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Cancel
                </button>
              </div>

              {langMessage && <div className="text-sm text-green-400">{langMessage}</div>}
            </form>
          </div>
        )}

        {/* Change Currency */}
        {showCurrForm && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-4">Change Preferred Currency</h2>
            <form onSubmit={submitCurrencyChange} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Currency</label>
                <select
                  value={currValue}
                  onChange={(e) => setCurrValue(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={currSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {currSubmitting ? "Saving..." : "Save Currency"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrValue(user.p_currency ?? "USD");
                    setCurrMessage(null);
                    setShowCurrForm(false);
                  }}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Cancel
                </button>
              </div>

              {currMessage && <div className="text-sm text-green-400">{currMessage}</div>}
            </form>
          </div>
        )}

        {/* Password Change Form */}
        {showPasswordForm && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>
            <form onSubmit={submitPasswordChange} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {pwErrors.currentPassword && (
                  <div className="text-red-400 text-sm mt-1">{pwErrors.currentPassword}</div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {pwErrors.newPassword && (
                  <div className="text-red-400 text-sm mt-1">{pwErrors.newPassword}</div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={pwSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {pwSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setPwErrors({});
                    setPwMessage(null);
                  }}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Cancel
                </button>
              </div>

              {pwMessage && (
                <div className="text-green-400 text-sm mt-2">{pwMessage}</div>
              )}
            </form>
          </div>
        )}

        {/* Admin Users Section */}
        {user.role === "admin" && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">All Users (Admin)</h2>
            {usersLoading && <div className="text-gray-400">Loading users...</div>}
            {usersError && <div className="text-red-400">{usersError}</div>}
            
            {!usersLoading && !usersError && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Language</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Currency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-gray-800 transition">
                        <td className="px-4 py-3 text-sm">{u.user_id}</td>
                        <td className="px-4 py-3 text-sm">{u.email}</td>
                        <td className="px-4 py-3 text-sm capitalize">{u.role}</td>
                        <td className="px-4 py-3 text-sm">{u.p_language ?? "en"}</td>
                        <td className="px-4 py-3 text-sm">{u.p_currency ?? "USD"}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUserDisable(u.user_id)}
                              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-xs font-medium"
                            >
                              Disable
                            </button>
                            <button
                              onClick={() => handleUserDelete(u.user_id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}