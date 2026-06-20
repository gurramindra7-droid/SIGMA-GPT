// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import api from "../api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [bannerError, setBannerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (field, value) => {
    if (field === "email") {
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
    }
    if (field === "password") {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
    }
    return "";
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    }
    if (bannerError) setBannerError("");
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, form[field]) }));
  };

  const isValid = !validate("email", form.email) && !validate("password", form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerError("");
    const emailErr = validate("email", form.email);
    const passErr = validate("password", form.password);
    setErrors({ email: emailErr, password: passErr });
    setTouched({ email: true, password: true });
    if (emailErr || passErr) return;
    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      localStorage.setItem("sigma_token", data.token);
      localStorage.setItem("sigma_username", data.user.username);
      navigate("/chat");
    } catch (err) {
      setBannerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("sigma_username", "Guest");
    localStorage.removeItem("sigma_token");
    navigate("/chat");
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb--violet" />
        <div className="auth-orb auth-orb--cyan" />
        <div className="auth-orb auth-orb--small" />
      </div>
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">⚡ SIGMA-GPT</h1>
            <p className="auth-subtitle">Sign in to continue.</p>
          </div>
          {bannerError && <div className="auth-banner-error">{bannerError}</div>}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13L2 4" />
                  </svg>
                </span>
                <input id="login-email" type="email" className={`auth-input ${errors.email && touched.email ? "auth-input--error" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} autoComplete="email" autoFocus />
              </div>
              {errors.email && touched.email && <span className="auth-error">✕ {errors.email}</span>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input id="login-password" type={showPassword ? "text" : "password"} className={`auth-input ${errors.password && touched.password ? "auth-input--error" : ""}`} placeholder="••••••••" value={form.password} onChange={(e) => handleChange("password", e.target.value)} onBlur={() => handleBlur("password")} autoComplete="current-password" />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((p) => !p)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && touched.password ? <span className="auth-error">✕ {errors.password}</span> : <div className="auth-forgot"><Link to="/forgot-password">Forgot password?</Link></div>}
            </div>
            <button type="submit" className="auth-btn" disabled={loading || !isValid}>
              <span className="auth-btn-text">{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">— or —</div>

          {/* Guest Button */}
          <button type="button" className="auth-guest-btn" onClick={handleGuestLogin}>
            <span>👤</span> Continue as Guest
          </button>

          <p className="auth-footer">Don&apos;t have an account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
}
