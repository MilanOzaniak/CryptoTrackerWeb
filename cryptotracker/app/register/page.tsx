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
    } catch {
      setServerError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">₿</span>
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-400 mt-2">Join CryptoTracker today</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 space-y-6">
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                aria-label="email"
              />
              {errors.email && <div className="text-red-400 text-sm mt-1">{errors.email}</div>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                aria-label="password"
              />
              {errors.password && <div className="text-red-400 text-sm mt-1">{errors.password}</div>}
              <p className="text-gray-500 text-xs mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                aria-label="confirmPassword"
              />
              {errors.confirmPassword && <div className="text-red-400 text-sm mt-1">{errors.confirmPassword}</div>}
            </div>

            {/* Language and Currency Selects */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Language</label>
                <select
                  value={form.p_language}
                  onChange={(e) => setForm({ ...form, p_language: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="en">English</option>
                  <option value="sk">Slovak</option>
                  <option value="cs">Czech</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Currency</label>
                <select
                  value={form.p_currency}
                  onChange={(e) => setForm({ ...form, p_currency: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CZK">CZK</option>
                </select>
              </div>
            </div>

            {/* Error Messages */}
            {serverError && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm">
                {serverError}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full px-4 py-2 border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            Sign In
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-xs mt-6">
          By creating an account, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}