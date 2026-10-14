import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  CreditCard,
} from "lucide-react";
import "./AdminOrderDetail.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const STATUS_FLOW = {
  PENDING: {
    status: "CONFIRMED",
    label: "Confirm order",
    description: "Confirm that the order has been accepted.",
  },
  CONFIRMED: {
    status: "PROCESSING",
    label: "Start processing",
    description: "Begin preparing the customer's order.",
  },
  PROCESSING: {
    status: "SHIPPED",
    label: "Mark as shipped",
    description: "Mark the package as handed over for shipping.",
  },
  SHIPPED: {
    status: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    description: "Mark the package as out for delivery.",
  },
  OUT_FOR_DELIVERY: {
    status: "DELIVERED",
    label: "Mark as delivered",
    description: "Confirm that the customer received the order.",
  },
};

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail || data.message
        : data;

    throw new Error(
      typeof detail === "string"
        ? detail
        : "The request could not be completed."
    );
  }

  return data;
}

function getToken() {
  return localStorage.getItem("access_token");
}

function formatCurrency(amount) {
  return `NPR ${Number(amount || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(value) {
  return String(value || "PENDING").toUpperCase();
}

function formatStatus(value) {
  return normalizeStatus(value).replaceAll("_", " ");
}

function getStatusClass(value) {
  return `admin-order-status admin-order-status-${normalizeStatus(value)
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function getOrderNumber(order) {
  return (
    order?.order_number ||
    `ORD-${String(order?.id || "").padStart(5, "0")}`
  );
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getItemName(item) {
  return (
    item?.product_name ||
    item?.product?.name ||
    item?.variant?.product?.name ||
    item?.product_variant?.product?.name ||
    "Product"
  );
}

function getItemSku(item) {
  return (
    item?.sku ||
    item?.product_variant?.sku ||
    item?.variant?.sku ||
    "—"
  );
}

function getItemUnitPrice(item) {
  return Number(
    item?.unit_price ??
      item?.price ??
      item?.product_variant?.price ??
      item?.variant?.price ??
      0
  );
}

function getItemSubtotal(item) {
  return Number(
    item?.subtotal ??
      item?.total_price ??
      getItemUnitPrice(item) * Number(item?.quantity || 0)
  );
}

function getShippingAddress(order) {
  if (!order || typeof order !== "object") return null;

  const address =
    order.shipping_address ??
    order.address ??
    order.user_address ??
    null;

  return address && typeof address === "object" ? address : null;
}

function getCustomerName(order) {
  if (!order || typeof order !== "object") return "Customer";

  const address = getShippingAddress(order);

  return (
    order.customer_name ||
    order.shipping_full_name ||
    order.user?.full_name ||
    order.user?.name ||
    address?.full_name ||
    [address?.first_name, address?.last_name].filter(Boolean).join(" ") ||
    "Customer"
  );
}

function getCustomerEmail(order) {
  if (!order || typeof order !== "object") return "";

  return (
    order.customer_email ||
    order.shipping_email ||
    order.user?.email ||
    ""
  );
}

function getCustomerPhone(order) {
  if (!order || typeof order !== "object") return "";

  const address = getShippingAddress(order);

  return (
    order.customer_phone ||
    order.shipping_phone ||
    order.user?.phone ||
    address?.phone ||
    ""
  );
}

function getPayment(order) {
  if (!order || typeof order !== "object") return null;

  if (Array.isArray(order.payments) && order.payments.length > 0) {
    return order.payments[0];
  }

  return order.payment || null;
}

function getPaymentMethod(order) {
  if (!order || typeof order !== "object") return "Not specified";

  const payment = getPayment(order);

  return (
    order.payment_method ||
    payment?.payment_method ||
    payment?.method ||
    "Not specified"
  );
}

function getPaymentStatus(order) {
  if (!order || typeof order !== "object") return "PENDING";

  const payment = getPayment(order);

  return normalizeStatus(
    order.payment_status ||
      payment?.status ||
      payment?.payment_status ||
      "PENDING"
  );
}

function getPaymentReference(order) {
  const payment = getPayment(order);

  return (
    payment?.transaction_id ||
    payment?.transaction_reference ||
    payment?.reference ||
    payment?.id ||
    ""
  );
}

function getStatusHistory(order) {
  if (Array.isArray(order?.status_history)) return order.status_history;

  if (Array.isArray(order?.order_status_history)) {
    return order.order_status_history;
  }

  return [];
}

function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const fetchOrder = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const token = getToken();

        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await parseResponse(response);

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("The server returned invalid order details.");
        }

        setOrder(data);
      } catch (err) {
        setError(err.message || "Failed to load order details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateStatus = async (nextStatus) => {
    if (!order || updatingStatus) return;

    const currentStatus = normalizeStatus(order.status);

    if (nextStatus === "CANCELLED") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order? This action may affect inventory and payment handling."
      );

      if (!confirmed) return;
    }

    if (currentStatus === "CANCELLED" || currentStatus === "DELIVERED") {
      setError(
        "This order can no longer be updated through the status workflow."
      );
      return;
    }

    setUpdatingStatus(true);
    setError("");
    setStatusMessage("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const payload = { status: nextStatus };

      if (statusNote.trim()) {
        payload.note = statusNote.trim();
      }

      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseResponse(response);

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.id
      ) {
        setOrder(data);
      } else {
        await fetchOrder({ silent: true });
      }

      setStatusNote("");
      setStatusMessage(
        `Order status updated to ${formatStatus(nextStatus)}.`
      );
    } catch (err) {
      setError(err.message || "Failed to update order status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const cancelOrder = () => updateStatus("CANCELLED");

  const orderItems = useMemo(() => getOrderItems(order), [order]);
  const history = useMemo(() => getStatusHistory(order), [order]);

  const currentStatus = normalizeStatus(order?.status);
  const nextStatus = STATUS_FLOW[currentStatus] || null;
  const address = getShippingAddress(order);
  const paymentStatus = getPaymentStatus(order);
  const paymentReference = getPaymentReference(order);

  const subtotal = Number(
    order?.subtotal ??
      orderItems.reduce((total, item) => total + getItemSubtotal(item), 0)
  );

  const shippingFee = Number(
    order?.shipping_fee ?? order?.shipping_cost ?? 0
  );

  const discount = Number(
    order?.discount_amount ?? order?.discount ?? 0
  );

  const tax = Number(order?.tax_amount ?? order?.tax ?? 0);

  const totalAmount = Number(
    order?.total_amount ??
      order?.grand_total ??
      subtotal + shippingFee + tax - discount
  );

  if (loading) {
    return (
      <main className="admin-order-detail-page">
        <div className="admin-order-detail-loading">
          <RefreshCw size={23} className="admin-order-spin" />
          <span>Loading order details...</span>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="admin-order-detail-page">
        <button
          type="button"
          className="admin-order-back"
          onClick={() => navigate("/admin/orders")}
        >
          <ArrowLeft size={17} />
          Back to orders
        </button>

        <section className="admin-order-detail-error">
          <AlertCircle size={24} />
          <h2>Unable to load order</h2>
          <p>{error || "Order details are unavailable."}</p>

          <div className="admin-order-error-actions">
            <button
              type="button"
              className="admin-order-primary-button"
              onClick={() => fetchOrder()}
            >
              <RefreshCw size={15} />
              Try again
            </button>

            <button
              type="button"
              className="admin-order-secondary-button"
              onClick={() => navigate("/admin/orders")}
            >
              Back to orders
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-order-detail-page">
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
          onClick={() => fetchOrder({ silent: true })}
          disabled={refreshing || updatingStatus}
        >
          <RefreshCw
            size={15}
            className={refreshing ? "admin-order-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="admin-order-inline-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className="admin-order-success" role="status">
          <Check size={17} />
          <span>{statusMessage}</span>
        </div>
      )}

      <header className="admin-order-detail-header">
        <div>
          <p className="admin-orders-eyebrow">ORDER MANAGEMENT</p>
          <h1>{getOrderNumber(order)}</h1>
          <p className="admin-order-placed">
            Placed on {formatDateTime(order.created_at)}
          </p>
        </div>

        <span className={getStatusClass(currentStatus)}>
          <span className="admin-order-status-dot" />
          {formatStatus(currentStatus)}
        </span>
      </header>

      <section className="admin-order-summary-strip">
        <div>
          <span>Order total</span>
          <strong>{formatCurrency(totalAmount)}</strong>
        </div>

        <div>
          <span>Items</span>
          <strong>
            {orderItems.reduce(
              (total, item) => total + Number(item?.quantity || 0),
              0
            )}
          </strong>
        </div>

        <div>
          <span>Payment</span>
          <strong className="admin-order-summary-payment">
            {formatStatus(paymentStatus)}
          </strong>
        </div>
      </section>

      <div className="admin-order-detail-grid">
        <section className="admin-order-detail-main">
          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>ORDER ITEMS</span>
                <h2>Purchased pieces</h2>
              </div>
              <Package size={20} />
            </div>

            {orderItems.length === 0 ? (
              <div className="admin-order-empty-items">
                No order items are available for this order.
              </div>
            ) : (
              <div className="admin-order-items">
                {orderItems.map((item, index) => {
                  const quantity = Number(item?.quantity || 0);
                  const imageUrl =
                    item?.image_url ||
                    item?.product_image ||
                    item?.product?.image_url ||
                    item?.product?.primary_image ||
                    item?.variant?.product?.image_url ||
                    item?.product_variant?.product?.image_url;

                  return (
                    <div
                      className="admin-order-item"
                      key={item?.id ?? `${item?.product_id}-${index}`}
                    >
                      <div className="admin-order-item-image">
                        {imageUrl ? (
                          <img
                            src={
                              imageUrl.startsWith("http")
                                ? imageUrl
                                : `${API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
                            }
                            alt={getItemName(item)}
                          />
                        ) : (
                          <Package size={22} />
                        )}
                      </div>

                      <div className="admin-order-item-info">
                        <h3>{getItemName(item)}</h3>
                        <p>SKU: {getItemSku(item)}</p>

                        {(item?.size || item?.color) && (
                          <p className="admin-order-item-attributes">
                            {item?.size && `Size: ${item.size}`}
                            {item?.size && item?.color && " · "}
                            {item?.color && `Color: ${item.color}`}
                          </p>
                        )}

                        <p className="admin-order-item-unit-price">
                          {formatCurrency(getItemUnitPrice(item))} each
                        </p>
                      </div>

                      <div className="admin-order-item-quantity">
                        × {quantity}
                      </div>

                      <div className="admin-order-item-price">
                        {formatCurrency(getItemSubtotal(item))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="admin-order-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>

              {discount > 0 && (
                <div>
                  <span>Discount</span>
                  <strong className="admin-order-discount">
                    − {formatCurrency(discount)}
                  </strong>
                </div>
              )}

              {tax > 0 && (
                <div>
                  <span>Tax</span>
                  <strong>{formatCurrency(tax)}</strong>
                </div>
              )}

              <div>
                <span>Shipping</span>
                <strong>{formatCurrency(shippingFee)}</strong>
              </div>

              <div className="admin-order-total">
                <span>Total</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </div>
          </article>

          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>ORDER TIMELINE</span>
                <h2>Status history</h2>
              </div>
              <Clock size={20} />
            </div>

            {history.length === 0 ? (
              <div className="admin-order-empty-history">
                <Clock size={19} />
                <span>No status history is available for this order.</span>
              </div>
            ) : (
              <div className="admin-order-timeline">
                {[...history]
                  .sort(
                    (a, b) =>
                      new Date(a.created_at || 0).getTime() -
                      new Date(b.created_at || 0).getTime()
                  )
                  .map((entry, index) => (
                    <div
                      className="admin-order-timeline-item"
                      key={entry.id ?? `${entry.status}-${index}`}
                    >
                      <div className="admin-order-timeline-marker">
                        <Check size={11} />
                      </div>

                      <div className="admin-order-timeline-content">
                        <strong>{formatStatus(entry.status)}</strong>
                        <p>{entry.note || "Order status updated."}</p>
                        <small>{formatDateTime(entry.created_at)}</small>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>
        </section>

        <aside className="admin-order-detail-sidebar">
          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>FULFILLMENT</span>
                <h2>Update status</h2>
              </div>
              <Truck size={20} />
            </div>

            <div className="admin-order-status-control">
              <p className="admin-order-current-status">
                Current status
                <strong>{formatStatus(currentStatus)}</strong>
              </p>

              {nextStatus ? (
                <>
                  <p className="admin-order-status-description">
                    {nextStatus.description}
                  </p>

                  <label
                    className="admin-order-note-label"
                    htmlFor="admin-order-status-note"
                  >
                    Status note (optional)
                  </label>

                  <textarea
                    id="admin-order-status-note"
                    className="admin-order-note-input"
                    rows={3}
                    maxLength={500}
                    placeholder="Add an internal note or delivery update..."
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    disabled={updatingStatus}
                  />

                  <button
                    type="button"
                    className="admin-order-primary-button admin-order-status-button"
                    onClick={() => updateStatus(nextStatus.status)}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <RefreshCw size={15} className="admin-order-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    {updatingStatus ? "Updating..." : nextStatus.label}
                  </button>
                </>
              ) : (
                <div className="admin-order-terminal-status">
                  <ShieldCheck size={19} />
                  <p>
                    {currentStatus === "CANCELLED"
                      ? "This order has been cancelled."
                      : currentStatus === "DELIVERED"
                        ? "This order has been delivered."
                        : "No further status transition is available."}
                  </p>
                </div>
              )}

              {!["CANCELLED", "DELIVERED"].includes(currentStatus) && (
                <button
                  type="button"
                  className="admin-order-cancel-button"
                  onClick={cancelOrder}
                  disabled={updatingStatus}
                >
                  Cancel order
                </button>
              )}
            </div>
          </article>

          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>CUSTOMER INFORMATION</span>
                <h2>Customer details</h2>
              </div>
              <UserRound size={20} />
            </div>

            <div className="admin-order-information">
              <div className="admin-order-information-row">
                <span>Full name</span>
                <strong>{getCustomerName(order)}</strong>
              </div>

              <div className="admin-order-information-row">
                <span>Email address</span>
                <strong className="admin-order-break-word">
                  {getCustomerEmail(order) || "Not provided"}
                </strong>
              </div>

              <div className="admin-order-information-row">
                <span>Phone number</span>
                <strong>{getCustomerPhone(order) || "Not provided"}</strong>
              </div>
            </div>
          </article>

          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>DELIVERY</span>
                <h2>Shipping address</h2>
              </div>
              <MapPin size={20} />
            </div>

            {address ? (
              <div className="admin-order-address">
                <strong>
                  {address.full_name ||
                    [address.first_name, address.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    getCustomerName(order)}
                </strong>

                {address.address_line1 && <p>{address.address_line1}</p>}
                {address.address_line2 && <p>{address.address_line2}</p>}
                {address.street && <p>{address.street}</p>}
                {address.city && <p>{address.city}</p>}

                {(address.state || address.province) && (
                  <p>{address.state || address.province}</p>
                )}

                {address.postal_code && <p>{address.postal_code}</p>}
                {address.country && <p>{address.country}</p>}

                {address.phone && (
                  <p className="admin-order-address-phone">
                    Phone: {address.phone}
                  </p>
                )}
              </div>
            ) : (
              <div className="admin-order-address admin-order-address-empty">
                <MapPin size={18} />
                <p>No shipping address was recorded.</p>
              </div>
            )}
          </article>

          <article className="admin-order-panel">
            <div className="admin-order-panel-heading">
              <div>
                <span>PAYMENT</span>
                <h2>Payment details</h2>
              </div>
              <CreditCard size={20} />
            </div>

            <div className="admin-order-information">
              <div className="admin-order-information-row">
                <span>Payment method</span>
                <strong>{getPaymentMethod(order)}</strong>
              </div>

              <div className="admin-order-information-row">
                <span>Payment status</span>
                <span
                  className={`admin-order-payment-badge admin-order-payment-${paymentStatus
                    .toLowerCase()
                    .replaceAll("_", "-")}`}
                >
                  {formatStatus(paymentStatus)}
                </span>
              </div>

              <div className="admin-order-information-row">
                <span>Transaction reference</span>
                <strong className="admin-order-break-word">
                  {paymentReference || "Not available"}
                </strong>
              </div>

              <div className="admin-order-information-row">
                <span>Order total</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}

export default AdminOrderDetail;