import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reach the marketplace. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <a className="brand-lockup" href="/"><span className="brand-mark">A<span>+</span></span><span className="brand-name">agriwaste<small>CONNECT</small></span></a>
        <div className="auth-visual-copy"><span className="eyebrow">A BETTER AFTERLIFE FOR CROP RESIDUE</span><h2>Good materials find their people.</h2><p>A direct marketplace for growers with useful residue and industries ready to put it to work.</p></div>
        <div className="auth-visual-bottom">A circular materials marketplace · India</div>
      </aside>
      <main className="auth-content">
        <section className="auth-card">
          <p className="auth-kicker">WELCOME BACK</p>
          <h1>Sign in</h1>
          <p className="auth-subtitle">Pick up where your next useful connection begins.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={handleChange} required /></label>
            <button className="button button-green" disabled={busy}>{busy ? "Signing in…" : "Sign in to your workspace"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-footer">New to the marketplace? <Link to="/register">Create an account</Link></p>
        </section>
      </main>
    </div>
  );
}