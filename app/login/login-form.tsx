"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeRelativeReturnPath } from "@/lib/return-path";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [returnTo, setReturnTo] = useState("/");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("return_to");
    if (value) setReturnTo(safeRelativeReturnPath(value));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }
      window.location.assign(returnTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={styles.form}>
      <label style={styles.label} htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={styles.input}
        placeholder="you@example.com"
      />
      <label style={styles.label} htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={styles.input}
        placeholder="Your password"
      />
      {error ? <p role="alert" style={styles.error}>{error}</p> : null}
      <button type="submit" disabled={busy} style={styles.button}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "grid", gap: "10px" },
  label: { fontSize: "13px", fontWeight: 600, marginTop: "6px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--line, #2a323e)",
    background: "var(--bg, #0c1016)",
    color: "inherit",
    fontSize: "14px",
  },
  button: {
    marginTop: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    border: 0,
    background: "var(--income, #5ad39a)",
    color: "#07150f",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  error: {
    margin: "6px 0 0",
    color: "var(--expense, #ff7a7a)",
    fontSize: "13px",
  },
};
