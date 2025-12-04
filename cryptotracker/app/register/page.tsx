"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  p_language: string;
  p_currency: string;
};

const initial: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
  p_language: "en",
  p_currency: "USD",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRe.test(form.email)) e.email = "Format (xxxxxx@xxxxxx.xxx)";

    if (!form.password) e.password = "Password is required";
    else {
      if (form.password.length < 8) e.password = "Min length 8";
      else {
        if (!/[a-z]/.test(form.password)) e.password = "Add lowercase letter";
        if (!/[A-Z]/.test(form.password)) e.password = "Add uppercase letter";
        if (!/[0-9]/.test(form.password)) e.password = "Add number";
      }
    }

    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords must match";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    setServerError(null);
    setSuccess(null);

    if (!validate()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          p_language: form.p_language,
          p_currency: form.p_currency,
        }),
      });

      const data = await res.json();
      if (res.status === 201) {
        setSuccess("Registered successfully. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1300);
      } else {
        setServerError(data?.error || "Registration failed");
      }
    } catch (err: any) {
      setServerError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="cardPage">
        <h2 className="titleLogin">Registrácia</h2>

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
          <input
            className="input"
            type="password"
            placeholder="Heslo znova..."
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            aria-label="confirmPassword"
          />
          {errors.confirmPassword && <div className="err">{errors.confirmPassword}</div>}

          <div className="row">
            <select
              className="select"
              value={form.p_language}
              onChange={(e) => setForm({ ...form, p_language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="sk">Slovenčina</option>
              <option value="cs">Čeština</option>
            </select>

            <select
              className="select"
              value={form.p_currency}
              onChange={(e) => setForm({ ...form, p_currency: e.target.value })}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CZK">CZK</option>
            </select>
          </div>

          <div className="buttonContainer">
            <button className="buttonNormal" type="submit" disabled={submitting}>
              {submitting ? "Registering..." : "Registrovať"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="buttonLink"
            >
              Prihlásiť sa
            </button>
          </div>

          {serverError && <div className="errBlock">{serverError}</div>}
          {success && <div className="successBlock">{success}</div>}
        </form>
      </div>
    </div>
  );
}