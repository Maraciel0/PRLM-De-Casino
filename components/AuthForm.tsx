"use client";
import { useState } from "react";
import { api } from "./Client";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify({ username, password }) });
      location.href = "/";
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex gap-3 text-sm">
        <button className={mode === "login" ? "" : "ghost"} onClick={() => setMode("login")}>Sign in</button>
        <button className={mode === "signup" ? "" : "ghost"} onClick={() => setMode("signup")}>Create account</button>
      </div>
      <p className="text-sm text-neutral-400">
        {mode === "login" ? "Welcome back." : "Use your exact in-game name as your username."}
      </p>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="In-game name" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {mode === "signup" && <p className="text-xs text-neutral-500">At least 10 characters.</p>}
      <button disabled={!username || password.length < 10 && mode === "signup"} onClick={submit}>
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
