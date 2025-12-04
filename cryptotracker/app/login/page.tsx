// ...existing code...
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  email: string;
  password: string;
};

const initial: FormState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRe.test(form.email)) e.email = "Invalid email format";

    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (res.status === 200) {
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setServerError(data?.error || "Login failed");
      }
    } catch (err) {
      setServerError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="cardPage">
        <h2 className="titleLogin">Prihlásenie</h2>

        <form onSubmit={onSubmit} className="form" noValidate>
          <input
            className="input"
            type="email"
            placeholder="Email..."
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            aria-label="email"
          />
          {errors.email && <div className="err">{errors.email}</div>}

          <input
            className="input"
            type="password"
            placeholder="Heslo..."
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            aria-label="password"
          />
          {errors.password && <div className="err">{errors.password}</div>}

          <div className="buttonContainer">
            <button className="buttonNormal" type="submit" disabled={submitting}>
              {submitting ? "Prihlasovanie..." : "Prihlásiť sa"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/register")}
              className="buttonLink"
            >
              Registrovať
            </button>
          </div>

          {serverError && <div className="errBlock">{serverError}</div>}
        </form>
      </div>
    </div>
  );
}