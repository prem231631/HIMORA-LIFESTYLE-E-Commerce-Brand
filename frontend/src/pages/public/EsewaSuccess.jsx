
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

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

async function readResponse(response) {
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : `Payment verification failed (HTTP ${response.status}).`;

    throw new Error(detail);
  }

  return data;
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
    let timeoutId;

    async function verifyPayment() {
      console.info("[eSewa] Success page loaded.");

      const token = getAuthToken();

      if (!token) {
        setStatus("error");
        setMessage(
          "Your login session could not be found. Sign in and check your order history before attempting another payment."
        );
        return;
      }

      const encodedData = searchParams.get("data");
      const callbackData = encodedData
        ? decodeEsewaData(encodedData)
        : null;

      if (encodedData && !callbackData) {
        setStatus("error");
        setMessage(
          "We couldn't read eSewa's payment response. Please check your order history before trying again."
        );
        return;
      }

      const transactionUuid =
        callbackData?.transaction_uuid ||
        searchParams.get("transaction_uuid");

      if (!transactionUuid) {
        setStatus("error");
        setMessage(
          "The transaction reference is missing. Please check your order history before attempting another payment."
        );
        return;
      }

      // These checks help detect callback problems. The backend remains
      // responsible for confirming payment with eSewa.
      if (
        callbackData &&
        (callbackData.product_code !== "EPAYTEST" ||
          callbackData.status !== "COMPLETE")
      ) {
        setStatus("pending");
        setMessage(
          "eSewa has not returned a completed test transaction. Check your order history before trying again."
        );
        return;
      }

      const controller = new AbortController();

      timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const url = `${API_BASE_URL}/api/payments/esewa/verify`;

        console.info("[eSewa] Calling backend verification:", url);
        console.info("[eSewa] Transaction reference:", transactionUuid);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transaction_uuid: transactionUuid,
          }),
          signal: controller.signal,
        });

        const data = await readResponse(response);

        console.info("[eSewa] Backend verification response:", data);

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
            "The backend has not confirmed this payment as paid. Check your order history before making another payment."
          );
        }
      } catch (error) {
        if (cancelled) return;

        console.error("[eSewa] Verification error:", error);

        setStatus("error");

        if (error.name === "AbortError") {
          setMessage(
            "Verification timed out because the backend did not respond within 20 seconds. Your payment status is not yet confirmed. Check your order history before trying again."
          );
        } else {
          setMessage(
            error.message ||
              "We couldn't verify your payment. Please check your order history."
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
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
            style={{
              margin: "0 auto 24px",
              animation: "spin 1s linear infinite",
            }}
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

        <h1
          style={{
            fontSize: "27px",
            fontWeight: 400,
            marginBottom: "16px",
          }}
        >
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
