import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    MapPin,
    Package,
    UserRound,
    ShoppingBag,
    LoaderCircle,
    AlertCircle,
} from "lucide-react";

import "./Account.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatPrice(value) {
    return `NPR ${Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function Account() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadAccount() {
            const token = localStorage.getItem("access_token");

            if (!token) {
                navigate("/login", {
                    replace: true,
                    state: { from: "/account" },
                });
                return;
            }

            try {
                const storedUser = JSON.parse(
                    localStorage.getItem("user") || "null"
                );

                if (cancelled) return;

                setUser(storedUser);

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
                    localStorage.removeItem("user");
                    localStorage.removeItem("userName");
                    localStorage.removeItem("isAdmin");

                    window.dispatchEvent(
                        new Event("himora-auth-updated")
                    );

                    navigate("/login", {
                        replace: true,
                        state: { from: "/account" },
                    });

                    return;
                }

                if (!response.ok) {
                    throw new Error("Unable to load your orders.");
                }

                const data = await response.json();

                if (!cancelled) {
                    setOrders(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message ||
                        "Something went wrong while loading your account."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAccount();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const customerName =
        user?.full_name ||
        user?.name ||
        localStorage.getItem("userName") ||
        "HIMORA Customer";

    const customerEmail = user?.email || "";

    const recentOrders = [...orders]
        .sort(
            (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
        )
        .slice(0, 3);

    return (
        <main className="account-page">
            <section className="account-hero">
                <div className="account-breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <span>My Account</span>
                </div>

                <p className="account-eyebrow">
                    YOUR HIMORA EXPERIENCE
                </p>

                <h1>
                    Welcome back,
                    <br />
                    <span>{customerName}</span>
                </h1>

                <p className="account-hero-description">
                    Manage your personal details, delivery
                    addresses and purchases in one place.
                </p>
            </section>

            <section className="account-content">
                <div className="account-profile-strip">
                    <div className="account-avatar">
                        <UserRound size={25} strokeWidth={1.3} />
                    </div>

                    <div className="account-profile-info">
                        <span>YOUR ACCOUNT</span>
                        <h2>{customerName}</h2>
                        <p>
                            {customerEmail ||
                                "Your account information"}
                        </p>
                    </div>

                    <div className="account-member-label">
                        MEMBER
                    </div>
                </div>

                <div className="account-section-heading">
                    <div>
                        <p className="account-eyebrow">
                            ACCOUNT MANAGEMENT
                        </p>
                        <h2>Your account</h2>
                    </div>
                </div>

                <div className="account-shortcuts">
                    <Link
                        to="/account/orders"
                        className="account-shortcut"
                    >
                        <div className="account-shortcut-icon">
                            <Package size={22} strokeWidth={1.3} />
                        </div>

                        <div>
                            <h3>My Orders</h3>
                            <p>
                                View purchases and track order status.
                            </p>
                        </div>

                        <ArrowRight
                            className="account-shortcut-arrow"
                            size={19}
                        />
                    </Link>

                    <Link
                        to="/account/addresses"
                        className="account-shortcut"
                    >
                        <div className="account-shortcut-icon">
                            <MapPin size={22} strokeWidth={1.3} />
                        </div>

                        <div>
                            <h3>Saved Addresses</h3>
                            <p>
                                Manage your delivery information.
                            </p>
                        </div>

                        <ArrowRight
                            className="account-shortcut-arrow"
                            size={19}
                        />
                    </Link>

                    <div className="account-shortcut account-shortcut-static">
                        <div className="account-shortcut-icon">
                            <UserRound
                                size={22}
                                strokeWidth={1.3}
                            />
                        </div>

                        <div>
                            <h3>Personal Information</h3>
                            <p>
                                {customerEmail ||
                                    "Your registered account details."}
                            </p>
                            <span className="account-coming-soon">
                                PROFILE MANAGEMENT COMING NEXT
                            </span>
                        </div>
                    </div>
                </div>

                <div className="account-orders-section">
                    <div className="account-orders-heading">
                        <div>
                            <p className="account-eyebrow">
                                YOUR PURCHASES
                            </p>
                            <h2>Recent orders</h2>
                        </div>

                        <Link
                            to="/account/orders"
                            className="account-view-all"
                        >
                            View all orders
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="account-state">
                            <LoaderCircle
                                size={24}
                                className="account-spinner"
                            />
                            <p>Loading your orders...</p>
                        </div>
                    ) : error ? (
                        <div className="account-state account-state-error">
                            <AlertCircle size={22} />
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                            >
                                Try again
                            </button>
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="account-empty-orders">
                            <ShoppingBag
                                size={32}
                                strokeWidth={1.2}
                            />
                            <h3>Your story with HIMORA starts here.</h3>
                            <p>
                                You haven't placed an order yet.
                                Explore the collection to discover
                                your next favourite piece.
                            </p>
                            <Link
                                to="/collections"
                                className="account-shop-link"
                            >
                                Explore the collection
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <div className="account-order-list">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/account/orders/${order.id}`}
                                    className="account-order-row"
                                >
                                    <div className="account-order-icon">
                                        <Package
                                            size={21}
                                            strokeWidth={1.3}
                                        />
                                    </div>

                                    <div className="account-order-main">
                                        <h3>
                                            {order.order_number ||
                                                `Order #${order.id}`}
                                        </h3>
                                        <p>
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>

                                    <div className="account-order-total">
                                        <span>Total</span>
                                        <strong>
                                            {formatPrice(
                                                order.total_amount
                                            )}
                                        </strong>
                                    </div>

                                    <span
                                        className={`account-order-status status-${String(
                                            order.status || "pending"
                                        ).toLowerCase()}`}
                                    >
                                        {String(
                                            order.status || "PENDING"
                                        ).replaceAll("_", " ")}
                                    </span>

                                    <ArrowRight
                                        size={17}
                                        className="account-order-arrow"
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default Account;