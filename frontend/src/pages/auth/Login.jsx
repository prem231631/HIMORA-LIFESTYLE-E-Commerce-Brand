import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
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

        throw new Error(data.detail || "Invalid email or password.");
      }

      localStorage.setItem("access_token", data.access_token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userName", data.user.full_name);
        localStorage.setItem(
          "isAdmin",
          data.user.role === "admin" ? "true" : "false"
        );
      }

      if (data.user?.role === "admin") {
        navigate("/admin/orders");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Unable to sign in.");
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
            <span>WELCOME BACK</span>

            <h2>Sign in.</h2>

            <p>
              Enter your details to continue your HIMORA experience.
            </p>
          </div>

          <form
            className="himora-auth-form"
            onSubmit={handleSubmit}
          >
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
              <label htmlFor="password">PASSWORD</label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="himora-auth-message himora-auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="himora-auth-submit"
              disabled={loading}
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <div className="himora-auth-switch">
            <span>New to HIMORA?</span>

            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;