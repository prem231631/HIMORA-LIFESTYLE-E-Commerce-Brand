
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import "./Cart.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatPrice(price) {
    return `NPR ${Number(price || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function Cart() {
    const navigate = useNavigate();

    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingItem, setUpdatingItem] = useState(null);
    const [error, setError] = useState("");

    const fetchCart = useCallback(async () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setCart(null);
            setLoading(false);
            return;
        }

        try {
            setError("");

            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                localStorage.removeItem("isAdmin");
                navigate("/login");
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load your shopping bag.");
            }

            const data = await response.json();
            setCart(data);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const updateQuantity = async (item, quantity) => {
        if (quantity < 1 || updatingItem !== null) {
            return;
        }

        if (quantity > item.available_quantity) {
            setError(
                `Only ${item.available_quantity} units of ${item.product_name} are currently available.`
            );
            return;
        }

        const token = localStorage.getItem("access_token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setUpdatingItem(item.id);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/api/cart/items/${item.id}`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ quantity }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to update quantity."
                );
            }

            setCart(data);
            window.dispatchEvent(new Event("himora-cart-updated"));
        } catch (err) {
            setError(err.message || "Unable to update quantity.");
        } finally {
            setUpdatingItem(null);
        }
    };

    const removeItem = async (itemId) => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setUpdatingItem(itemId);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/api/cart/items/${itemId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to remove this item."
                );
            }

            setCart(data);
            window.dispatchEvent(new Event("himora-cart-updated"));
        } catch (err) {
            setError(err.message || "Unable to remove this item.");
        } finally {
            setUpdatingItem(null);
        }
    };

    if (loading) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    <p>HIMORA / YOUR BAG</p>
                    <h1>Loading your bag...</h1>
                </div>
            </main>
        );
    }

    if (!localStorage.getItem("access_token")) {
        return (
            <main className="cart-page">
                <div className="cart-message">
                    <p>HIMORA / YOUR BAG</p>
                    <h1>Your bag awaits.</h1>
                    <p>Sign in to view the items in your shopping bag.</p>

                    <Link to="/login" className="cart-primary-link">
                        Sign in to your account <ArrowRight size={16} />
                    </Link>
                </div>
            </main>
        );
    }

    const items = cart?.items || [];

    return (
        <main className="cart-page">
            <section className="cart-header">
                <div>
                    <p className="cart-eyebrow">HIMORA / YOUR BAG</p>
                    <h1>
                        Your
                        <br />
                        selection.
                    </h1>
                </div>

                <p className="cart-item-count">
                    {cart?.total_items || 0} ITEMS
                </p>
            </section>

            <section className="cart-layout">
                <div className="cart-items-section">
                    <div className="cart-section-heading">
                        <span>YOUR SELECTION</span>
                        <span>PRICE</span>
                    </div>

                    {error && (
                        <p className="cart-error" role="alert">
                            {error}
                        </p>
                    )}

                    {items.length === 0 ? (
                        <div className="cart-empty">
                            <h2>Your bag is currently empty.</h2>
                            <p>
                                Discover considered pieces inspired by
                                the Himalayas.
                            </p>

                            <Link to="/collections" className="cart-primary-link">
                                Explore the collection <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        items.map((item) => (
                            <article className="cart-item" key={item.id}>
                                <div className="cart-item-image">
                                    <div className="cart-image-placeholder">
                                        HIMORA
                                    </div>
                                </div>

                                <div className="cart-item-details">
                                    <p className="cart-item-sku">{item.sku}</p>
                                    <h2>{item.product_name}</h2>

                                    <p>
                                        Colour: {item.color || "Standard"}
                                    </p>

                                    <p>
                                        Size: {item.size || "One Size"}
                                    </p>

                                    <div className="cart-quantity">
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            disabled={
                                                updatingItem !== null ||
                                                item.quantity <= 1
                                            }
                                            onClick={() =>
                                                updateQuantity(
                                                    item,
                                                    item.quantity - 1
                                                )
                                            }
                                        >
                                            <Minus size={14} />
                                        </button>

                                        <span>{item.quantity}</span>

                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            disabled={
                                                updatingItem !== null ||
                                                item.quantity >=
                                                    item.available_quantity
                                            }
                                            onClick={() =>
                                                updateQuantity(
                                                    item,
                                                    item.quantity + 1
                                                )
                                            }
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="cart-remove"
                                        disabled={updatingItem !== null}
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 size={13} />
                                        Remove
                                    </button>
                                </div>

                                <div className="cart-item-price">
                                    {formatPrice(
                                        Number(item.unit_price) * item.quantity
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>

                <aside className="cart-summary">
                    <p className="cart-summary-eyebrow">ORDER SUMMARY</p>

                    <div className="cart-summary-row">
                        <span>Subtotal</span>
                        <span>{formatPrice(cart?.subtotal)}</span>
                    </div>

                    <div className="cart-summary-row">
                        <span>Shipping</span>
                        <span>Calculated at checkout</span>
                    </div>

                    <div className="cart-summary-total">
                        <span>Estimated total</span>
                        <span>{formatPrice(cart?.subtotal)}</span>
                    </div>

                    <button
                        type="button"
                        className="cart-checkout-button"
                        disabled={items.length === 0 || updatingItem !== null}
                        onClick={() => navigate("/checkout")}
                    >
                        Continue to checkout <ArrowRight size={16} />
                    </button>

                    <p className="cart-payment-note">
                        Secure checkout · Cash on delivery
                    </p>

                    <Link to="/collections" className="cart-continue-shopping">
                        Continue shopping
                    </Link>
                </aside>
            </section>
        </main>
    );
}

export default Cart;