
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Package,
    MapPin,
    CreditCard,
    LoaderCircle,
    AlertCircle,
    CheckCircle2,
    Clock3,
    XCircle,
} from "lucide-react";

import "./OrderDetails.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token")
    );
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-NP", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function readableStatus(value) {
    return String(value || "PENDING").replaceAll("_", " ");
}

function statusIcon(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "DELIVERED") {
        return <CheckCircle2 size={19} />;
    }

    if (normalized === "CANCELLED") {
        return <XCircle size={19} />;
    }

    if (normalized === "SHIPPED") {
        return <Package size={19} />;
    }

    return <Clock3 size={19} />;
}

function OrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [cancelling, setCancelling] = useState(false);
    const [cancelMessage, setCancelMessage] = useState("");
    const [cancelError, setCancelError] = useState("");

    const loadOrder = useCallback(async () => {
        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: `/account/orders/${orderId}` },
                replace: true,
            });
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/orders/${orderId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");

                navigate("/login", {
                    state: { from: `/account/orders/${orderId}` },
                    replace: true,
                });
                return;
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(
                        "This order could not be found in your account."
                    );
                }

                throw new Error("Unable to load this order.");
            }

            setOrder(await response.json());
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }, [navigate, orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const handleCancelOrder = async () => {
        if (!order || cancelling) return;

        if (String(order.status).toUpperCase() !== "PENDING") {
            setCancelError("Only pending orders can be cancelled.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to cancel this order?"
        );

        if (!confirmed) return;

        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: `/account/orders/${orderId}` },
                replace: true,
            });
            return;
        }

        setCancelling(true);
        setCancelMessage("");
        setCancelError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/orders/${orderId}/cancel`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        reason: "Customer requested cancellation",
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");

                navigate("/login", {
                    state: { from: `/account/orders/${orderId}` },
                    replace: true,
                });
                return;
            }

            if (!response.ok) {
                const detail = Array.isArray(data.detail)
                    ? data.detail
                          .map((item) => item.msg || "Invalid request")
                          .join(", ")
                    : typeof data.detail === "string"
                      ? data.detail
                      : "Unable to cancel this order.";

                throw new Error(detail);
            }

            setCancelMessage("Your order has been cancelled successfully.");

            // Refresh the order to show the latest status and history.
            await loadOrder();
        } catch (err) {
            setCancelError(
                err.message || "Something went wrong while cancelling."
            );
        } finally {
            setCancelling(false);
        }
    };

    const normalizedStatus = String(order?.status || "")
        .trim()
        .toUpperCase();

    const canCancel = normalizedStatus === "PENDING";

    const subtotal = order?.subtotal ?? 0;
    const shippingFee = order?.shipping_fee ?? 0;
    const total = order?.total_amount ?? order?.total ?? 0;

    const shippingAddress = order?.shipping_address || {
        full_name: order?.shipping_full_name,
        phone: order?.shipping_phone,
        address_line: order?.shipping_address_line,
        city: order?.shipping_city,
        province: order?.shipping_province,
        landmark: order?.shipping_landmark,
        postal_code: order?.shipping_postal_code,
    };

    return (
        <main className="order-details-page">
            <div className="order-details-container">
                <button
                    type="button"
                    className="order-details-back"
                    onClick={() => navigate("/account/orders")}
                >
                    <ArrowLeft size={16} />
                    Back to orders
                </button>

                {loading ? (
                    <div className="order-details-loading">
                        <LoaderCircle
                            size={26}
                            className="order-details-spinner"
                        />
                        <p>Loading your order...</p>
                    </div>
                ) : error ? (
                    <section className="order-details-error">
                        <AlertCircle size={27} />
                        <h1>Order unavailable</h1>
                        <p>{error}</p>
                        <button type="button" onClick={loadOrder}>
                            Try again
                        </button>
                    </section>
                ) : order ? (
                    <>
                        <header className="order-details-header">
                            <p className="order-details-eyebrow">
                                HIMORA LIFESTYLE
                            </p>
                            <h1>Order Details</h1>
                            <p>
                                Thank you for choosing pieces made to
                                accompany your everyday life.
                            </p>
                        </header>

                        <section className="order-confirmation-banner">
                            <div className="order-confirmation-icon">
                                {statusIcon(order.status)}
                            </div>
                            <div>
                                <p className="order-confirmation-label">
                                    ORDER STATUS
                                </p>
                                <h2>{readableStatus(order.status)}</h2>
                                <p>
                                    Order placed{" "}
                                    {formatDate(order.created_at)}
                                </p>
                            </div>
                        </section>

                        <section className="order-details-card">
                            <div className="order-details-card-heading">
                                <div>
                                    <p className="order-details-eyebrow">
                                        ORDER REFERENCE
                                    </p>
                                    <h2>
                                        {order.order_number ||
                                            `Order #${order.id}`}
                                    </h2>
                                </div>

                                <span
                                    className={`order-details-status ${normalizedStatus
                                        .toLowerCase()
                                        .replaceAll("_", "-")}`}
                                >
                                    {readableStatus(order.status)}
                                </span>
                            </div>

                            <div className="order-details-section">
                                <h3>
                                    <Package size={18} />
                                    Items ordered
                                </h3>

                                {Array.isArray(order.items) &&
                                order.items.length > 0 ? (
                                    <div className="order-details-items">
                                        {order.items.map((item, index) => (
                                            <article
                                                className="order-details-item"
                                                key={item.id ?? index}
                                            >
                                                <div className="order-item-placeholder">
                                                    <Package size={22} />
                                                </div>

                                                <div className="order-item-information">
                                                    <h4>
                                                        {item.product_name ||
                                                            item.name ||
                                                            "HIMORA Product"}
                                                    </h4>

                                                    {item.sku && (
                                                        <p>SKU: {item.sku}</p>
                                                    )}

                                                    {(item.size ||
                                                        item.color) && (
                                                        <p>
                                                            {[
                                                                item.size,
                                                                item.color,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    )}

                                                    <p>
                                                        Quantity:{" "}
                                                        {item.quantity ?? 1}
                                                    </p>
                                                </div>

                                                <strong className="order-item-price">
                                                    {formatCurrency(
                                                        item.subtotal ??
                                                            Number(
                                                                item.unit_price ??
                                                                    0
                                                            ) *
                                                                Number(
                                                                    item.quantity ??
                                                                        1
                                                                )
                                                    )}
                                                </strong>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="order-details-muted">
                                        Item information isn't available.
                                    </p>
                                )}
                            </div>

                            <div className="order-details-section">
                                <h3>
                                    <CreditCard size={18} />
                                    Payment summary
                                </h3>

                                <div className="order-price-row">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>

                                <div className="order-price-row">
                                    <span>Shipping</span>
                                    <span>
                                        {Number(shippingFee) === 0
                                            ? "Complimentary"
                                            : formatCurrency(shippingFee)}
                                    </span>
                                </div>

                                <div className="order-price-row order-grand-total">
                                    <strong>Total</strong>
                                    <strong>{formatCurrency(total)}</strong>
                                </div>

                                <div className="order-payment-information">
                                    <div>
                                        <span>Payment method</span>
                                        <strong>
                                            {readableStatus(
                                                order.payment_method ||
                                                    "CASH_ON_DELIVERY"
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Payment status</span>
                                        <strong>
                                            {readableStatus(
                                                order.payment_status ||
                                                    order.payment
                                                        ?.payment_status ||
                                                    "PENDING"
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {shippingAddress &&
                                (shippingAddress.full_name ||
                                    shippingAddress.address_line) && (
                                    <div className="order-details-section">
                                        <h3>
                                            <MapPin size={18} />
                                            Delivery address
                                        </h3>

                                        <div className="order-delivery-address">
                                            {shippingAddress.full_name && (
                                                <strong>
                                                    {shippingAddress.full_name}
                                                </strong>
                                            )}
                                            {shippingAddress.phone && (
                                                <p>{shippingAddress.phone}</p>
                                            )}
                                            <p>
                                                {[
                                                    shippingAddress.address_line,
                                                    shippingAddress.landmark,
                                                    shippingAddress.city,
                                                    shippingAddress.province,
                                                    shippingAddress.postal_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                            {Array.isArray(order.status_history) &&
                                order.status_history.length > 0 && (
                                    <div className="order-details-section">
                                        <h3>
                                            <Clock3 size={18} />
                                            Order updates
                                        </h3>

                                        <div className="order-timeline">
                                            {order.status_history.map(
                                                (entry, index) => (
                                                    <div
                                                        className="order-timeline-entry"
                                                        key={entry.id ?? index}
                                                    >
                                                        <span className="order-timeline-dot" />
                                                        <div>
                                                            <strong>
                                                                {readableStatus(
                                                                    entry.status
                                                                )}
                                                            </strong>
                                                            {entry.created_at && (
                                                                <p>
                                                                    {formatDate(
                                                                        entry.created_at
                                                                    )}
                                                                </p>
                                                            )}
                                                            {entry.note && (
                                                                <p>
                                                                    {entry.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                        </section>

                        <div className="order-details-actions">
                            <button
                                type="button"
                                className="order-details-primary-button"
                                onClick={() => navigate("/collections")}
                            >
                                Continue shopping
                            </button>

                            <button
                                type="button"
                                className="order-details-secondary-button"
                                onClick={() => navigate("/account/orders")}
                            >
                                View all orders
                            </button>

                            {canCancel && (
                                <button
                                    type="button"
                                    className="order-cancel-button"
                                    onClick={handleCancelOrder}
                                    disabled={cancelling}
                                >
                                    {cancelling ? (
                                        <>
                                            <LoaderCircle
                                                size={16}
                                                className="order-details-spinner"
                                            />
                                            Cancelling...
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={16} />
                                            Cancel Order
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {cancelMessage && (
                            <p
                                role="status"
                                className="order-cancel-success"
                            >
                                {cancelMessage}
                            </p>
                        )}

                        {cancelError && (
                            <p
                                role="alert"
                                className="order-cancel-error"
                            >
                                {cancelError}
                            </p>
                        )}
                    </>
                ) : null}
            </div>
        </main>
    );
}

export default OrderDetails;