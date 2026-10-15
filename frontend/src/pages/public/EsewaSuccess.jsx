import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function decodeEsewaData(encodedData) {
  try {
    const normalized = encodedData.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function EsewaSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState(
    "Please wait while we verify your transaction securely."
  );
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      const token = getAuthToken();

      if (!token) {
        navigate("/login", {
          replace: true,
          state: { from: "/payment/esewa/success" },
        });
        return;
      }

      const encodedData = searchParams.get("data");
      const callbackData = encodedData
        ? decodeEsewaData(encodedData)
        : null;

      const transactionUuid =
        callbackData?.transaction_uuid ||
        searchParams.get("transaction_uuid");

      if (!transactionUuid) {
        setStatus("error");
        setMessage(
          "We couldn't find the transaction reference. Please check your order history before trying again."
        );
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/payments/esewa/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              transaction_uuid: transactionUuid,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.detail === "string"
              ? data.detail
              : "We couldn't verify your payment yet."
          );
        }

        if (cancelled) return;

        if (
          data.payment_status === "PAID" ||
          data.status === "COMPLETE" ||
          data.success === true
        ) {
          setStatus("success");
          setMessage("Your payment has been verified successfully.");
          setOrderId(data.order_id || data.order?.id || null);
          window.dispatchEvent(new Event("himora-cart-updated"));
        } else {
          setStatus("pending");
          setMessage(
            "Your transaction has not been confirmed as paid. Please check your order history before making another payment."
          );
        }
      } catch (error) {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          error.message ||
            "Payment verification failed. Please check your order history."
        );
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  const isVerifying = status === "verifying";
  const isSuccess = status === "success";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        background: "#f7f5f0",
        color: "#183d32",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "48px 32px",
          background: "#fffefa",
          border: "1px solid #ded8cc",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "4px",
            marginBottom: "32px",
          }}
        >
          HIMORA LIFESTYLE
        </p>

        {isVerifying ? (
          <LoaderCircle
            size={48}
            strokeWidth={1.5}
            style={{ margin: "0 auto 24px", animation: "spin 1s linear infinite" }}
          />
        ) : isSuccess ? (
          <CheckCircle2
            size={52}
            strokeWidth={1.4}
            style={{ margin: "0 auto 24px" }}
          />
        ) : (
          <ShieldCheck
            size={52}
            strokeWidth={1.4}
            style={{ margin: "0 auto 24px" }}
          />
        )}

        <h1 style={{ fontSize: "27px", fontWeight: 400, marginBottom: "16px" }}>
          {isVerifying
            ? "Verifying Payment"
            : isSuccess
              ? "Payment Confirmed"
              : status === "pending"
                ? "Payment Pending"
                : "Unable to Confirm Payment"}
        </h1>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.9,
            color: "#716d64",
            marginBottom: "30px",
          }}
        >
          {message}
        </p>

        {isSuccess && orderId && (
          <p style={{ fontSize: "13px", marginBottom: "24px" }}>
            Order reference: {orderId}
          </p>
        )}

        {!isVerifying && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <Link
              to="/account/orders"
              style={{
                padding: "15px 20px",
                background: "#183d32",
                color: "#fffefa",
                textDecoration: "none",
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              View My Orders
            </Link>

            <Link
              to="/"
              style={{
                padding: "14px 20px",
                color: "#183d32",
                textDecoration: "none",
                border: "1px solid #ded8cc",
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Continue Shopping
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default EsewaSuccess;