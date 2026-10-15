
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import "./Login.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = data.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : "Unable to process your request. Please try again."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

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
              Timeless style.
              <br />
              Thoughtfully yours.
            </h1>
          </div>
        </div>
      </section>

      <section className="himora-auth-form-section">
        <div className="himora-auth-form-wrapper">
          <Link
            to="/login"
            className="himora-forgot-back-link"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <div className="himora-auth-heading himora-forgot-heading">
            <span>ACCOUNT RECOVERY</span>

            <h2>Forgot password?</h2>

            <p>
              Enter the email address associated with your
              HIMORA account. If an account exists, we'll send
              you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="himora-forgot-success" role="status">
              <CheckCircle2 size={34} />

              <h3>Check your inbox</h3>

              <p>
                If an account exists for{" "}
                <strong>{email.trim().toLowerCase()}</strong>,
                a password reset link will be sent. Check your
                inbox and spam folder.
              </p>

              <button
                type="button"
                className="himora-auth-submit"
                onClick={() => {
                  setSuccess(false);
                  setError("");
                }}
              >
                TRY ANOTHER EMAIL
              </button>
            </div>
          ) : (
            <form
              className="himora-auth-form"
              onSubmit={handleSubmit}
            >
              <div className="himora-auth-field">
                <label htmlFor="forgot-email">
                  EMAIL ADDRESS
                </label>

                <div className="himora-forgot-email-input">
                  <Mail size={18} />

                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="himora-auth-message himora-auth-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="himora-auth-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="himora-forgot-spinner"
                    />
                    SENDING REQUEST...
                  </>
                ) : (
                  "SEND RESET LINK"
                )}
              </button>
            </form>
          )}

          <div className="himora-auth-switch">
            <span>Remember your password?</span>

            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
