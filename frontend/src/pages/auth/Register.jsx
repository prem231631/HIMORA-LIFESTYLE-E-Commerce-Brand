import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          throw new Error(
            data.detail
              .map((item) => item.msg)
              .filter(Boolean)
              .join(" ")
          );
        }

        throw new Error(data.detail || "Registration failed.");
      }

      setSuccess("Your HIMORA account has been created successfully.");

      setForm({
        full_name: "",
        email: "",
        phone: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="himora-auth-page">
      <section className="himora-auth-visual">
        <div className="himora-auth-visual-overlay">
          <Link to="/" className="himora-auth-brand">
            HIMORA
          </Link>

          <div className="himora-auth-editorial">
            <p>HIMORA LIFESTYLE</p>

            <h1>
              Inspired by the Himalayas.
              <br />
              Designed for the modern world.
            </h1>
          </div>
        </div>
      </section>

      <section className="himora-auth-form-section">
        <div className="himora-auth-form-wrapper">
          <div className="himora-auth-heading">
            <span>CREATE ACCOUNT</span>

            <h2>Join HIMORA.</h2>

            <p>
              Create your account to explore collections, save your
              favourites, and manage your orders.
            </p>
          </div>

          <form
            className="himora-auth-form"
            onSubmit={handleSubmit}
          >
            <div className="himora-auth-field">
              <label htmlFor="full_name">FULL NAME</label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Your full name"
                value={form.full_name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>

            <div className="himora-auth-field">
              <label htmlFor="email">EMAIL ADDRESS</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="himora-auth-field">
              <label htmlFor="phone">PHONE NUMBER</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="98XXXXXXXX"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>

            <div className="himora-auth-field">
              <label htmlFor="password">PASSWORD</label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />

              <small>Minimum 8 characters.</small>
            </div>

            {error && (
              <div className="himora-auth-message himora-auth-error">
                {error}
              </div>
            )}

            {success && (
              <div className="himora-auth-message himora-auth-success">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="himora-auth-submit"
              disabled={loading}
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>

          <div className="himora-auth-switch">
            <span>Already have an account?</span>

            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Register;