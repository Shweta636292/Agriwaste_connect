import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "FARMER", location: "", companyName: "", businessType: "", farmDetails: "" });
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
      const payload = { ...form };
      if (payload.role !== "INDUSTRY") {
        delete payload.companyName;
        delete payload.businessType;
      } else {
        delete payload.farmDetails;
      }
      const { data } = await api.post("/auth/register", payload);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      const details = err.response?.data;
      setError(details?.errors ? details.errors.map((item) => item.message).join(". ") : details?.message || "Unable to reach the marketplace. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <a className="brand-lockup" href="/"><span className="brand-mark">A<span>+</span></span><span className="brand-name">agriwaste<small>CONNECT</small></span></a>
        <div className="auth-visual-copy"><span className="eyebrow">FROM SURPLUS TO SUPPLY</span><h2>Make your material count.</h2><p>Meet local partners, discover availability, and turn agricultural residue into a valuable resource.</p></div>
        <div className="auth-visual-bottom">A circular materials marketplace · India</div>
      </aside>
      <main className="auth-content">
        <section className="auth-card">
          <p className="auth-kicker">JOIN THE MARKETPLACE</p>
          <h1>Create your account</h1>
          <p className="auth-subtitle">Start making direct, useful connections in your region.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-role-switch" aria-label="Account type">
              <button type="button" aria-pressed={form.role === "FARMER"} onClick={() => setForm({ ...form, role: "FARMER" })}>I grow materials</button>
              <button type="button" aria-pressed={form.role === "INDUSTRY"} onClick={() => setForm({ ...form, role: "INDUSTRY" })}>I source materials</button>
            </div>
            <label>{form.role === "INDUSTRY" ? "Contact person" : "Full name"}<input name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={handleChange} required /></label>
            {form.role === "INDUSTRY" ? <>
              <label>Company name<input name="companyName" autoComplete="organization" placeholder="Registered business name" value={form.companyName} onChange={handleChange} required /></label>
              <label>Business type<select name="businessType" value={form.businessType} onChange={handleChange} required><option value="">Choose your industry</option><option>Bioenergy</option><option>Animal feed</option><option>Compost and soil</option><option>Paper and packaging</option><option>Biogas and biofuel</option><option>Other manufacturing</option></select></label>
            </> : <label>Farm details <span className="optional-label">optional</span><input name="farmDetails" placeholder="Farm name, crops, or acreage" value={form.farmDetails} onChange={handleChange} /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required /></label>
            <label>Phone number<input name="phone" type="tel" autoComplete="tel" minLength="10" placeholder="10-digit mobile number" value={form.phone} onChange={handleChange} required /></label>
            <label>{form.role === "INDUSTRY" ? "Company location" : "Your location"}<input name="location" autoComplete="address-level2" placeholder="Town, district" value={form.location} onChange={handleChange} required /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" placeholder="At least 8 characters" value={form.password} onChange={handleChange} required /></label>
            <p className="auth-hint">Accounts are reviewed for trust. Do not share passwords or payment details in listing messages.</p>
            <button className="button button-green" disabled={busy}>{busy ? "Creating account…" : "Create account"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
        </section>
      </main>
    </div>
  );
}