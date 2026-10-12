import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import "./Checkout.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((error) => error.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

function formatPrice(value) {
  return `NPR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Checkout() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [cart, setCart] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const token = getAuthToken();

  const loadCheckoutData = useCallback(async () => {
    if (!token) {
      navigate("/login", {
        replace: true,
        state: { from: "/checkout" },
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [addressResponse, cartResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/addresses`, { headers }),
        fetch(`${API_BASE_URL}/api/cart`, { headers }),
      ]);

      const addressData = await addressResponse.json();
      const cartData = await cartResponse.json();

      if (
        addressResponse.status === 401 ||
        cartResponse.status === 401
      ) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login", {
          replace: true,
          state: { from: "/checkout" },
        });
        return;
      }

      if (!addressResponse.ok) {
        throw new Error(
          getErrorMessage(
            addressData,
            "Unable to load your saved addresses."
          )
        );
      }

      if (!cartResponse.ok) {
        throw new Error(
          getErrorMessage(
            cartData,
            "Unable to load your shopping bag."
          )
        );
      }

      const addressList = Array.isArray(addressData)
        ? addressData
        : [];

      setAddresses(addressList);
      setCart(cartData);

      const defaultAddress = addressList.find(
        (address) => address.is_default
      );

      setSelectedAddressId((currentId) => {
        const currentAddressExists = addressList.some(
          (address) => String(address.id) === String(currentId)
        );

        if (currentAddressExists) {
          return String(currentId);
        }

        if (defaultAddress) {
          return String(defaultAddress.id);
        }

        return addressList.length
          ? String(addressList[0].id)
          : "";
      });
    } catch (err) {
      setError(
        err.message || "Something went wrong loading checkout."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const items = Array.isArray(cart?.items) ? cart.items : [];

  const itemCount = items.reduce(
    (count, item) => count + Number(item.quantity || 0),
    0
  );

  const subtotal = items.reduce(
    (total, item) =>
      total +
      Number(item.unit_price || 0) * Number(item.quantity || 0),
    0
  );

  const shippingFee = 0;
  const total = subtotal + shippingFee;

  const selectedAddress = addresses.find(
    (address) => String(address.id) === String(selectedAddressId)
  );

  async function handlePlaceOrder(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      navigate("/login", {
        replace: true,
        state: { from: "/checkout" },
      });
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      setError("Please select a delivery address.");
      return;
    }

    if (items.length === 0) {
      setError("Your shopping bag is empty.");
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            address_id: Number(selectedAddressId),
            notes: notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login", {
          replace: true,
          state: { from: "/checkout" },
        });
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to place your order.")
        );
      }

      window.dispatchEvent(new Event("himora-cart-updated"));

      navigate("/account/orders", {
        replace: true,
        state: {
          order: data,
          orderId: data.id,
          orderNumber: data.order_number,
          message: "Your order has been placed successfully.",
        },
      });
    } catch (err) {
      setError(err.message || "Unable to place your order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <main className="himora-checkout">
        <div className="checkout-loading">
          <span className="checkout-loading-mark" />
          <p>Preparing your checkout</p>
        </div>
      </main>
    );
  }

  return (
    <main className="himora-checkout">
      <div className="checkout-shell">
        <header className="checkout-topbar">
          <button
            type="button"
            className="checkout-back-link"
            onClick={() => navigate("/cart")}
          >
            <ArrowLeft size={16} />
            <span>Back to bag</span>
          </button>

          <div className="checkout-brand">
            <span>HIMORA</span>
            <small>LIFESTYLE</small>
          </div>

          <div className="checkout-secure-label">
            <ShieldCheck size={16} />
            <span>Secure checkout</span>
          </div>
        </header>

        <section className="checkout-heading">
          <p className="checkout-eyebrow">YOUR HIMORA EXPERIENCE</p>
          <h1>Checkout</h1>
          <p>
            A few final details, then your selected pieces will be
            on their way.
          </p>
        </section>

        {error && (
          <div className="checkout-alert checkout-alert-error" role="alert">
            {error}
          </div>
        )}

        <form className="checkout-layout" onSubmit={handlePlaceOrder}>
          <div className="checkout-main-column">
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <div className="checkout-section-icon">
                  <MapPin size={19} />
                </div>

                <div>
                  <p className="checkout-step-label">STEP 01</p>
                  <h2>Delivery address</h2>
                  <p>Select where your order should be delivered.</p>
                </div>
              </div>

              {addresses.length === 0 ? (
                <div className="checkout-no-address">
                  <MapPin size={25} strokeWidth={1.5} />
                  <h3>No saved addresses yet</h3>
                  <p>
                    Add a delivery address to continue with your
                    purchase.
                  </p>

                  <button
                    type="button"
                    className="checkout-secondary-button"
                    onClick={() =>
                      navigate("/account/addresses", {
                        state: { from: "/checkout" },
                      })
                    }
                  >
                    Manage addresses <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="checkout-address-list">
                  {addresses.map((address) => {
                    const selected =
                      String(address.id) ===
                      String(selectedAddressId);

                    return (
                      <label
                        key={address.id}
                        className={`checkout-address-option ${
                          selected ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping-address"
                          value={address.id}
                          checked={selected}
                          onChange={() =>
                            setSelectedAddressId(String(address.id))
                          }
                        />

                        <span className="checkout-radio-indicator" />

                        <span className="checkout-address-content">
                          <span className="checkout-address-name">
                            {address.full_name}

                            {address.is_default && (
                              <span className="checkout-default-badge">
                                DEFAULT
                              </span>
                            )}
                          </span>

                          <span className="checkout-address-text">
                            {address.address_line}
                            {address.landmark
                              ? `, ${address.landmark}`
                              : ""}
                          </span>

                          <span className="checkout-address-text">
                            {address.city}, {address.province}
                            {address.postal_code
                              ? ` - ${address.postal_code}`
                              : ""}
                          </span>

                          <span className="checkout-address-phone">
                            {address.phone}
                          </span>
                        </span>

                        {selected && (
                          <CheckCircle2
                            className="checkout-address-check"
                            size={19}
                          />
                        )}
                      </label>
                    );
                  })}

                  <button
                    type="button"
                    className="checkout-manage-addresses"
                    onClick={() =>
                      navigate("/account/addresses", {
                        state: { from: "/checkout" },
                      })
                    }
                  >
                    Manage saved addresses <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <div className="checkout-section-icon">
                  <Package size={19} />
                </div>

                <div>
                  <p className="checkout-step-label">STEP 02</p>
                  <h2>Delivery instructions</h2>
                  <p>
                    Anything our delivery team should know?
                  </p>
                </div>
              </div>

              <label
                className="checkout-field-label"
                htmlFor="checkout-notes"
              >
                Order notes <span>OPTIONAL</span>
              </label>

              <textarea
                id="checkout-notes"
                className="checkout-notes-input"
                placeholder="Add delivery instructions or special requests..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={1000}
                rows={4}
              />

              <div className="checkout-notes-counter">
                {notes.length}/1000
              </div>
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <div className="checkout-section-icon">
                  <Truck size={19} />
                </div>

                <div>
                  <p className="checkout-step-label">STEP 03</p>
                  <h2>Payment method</h2>
                  <p>
                    Simple, straightforward payment at delivery.
                  </p>
                </div>
              </div>

              <div className="checkout-payment-option">
                <span className="checkout-payment-radio" />
                <div className="checkout-cod-symbol">COD</div>

                <div className="checkout-payment-description">
                  <strong>Cash on Delivery</strong>
                  <span>Pay when your order arrives.</span>
                </div>

                <span className="checkout-payment-selected">
                  SELECTED
                </span>
              </div>

              <p className="checkout-payment-note">
                Payment is recorded as pending until your order
                workflow updates its status.
              </p>
            </section>
          </div>

          <aside className="checkout-summary">
            <div className="checkout-summary-header">
              <div>
                <p className="checkout-eyebrow">YOUR SELECTION</p>
                <h2>Order summary</h2>
              </div>

              <span className="checkout-item-count">
                {itemCount} items
              </span>
            </div>

            {items.length === 0 ? (
              <div className="checkout-empty-cart">
                <Package size={27} strokeWidth={1.4} />
                <p>Your shopping bag is empty.</p>

                <button
                  type="button"
                  onClick={() => navigate("/products")}
                >
                  Discover the collection
                </button>
              </div>
            ) : (
              <>
                <div className="checkout-summary-items">
                  {items.map((item) => (
                    <div
                      className="checkout-summary-item"
                      key={item.id}
                    >
                      <div className="checkout-item-visual">
                        <Package size={22} strokeWidth={1.2} />
                      </div>

                      <div className="checkout-item-details">
                        <h3>{item.product_name}</h3>
                        <p>
                          {item.color || "Standard"}
                          {item.size ? ` / ${item.size}` : ""}
                        </p>
                        <p>Quantity: {item.quantity}</p>
                      </div>

                      <div className="checkout-item-price">
                        {formatPrice(
                          Number(item.unit_price) *
                            Number(item.quantity)
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="checkout-summary-divider" />

                <div className="checkout-price-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="checkout-price-row">
                  <span>Shipping</span>
                  <span className="checkout-free-shipping">
                    {shippingFee === 0
                      ? "Complimentary"
                      : formatPrice(shippingFee)}
                  </span>
                </div>

                <div className="checkout-summary-divider" />

                <div className="checkout-total-row">
                  <span>Total</span>
                  <div>
                    <strong>{formatPrice(total)}</strong>
                    <small>Inclusive of listed prices</small>
                  </div>
                </div>

                <button
                  type="submit"
                  className="checkout-place-order"
                  disabled={
                    placingOrder ||
                    items.length === 0 ||
                    !selectedAddress
                  }
                >
                  {placingOrder ? (
                    <>
                      <span className="checkout-button-spinner" />
                      Placing order...
                    </>
                  ) : (
                    <>
                      Place order <ArrowRight size={17} />
                    </>
                  )}
                </button>

                {!selectedAddress && (
                  <p className="checkout-address-warning">
                    Select a delivery address to continue.
                  </p>
                )}

                <div className="checkout-trust-note">
                  <ShieldCheck size={16} />
                  <span>Your order is processed securely.</span>
                </div>
              </>
            )}
          </aside>
        </form>

        <footer className="checkout-footer">
          <span>HIMORA LIFESTYLE</span>
          <span>
            Inspired by the Himalayas. Designed for the modern world.
          </span>
        </footer>
      </div>
    </main>
  );
}

export default Checkout;