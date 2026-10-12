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

    const loadOrder = useCallback(async () => {
        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: {
                    from: `/account/orders/${orderId}`,
                },
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
                    state: {
                        from: `/account/orders/${orderId}`,
                    },
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

            const data = await response.json();
            setOrder(data);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }, [navigate, orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

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

                        <button
                            type="button"
                            onClick={loadOrder}
                        >
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
                                    {formatDate(
                                        order.created_at || order.order_date
                                    )}
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
                                    className={`order-details-status ${String(
                                        order.status || "PENDING"
                                    )
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
                                                key={
                                                    item.id ??
                                                    `${item.product_name}-${index}`
                                                }
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
                                                        <p>
                                                            SKU: {item.sku}
                                                        </p>
                                                    )}

                                                    {(item.size || item.color) && (
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
                                                                    item.price ??
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
                                        Item information isn't available in
                                        this response.
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
                                    <span>
                                        {formatCurrency(order.subtotal)}
                                    </span>
                                </div>

                                <div className="order-price-row">
                                    <span>Shipping</span>
                                    <span>
                                        {Number(order.shipping_fee || 0) === 0
                                            ? "Complimentary"
                                            : formatCurrency(
                                                  order.shipping_fee
                                              )}
                                    </span>
                                </div>

                                <div className="order-price-row order-grand-total">
                                    <strong>Total</strong>
                                    <strong>
                                        {formatCurrency(order.total)}
                                    </strong>
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
                                                    "PENDING"
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {order.shipping_address && (
                                <div className="order-details-section">
                                    <h3>
                                        <MapPin size={18} />
                                        Delivery address
                                    </h3>

                                    <div className="order-delivery-address">
                                        {typeof order.shipping_address ===
                                        "string" ? (
                                            <p>{order.shipping_address}</p>
                                        ) : (
                                            <>
                                                {order.shipping_address.full_name && (
                                                    <strong>
                                                        {
                                                            order.shipping_address
                                                                .full_name
                                                        }
                                                    </strong>
                                                )}

                                                {order.shipping_address.phone && (
                                                    <p>
                                                        {
                                                            order.shipping_address
                                                                .phone
                                                        }
                                                    </p>
                                                )}

                                                <p>
                                                    {[
                                                        order.shipping_address
                                                            .address_line,
                                                        order.shipping_address
                                                            .city,
                                                        order.shipping_address
                                                            .province,
                                                        order.shipping_address
                                                            .postal_code,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </p>
                                            </>
                                        )}
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
                                                        key={
                                                            entry.id ?? index
                                                        }
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
                        </div>
                    </>
                ) : null}
            </div>
        </main>
    );
}

export default OrderDetails;