import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Pocket",
  description: "Sign in to your private budget.",
};

export default function LoginPage() {
  return (
    <main style={styles.page}>
      <section style={styles.card} aria-labelledby="login-title">
        <div style={styles.brand}>Pocket<span style={styles.dot}>.</span></div>
        <p style={styles.tagline}>A little clarity, every day.</p>
        <h1 id="login-title" style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to open your private ledger.</p>
        <LoginForm />
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "var(--bg, #0c1016)",
    color: "var(--fg, #f5f7fa)",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "32px",
    borderRadius: "20px",
    border: "1px solid var(--line, #232a35)",
    background: "var(--panel, #121822)",
    boxShadow: "0 24px 70px rgba(0,0,0,.35)",
  },
  brand: { fontSize: "26px", fontWeight: 700, letterSpacing: "-.03em" },
  dot: { color: "var(--income, #5ad39a)" },
  tagline: { margin: "4px 0 28px", color: "var(--muted, #8b96a6)", fontSize: "13px" },
  title: { margin: 0, fontSize: "24px", letterSpacing: "-.02em" },
  subtitle: { margin: "8px 0 24px", color: "var(--muted, #8b96a6)", fontSize: "14px" },
};
