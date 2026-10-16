import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import "./resetPassword.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This password reset link is invalid.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword.length > 128) {
      setError("Your password cannot exceed 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = data.detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : "Unable to reset your password. Request a new reset link if necessary."
        );
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
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
            <span>ACCOUNT SECURITY</span>
            <h2>
              {success ? "Password updated" : "Create a new password"}
            </h2>
            <p>
              {success
                ? "Your password has been changed successfully. You can now sign in with your new password."
                : "Choose a new password to securely regain access to your HIMORA account."}
            </p>
          </div>

          {success ? (
            <div className="himora-forgot-success" role="status">
              <CheckCircle2 size={36} />
              <h3>Password reset successful</h3>
              <p>
                Your new password is ready to use. For your
                security, your reset link should not be reused.
              </p>

              <button
                type="button"
                className="himora-auth-submit"
                onClick={() => navigate("/login", { replace: true })}
              >
                CONTINUE TO SIGN IN
              </button>
            </div>
          ) : (
            <form
              className="himora-auth-form"
              onSubmit={handleSubmit}
            >
              <div className="himora-auth-field">
                <label htmlFor="reset-new-password">
                  NEW PASSWORD
                </label>

                <div className="himora-reset-password-input">
                  <LockKeyhole size={18} />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="himora-reset-visibility"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={
                      showNewPassword ? "Hide new password" : "Show new password"
                    }
                    disabled={loading}
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="himora-reset-hint">
                  Use at least 8 characters.
                </p>
              </div>

              <div className="himora-auth-field">
                <label htmlFor="reset-confirm-password">
                  CONFIRM NEW PASSWORD
                </label>

                <div className="himora-reset-password-input">
                  <LockKeyhole size={18} />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    maxLength={128}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="himora-reset-visibility"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
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
                    UPDATING PASSWORD...
                  </>
                ) : (
                  "RESET PASSWORD"
                )}
              </button>

              <div className="himora-reset-security-note">
                <ShieldCheck size={17} />
                <span>Your password is securely updated through HIMORA.</span>
              </div>
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

export default ResetPassword;