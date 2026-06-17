import os

content = '''// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [bannerError, setBannerError] = useState("");
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: "", level: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: "Weak", level: "weak" };
    if (score <= 2) return { score, label: "Fair", level: "fair" };
    if (score <= 3) return { score, label: "Strong", level: "strong" };
    return { score, label: "Very Strong", level: "very-strong" };
  };

  const validate = (field, value) => {
    if (field === "fullName") {
      if (!value.trim()) return "Full name is required";
      if (value.trim().length < 2) return "Name must be at least 2 characters";
    }
    if (field === "email") {
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
    }
    if (field === "password") {
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
    }
    if (field === "confirmPassword") {
      if (!value) return "Please confirm your password";
      if (value !== form.password) return "Passwords do not match";
    }
    return "";
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    if (field === "password" && touched.confirmPassword && form.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: validate("confirmPassword", form.confirmPassword) }));
    }
    if (bannerError) setBannerError("");
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, form[field]) }));
  };

  const strength = getPasswordStrength(form.password);
  const isValid = !validate("fullName", form.fullName) && !validate("email", form.email) && !validate("password", form.password) && !validate("confirmPassword", form.confirmPassword) && acceptedTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerError("");
    const fields = ["fullName", "email", "password", "confirmPassword"];
    const newErrors = {};
    fields.forEach((f) => { newErrors[f] = validate(f, form[f]); });
    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    if (Object.values(newErrors).some(Boolean)) return;
    if (!acceptedTerms) { setBannerError("You must agree to the Terms of Service"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    console.log("Registration:", { fullName: form.fullName, email: form.email });
    localStorage.setItem("sigma_username", form.fullName);
    setLoading(false);
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
            <h1 className="auth-logo">SIGMA-GPT</h1>
            <p className="auth-subtitle">Create your account. It is free.</p>
          </div>
          {bannerError && <div className="auth-banner-error">{bannerError}</div>}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-name">Full Name</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                <input id="reg-name" type="text" className={`auth-input ${errors.fullName && touched.fullName ? "auth-input--error" : ""}`} placeholder="John Doe" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} onBlur={() => handleBlur("fullName")} autoComplete="name" autoFocus />
              </div>
              {errors.fullName && touched.fullName && <span className="auth-error">X {errors.fullName}</span>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13L2 4" /></svg>
                </span>
                <input id="reg-email" type="email" className={`auth-input ${errors.email && touched.email ? "auth-input--error" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} autoComplete="email" />
              </div>
              {errors.email && touched.email && <span className="auth-error">X {errors.email}</span>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input id="reg-password" type={showPassword ? "text" : "password"} className={`auth-input ${errors.password && touched.password ? "auth-input--error" : ""}`} placeholder="Create a strong password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} onBlur={() => handleBlur("password")} autoComplete="new-password" />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((p) => !p)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              {errors.password && touched.password && <span className="auth-error">X {errors.password}</span>}
              <div className="auth-strength">
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`auth-strength-segment ${i <= strength.score ? "auth-strength-segment--" + strength.level : ""} ${
