import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Package,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Admin authentication token not found.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/orders/admin/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load order.");
      }

      setOrder(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    setError("");
    setStatusMessage("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Admin authentication token not found.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/orders/admin/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update order status."
        );
      }

      setOrder(data);

      setStatusMessage(
        `Order status updated to ${newStatus.replaceAll("_", " ")}.`
      );
    } catch (err) {
      setError(err.message || "Failed to update order status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const formatCurrency = (amount) => {
    return `NPR ${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDateTime = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "—";

    return status.replaceAll("_", " ");
  };

  const getStatusClass = (status) => {
    return `admin-order-status admin-order-status-${status
      ?.toLowerCase()
      .replaceAll("_", "-")}`;
  };

  const getNextStatus = () => {
    const statusFlow = {
      PENDING: {
        status: "CONFIRMED",
        label: "CONFIRM ORDER",
      },
      CONFIRMED: {
        status: "PROCESSING",
        label: "START PROCESSING",
      },
      PROCESSING: {
        status: "SHIPPED",
        label: "MARK AS SHIPPED",
      },
      SHIPPED: {
        status: "OUT_FOR_DELIVERY",
        label: "OUT FOR DELIVERY",
      },
      OUT_FOR_DELIVERY: {
        status: "DELIVERED",
        label: "MARK AS DELIVERED",
      },
    };

    return statusFlow[order?.status] || null;
  };

  if (loading) {
    return (
      <div className="admin-order-detail-page">
        <div className="admin-order-detail-loading">
          Loading order...
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="admin-order-detail-page">
        <div className="admin-order-detail-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchOrder}
            className="admin-order-detail-retry"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const nextStatus = getNextStatus();

  return (
    <div className="admin-order-detail-page">
      <div className="admin-order-detail-topbar">
        <button
          type="button"
          className="admin-order-back"
          onClick={() => navigate("/admin/orders")}
        >
          <ArrowLeft size={17} />
          Back to orders
        </button>

        <button
          type="button"
          className="admin-order-refresh"
          onClick={fetchOrder}
          disabled={loading || updatingStatus}
        >
          <RefreshCw
            size={16}
            className={loading ? "admin-order-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="admin-order-inline-error">
          {error}
        </div>
      )}

      <header className="admin-order-detail-header">
        <div>
          <p className="admin-orders-eyebrow">
            ORDER MANAGEMENT
          </p>

          <h1>{order.order_number}</h1>

          <p>
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>

        <span className={getStatusClass(order.status)}>
          {formatStatus(order.status)}
        </span>
      </header>

      <div className="admin-order-detail-grid">
        <section className="admin-order-detail-main">
          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>ORDER ITEMS</span>
                <h2>Purchased pieces</h2>
              </div>

              <Package size={20} />
            </div>

            <div className="admin-order-items">
              {order.items?.map((item) => (
                <div
                  className="admin-order-item"
                  key={item.id}
                >
                  <div className="admin-order-item-image">
                    <Package size={20} />
                  </div>

                  <div className="admin-order-item-info">
                    <h3>{item.product_name}</h3>

                    <p>SKU: {item.sku}</p>

                    {(item.size || item.color) && (
                      <p>
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " · "}
                        {item.color && `Color: ${item.color}`}
                      </p>
                    )}
                  </div>

                  <div className="admin-order-item-quantity">
                    × {item.quantity}
                  </div>

                  <div className="admin-order-item-price">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-order-totals">
              <div>
                <span>Subtotal</span>
                <strong>
                  {formatCurrency(order.subtotal)}
                </strong>
              </div>

              <div>
                <span>Shipping</span>
                <strong>
                  {formatCurrency(order.shipping_fee)}
                </strong>
              </div>

              <div className="admin-order-total">
                <span>Total</span>
                <strong>
                  {formatCurrency(order.total_amount)}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>ORDER TIMELINE</span>
                <h2>Status history</h2>
              </div>
            </div>

            <div className="admin-order-timeline">
              {order.status_history?.map((history) => (
                <div
                  className="admin-order-timeline-item"
                  key={history.id}
                >
                  <div className="admin-order-timeline-marker" />

                  <div>
                    <strong>
                      {formatStatus(history.status)}
                    </strong>

                    <p>
                      {history.note ||
                        "Order status updated."}
                    </p>

                    <small>
                      {formatDateTime(history.created_at)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="admin-order-detail-sidebar">
          {/* FULFILLMENT */}
          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>FULFILLMENT</span>
                <h2>Update status</h2>
              </div>

              <Check size={20} />
            </div>

            <div className="admin-order-status-control">
              <p>
                Current status:{" "}
                <strong>{formatStatus(order.status)}</strong>
              </p>

              {nextStatus && (
                <button
                  type="button"
                  onClick={() =>
                    updateStatus(nextStatus.status)
                  }
                  disabled={updatingStatus}
                  className="admin-order-status-update"
                >
                  {updatingStatus
                    ? "UPDATING..."
                    : nextStatus.label}
                </button>
              )}

              {order.status === "DELIVERED" && (
                <p className="admin-order-status-complete">
                  This order has been delivered.
                </p>
              )}

              {order.status === "CANCELLED" && (
                <p className="admin-order-status-complete">
                  This order has been cancelled.
                </p>
              )}

              {statusMessage && (
                <p className="admin-order-status-message">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>

          {/* CUSTOMER */}
          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>CUSTOMER</span>
                <h2>Customer details</h2>
              </div>
            </div>

            <div className="admin-order-information">
              <div>
                <span>Name</span>
                <strong>{order.customer_name}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{order.customer_email}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {order.customer_phone || "Not provided"}
                </strong>
              </div>
            </div>
          </div>

          {/* DELIVERY */}
          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>DELIVERY</span>
                <h2>Shipping address</h2>
              </div>
            </div>

            <div className="admin-order-information">
              <div>
                <span>Name</span>
                <strong>
                  {order.shipping_full_name}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{order.shipping_phone}</strong>
              </div>

              <div>
                <span>Address</span>
                <strong>
                  {order.shipping_address_line}
                </strong>
              </div>

              <div>
                <span>City</span>
                <strong>{order.shipping_city}</strong>
              </div>

              <div>
                <span>Province</span>
                <strong>{order.shipping_province}</strong>
              </div>

              {order.shipping_landmark && (
                <div>
                  <span>Landmark</span>
                  <strong>
                    {order.shipping_landmark}
                  </strong>
                </div>
              )}

              {order.shipping_postal_code && (
                <div>
                  <span>Postal code</span>
                  <strong>
                    {order.shipping_postal_code}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT */}
          <div className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>PAYMENT</span>
                <h2>Payment details</h2>
              </div>
            </div>

            <div className="admin-order-information">
              <div>
                <span>Method</span>
                <strong>{order.payment_method}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{order.payment_status}</strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>
                  {formatCurrency(order.total_amount)}
                </strong>
              </div>

              {order.payment?.paid_at && (
                <div>
                  <span>Paid at</span>
                  <strong>
                    {formatDateTime(order.payment.paid_at)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* NOTES */}
          {order.notes && (
            <div className="admin-order-panel">
              <div className="admin-order-panel-heading">
                <div>
                  <span>CUSTOMER NOTE</span>
                  <h2>Order notes</h2>
                </div>
              </div>

              <p className="admin-order-notes">
                {order.notes}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AdminOrderDetail;