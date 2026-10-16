
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import "./Checkout.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

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

function getImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  const trimmedUrl = imageUrl.trim();

  if (!trimmedUrl) {
    return null;
  }

  if (
    trimmedUrl.startsWith("https://") ||
    trimmedUrl.startsWith("http://")
  ) {
    return trimmedUrl;
  }

  const normalizedPath = trimmedUrl.replace(/^\/+/, "");

  return `${API_BASE_URL.replace(/\/+$/, "")}/${normalizedPath}`;
}

function formatPrice(value) {
  return `NPR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("himora-auth-updated"));

    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallback));
  }

  return data;
}

function submitEsewaForm(formUrl, fields) {
  if (
    typeof formUrl !== "string" ||
    !formUrl.startsWith("https://")
  ) {
    throw new Error("Invalid eSewa payment URL.");
  }

  if (
    !fields ||
    typeof fields !== "object" ||
    Array.isArray(fields) ||
    !fields.signature ||
    !fields.total_amount ||
    !fields.transaction_uuid ||
    !fields.product_code ||
    !fields.signed_field_names
  ) {
    throw new Error("The eSewa payment fields are incomplete.");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);

    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
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
  const [paymentMethod, setPaymentMethod] = useState(
    "CASH_ON_DELIVERY"
  );

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

      const [addressData, cartData] = await Promise.all([
        readResponse(
          addressResponse,
          "Unable to load your saved addresses."
        ),
        readResponse(
          cartResponse,
          "Unable to load your shopping bag."
        ),
      ]);

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
      if (
        err.message?.includes("session has expired") ||
        err.message?.includes("Please log in again")
      ) {
        navigate("/login", {
          replace: true,
          state: { from: "/checkout" },
        });
      } else {
        setError(
          err.message || "Something went wrong loading checkout."
        );
      }
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

    if (placingOrder) {
      return;
    }

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

    let orderCreated = false;

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // STEP 1: Create the order using the selected payment method.
      const orderResponse = await fetch(
        `${API_BASE_URL}/api/orders/checkout`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            address_id: Number(selectedAddressId),
            notes: notes.trim() || null,
            payment_method: paymentMethod,
          }),
        }
      );

      const orderData = await readResponse(
        orderResponse,
        "Unable to place your order."
      );

      orderCreated = true;

      // STEP 2: Initiate eSewa for eSewa orders only.
      if (paymentMethod === "ESEWA") {
        const paymentResponse = await fetch(
          `${API_BASE_URL}/api/payments/esewa/initiate`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              order_id: orderData.id,
            }),
          }
        );

        const paymentData = await readResponse(
          paymentResponse,
          "Unable to initiate eSewa payment."
        );

        if (
          !paymentData.form_url ||
          !paymentData.form_fields
        ) {
          throw new Error(
            "The backend returned an invalid eSewa payment response."
          );
        }

        // STEP 3: Submit the signed fields to eSewa using POST.
        submitEsewaForm(
          paymentData.form_url,
          paymentData.form_fields
        );

        // Keep the loading state while the browser navigates to eSewa.
        return;
      }

      // COD: proceed directly to the order confirmation page.
      window.dispatchEvent(new Event("himora-cart-updated"));

      navigate("/account/orders", {
        replace: true,
        state: {
          order: orderData,
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          message: "Your order has been placed successfully.",
        },
      });
    } catch (err) {
      if (
        err.message?.includes("session has expired") ||
        err.message?.includes("Please log in again")
      ) {
        navigate("/login", {
          replace: true,
          state: { from: "/checkout" },
        });
        return;
      }

      setError(
        orderCreated
          ? `${err.message || "Unable to initiate payment."} Your order may already exist. Check My Orders before trying again.`
          : err.message || "Unable to place your order."
      );
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
          <div
            className="checkout-alert checkout-alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="checkout-layout"
          onSubmit={handlePlaceOrder}
        >
          <div className="checkout-main-column">
            {/* STEP 01: DELIVERY ADDRESS */}
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <div className="checkout-section-icon">
                  <MapPin size={19} />
                </div>

                <div>
                  <p className="checkout-step-label">STEP 01</p>
                  <h2>Delivery address</h2>
                  <p>
                    Select where your order should be delivered.
                  </p>
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

            {/* STEP 02: DELIVERY INSTRUCTIONS */}
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

            {/* STEP 03: PAYMENT METHOD */}
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <div className="checkout-section-icon">
                  <Truck size={19} />
                </div>

                <div>
                  <p className="checkout-step-label">STEP 03</p>
                  <h2>Payment method</h2>
                  <p>Choose how you would like to pay.</p>
                </div>
              </div>

              <div className="checkout-payment-methods">
                <label
                  className={`checkout-payment-option ${
                    paymentMethod === "CASH_ON_DELIVERY"
                      ? "is-selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="CASH_ON_DELIVERY"
                    checked={paymentMethod === "CASH_ON_DELIVERY"}
                    onChange={() =>
                      setPaymentMethod("CASH_ON_DELIVERY")
                    }
                  />

                  <div className="checkout-cod-symbol">COD</div>

                  <div className="checkout-payment-description">
                    <strong>Cash on Delivery</strong>
                    <span>Pay when your order arrives.</span>
                  </div>

                  {paymentMethod === "CASH_ON_DELIVERY" && (
                    <CheckCircle2 size={18} />
                  )}
                </label>

                <label
                  className={`checkout-payment-option ${
                    paymentMethod === "ESEWA" ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="ESEWA"
                    checked={paymentMethod === "ESEWA"}
                    onChange={() => setPaymentMethod("ESEWA")}
                  />

                  <div className="checkout-cod-symbol">
                    eSewa
                  </div>

                  <div className="checkout-payment-description">
                    <strong>Pay with eSewa</strong>
                    <span>
                      Continue to the eSewa payment page.
                    </span>
                  </div>

                  {paymentMethod === "ESEWA" && (
                    <CheckCircle2 size={18} />
                  )}
                </label>
              </div>

              <p className="checkout-payment-note">
                {paymentMethod === "ESEWA"
                  ? "You will be redirected to eSewa to complete payment."
                  : "Payment is collected when your order is delivered."}
              </p>
            </section>
          </div>

          {/* ORDER SUMMARY */}
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
                  {items.map((item) => {
                    const rawImageUrl =
                      item.image_url ||
                      item.product_image_url ||
                      item.primary_image?.image_url ||
                      null;

                    const imageUrl = getImageUrl(rawImageUrl);

                    return (
                      <div
                        className="checkout-summary-item"
                        key={item.id}
                      >
                        <div className="checkout-item-visual">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={
                                item.product_name || "HIMORA product"
                              }
                              className="checkout-product-image"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";

                                const placeholder =
                                  event.currentTarget.parentElement
                                    ?.querySelector(
                                      ".checkout-image-placeholder"
                                    );

                                if (placeholder) {
                                  placeholder.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className="checkout-image-placeholder"
                            style={{
                              display: imageUrl ? "none" : "flex",
                            }}
                            aria-label="Product image unavailable"
                          >
                            <ImageIcon
                              size={23}
                              strokeWidth={1.3}
                            />
                          </div>
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
                    );
                  })}
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
                      {paymentMethod === "ESEWA"
                        ? "Connecting to eSewa..."
                        : "Placing order..."}
                    </>
                  ) : (
                    <>
                      {paymentMethod === "ESEWA"
                        ? "Continue to eSewa"
                        : "Place order"}
                      <ArrowRight size={17} />
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
