import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Package,
    ShoppingBag,
    LoaderCircle,
    AlertCircle,
} from "lucide-react";

import "./Orders.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

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

    return date.toLocaleDateString("en-NP", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getStatusClass(status) {
    return String(status || "PENDING")
        .toLowerCase()
        .replaceAll("_", "-");
}

function Orders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadOrders = useCallback(async () => {
        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: "/account/orders" },
                replace: true,
            });
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/orders`,
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
                    state: { from: "/account/orders" },
                    replace: true,
                });
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load your orders.");
            }

            const data = await response.json();

            setOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(
                err.message || "Something went wrong while loading orders."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    return (
        <main className="customer-orders-page">
            <div className="customer-orders-container">
                <button
                    type="button"
                    className="customer-orders-back"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft size={16} />
                    Continue shopping
                </button>

                <header className="customer-orders-header">
                    <p className="customer-orders-eyebrow">
                        YOUR HIMORA ACCOUNT
                    </p>

                    <h1>Your Orders</h1>

                    <p>
                        Every order, thoughtfully prepared for you.
                    </p>
                </header>

                {error && (
                    <div className="customer-orders-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={loadOrders}
                        >
                            Try again
                        </button>
                    </div>
                )}

                <div className="customer-orders-section-heading">
                    <div>
                        <h2>Order history</h2>
                        <p>
                            {orders.length}{" "}
                            {orders.length === 1 ? "order" : "orders"}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="customer-orders-loading">
                        <LoaderCircle
                            size={25}
                            className="customer-orders-spinner"
                        />
                        <p>Loading your orders...</p>
                    </div>
                ) : error ? null : orders.length === 0 ? (
                    <section className="customer-orders-empty">
                        <div className="customer-orders-empty-icon">
                            <ShoppingBag size={27} />
                        </div>

                        <h2>Your story with HIMORA starts here.</h2>

                        <p>
                            You haven't placed an order yet. Discover
                            the collection and find something you'll love.
                        </p>

                        <button
                            type="button"
                            className="customer-orders-primary-button"
                            onClick={() => navigate("/collections")}
                        >
                            Explore collections
                            <ArrowRight size={16} />
                        </button>
                    </section>
                ) : (
                    <div className="customer-orders-list">
                        {orders.map((order) => (
                            <article
                                className="customer-order-card"
                                key={order.id}
                            >
                                <div className="customer-order-top">
                                    <div>
                                        <p className="customer-order-label">
                                            ORDER NUMBER
                                        </p>

                                        <h3>
                                            {order.order_number ||
                                                `Order #${order.id}`}
                                        </h3>
                                    </div>

                                    <span
                                        className={`customer-order-status ${getStatusClass(
                                            order.status
                                        )}`}
                                    >
                                        {String(
                                            order.status || "PENDING"
                                        ).replaceAll("_", " ")}
                                    </span>
                                </div>

                                <div className="customer-order-details">
                                    <div>
                                        <span>Order date</span>
                                        <strong>
                                            {formatDate(
                                                order.created_at ||
                                                order.order_date
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Payment method</span>
                                        <strong>
                                            {String(
                                                order.payment_method ||
                                                "CASH ON DELIVERY"
                                            ).replaceAll("_", " ")}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Payment status</span>
                                        <strong>
                                            {String(
                                                order.payment_status ||
                                                "PENDING"
                                            ).replaceAll("_", " ")}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Total amount</span>
                                        <strong className="customer-order-total">
                                            {formatCurrency(order.total)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="customer-order-footer">
                                    <div className="customer-order-items-label">
                                        <Package size={17} />
                                        <span>
                                            {Array.isArray(order.items)
                                                ? `${order.items.length} ${
                                                      order.items.length === 1
                                                          ? "item"
                                                          : "items"
                                                  }`
                                                : "Order details"}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="customer-order-view-button"
                                        onClick={() =>
                                            navigate(
                                                `/account/orders/${order.id}`
                                            )
                                        }
                                    >
                                        View order
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default Orders;