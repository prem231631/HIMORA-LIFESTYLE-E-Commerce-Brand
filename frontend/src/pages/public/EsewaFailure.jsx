import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, ShoppingBag } from "lucide-react";

function EsewaFailure() {
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

        <AlertCircle
          size={52}
          strokeWidth={1.4}
          style={{ margin: "0 auto 24px", color: "#98734c" }}
        />

        <h1
          style={{
            fontSize: "27px",
            fontWeight: 400,
            marginBottom: "16px",
          }}
        >
          Payment Not Completed
        </h1>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.9,
            color: "#716d64",
            marginBottom: "16px",
          }}
        >
          Your eSewa payment could not be confirmed. This does not necessarily
          mean that no payment was made.
        </p>

        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.8,
            color: "#716d64",
            marginBottom: "30px",
          }}
        >
          Please check your order history and payment status before attempting
          another payment. If money was deducted, contact support before
          retrying.
        </p>

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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "15px 20px",
              background: "#183d32",
              color: "#fffefa",
              textDecoration: "none",
              fontSize: "12px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            <ShoppingBag size={16} />
            View My Orders
          </Link>

          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "14px 20px",
              color: "#183d32",
              textDecoration: "none",
              border: "1px solid #ded8cc",
              fontSize: "12px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>
        </div>
      </section>
    </main>
  );
}

export default EsewaFailure;