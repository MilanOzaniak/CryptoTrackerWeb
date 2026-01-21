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
    } catch {
      setServerError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">₿</span>
          </div>
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="text-gray-400 mt-2">Access your cryptocurrency portfolio</p>
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
            </div>

            {/* Server Error */}
            {serverError && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm">
                {serverError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Don&apos;t have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="w-full px-4 py-2 border border-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            Create Account
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-xs mt-6">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}