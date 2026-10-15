
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
    Pencil,
    X,
    Check,
    Phone,
    LockKeyhole,
    Eye,
    EyeOff,
    ShieldCheck,
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

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        full_name: "",
        phone: "",
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

    // Change password state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");

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
                const [profileResponse, ordersResponse] =
                    await Promise.all([
                        fetch(`${API_BASE_URL}/api/auth/me`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }),
                        fetch(`${API_BASE_URL}/api/orders`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }),
                    ]);

                if (
                    profileResponse.status === 401 ||
                    ordersResponse.status === 401
                ) {
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

                if (!profileResponse.ok) {
                    throw new Error(
                        "Unable to load your profile information."
                    );
                }

                if (!ordersResponse.ok) {
                    throw new Error("Unable to load your orders.");
                }

                const profile = await profileResponse.json();
                const orderData = await ordersResponse.json();

                if (cancelled) return;

                setUser(profile);
                setProfileForm({
                    full_name: profile.full_name || "",
                    phone: profile.phone || "",
                });

                localStorage.setItem("user", JSON.stringify(profile));
                localStorage.setItem(
                    "userName",
                    profile.full_name || ""
                );

                setOrders(
                    Array.isArray(orderData) ? orderData : []
                );
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

    function handleProfileChange(event) {
        const { name, value } = event.target;

        setProfileForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setProfileError("");
        setProfileSuccess("");
    }

    function handleEditProfile() {
        setProfileForm({
            full_name: user?.full_name || "",
            phone: user?.phone || "",
        });

        setProfileError("");
        setProfileSuccess("");
        setEditingProfile(true);
    }

    function handleCancelEdit() {
        setProfileForm({
            full_name: user?.full_name || "",
            phone: user?.phone || "",
        });

        setProfileError("");
        setProfileSuccess("");
        setEditingProfile(false);
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();

        const token = localStorage.getItem("access_token");
        const fullName = profileForm.full_name.trim();
        const phone = profileForm.phone.trim();

        if (fullName.length < 2) {
            setProfileError(
                "Your full name must contain at least 2 characters."
            );
            return;
        }

        if (phone && (phone.length < 7 || phone.length > 30)) {
            setProfileError(
                "Your phone number must contain between 7 and 30 characters."
            );
            return;
        }

        if (!token) {
            navigate("/login", {
                replace: true,
                state: { from: "/account" },
            });
            return;
        }

        setSavingProfile(true);
        setProfileError("");
        setProfileSuccess("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/me`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        full_name: fullName,
                        phone: phone || null,
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

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
                if (response.status === 409) {
                    throw new Error(
                        "This phone number is already registered."
                    );
                }

                const detail = data.detail;

                throw new Error(
                    typeof detail === "string"
                        ? detail
                        : "Unable to update your profile. Please check your information."
                );
            }

            setUser(data);
            setProfileForm({
                full_name: data.full_name || "",
                phone: data.phone || "",
            });

            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem(
                "userName",
                data.full_name || ""
            );

            window.dispatchEvent(
                new Event("himora-auth-updated")
            );

            setEditingProfile(false);
            setProfileSuccess("Your profile has been updated.");
        } catch (err) {
            setProfileError(
                err.message || "Something went wrong. Please try again."
            );
        } finally {
            setSavingProfile(false);
        }
    }

    function handlePasswordChange(event) {
        const { name, value } = event.target;

        setPasswordForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setPasswordError("");
        setPasswordSuccess("");
    }

    function handleCancelPasswordChange() {
        setShowPasswordForm(false);
        setPasswordForm({
            current_password: "",
            new_password: "",
            confirm_password: "",
        });
        setPasswordError("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();

        const token = localStorage.getItem("access_token");

        if (!token) {
            navigate("/login", {
                replace: true,
                state: { from: "/account" },
            });
            return;
        }

        if (passwordForm.new_password.length < 8) {
            setPasswordError(
                "Your new password must contain at least 8 characters."
            );
            return;
        }

        if (
            passwordForm.new_password !==
            passwordForm.confirm_password
        ) {
            setPasswordError("Your new passwords do not match.");
            return;
        }

        if (
            passwordForm.current_password ===
            passwordForm.new_password
        ) {
            setPasswordError(
                "Your new password must be different from your current password."
            );
            return;
        }

        setSavingPassword(true);
        setPasswordError("");
        setPasswordSuccess("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/change-password`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        current_password:
                            passwordForm.current_password,
                        new_password: passwordForm.new_password,
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

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
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to change your password. Please try again."
                );
            }

            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });

            setShowPasswordForm(false);
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setPasswordSuccess(
                "Your password has been changed successfully."
            );
        } catch (err) {
            setPasswordError(
                err.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setSavingPassword(false);
        }
    }

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

                        <div className="account-personal-info">
                            <h3>Personal Information</h3>
                            <p>
                                Update your registered account details.
                            </p>
                        </div>

                        {!editingProfile && (
                            <button
                                type="button"
                                className="account-edit-profile-button"
                                onClick={handleEditProfile}
                            >
                                <Pencil size={15} />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <div className="account-shortcut account-shortcut-static">
                        <div className="account-shortcut-icon">
                            <LockKeyhole
                                size={22}
                                strokeWidth={1.3}
                            />
                        </div>

                        <div className="account-personal-info">
                            <h3>Password &amp; Security</h3>
                            <p>
                                Keep your account secure by updating
                                your password.
                            </p>
                        </div>

                        {!showPasswordForm && (
                            <button
                                type="button"
                                className="account-edit-profile-button"
                                onClick={() => {
                                    setPasswordError("");
                                    setPasswordSuccess("");
                                    setShowPasswordForm(true);
                                }}
                            >
                                <ShieldCheck size={16} />
                                Change Password
                            </button>
                        )}
                    </div>
                </div>

                {profileSuccess && (
                    <div className="account-profile-message account-profile-success">
                        <Check size={18} />
                        <span>{profileSuccess}</span>
                    </div>
                )}

                {editingProfile && (
                    <section className="account-profile-editor">
                        <div className="account-profile-editor-heading">
                            <div>
                                <p className="account-eyebrow">
                                    YOUR DETAILS
                                </p>
                                <h3>Edit personal information</h3>
                            </div>

                            <button
                                type="button"
                                className="account-profile-close"
                                onClick={handleCancelEdit}
                                disabled={savingProfile}
                                aria-label="Cancel editing"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <form onSubmit={handleProfileSubmit}>
                            <div className="account-profile-form-grid">
                                <label className="account-profile-field">
                                    <span>Full name</span>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={profileForm.full_name}
                                        onChange={handleProfileChange}
                                        minLength={2}
                                        maxLength={150}
                                        autoComplete="name"
                                        required
                                        disabled={savingProfile}
                                    />
                                </label>

                                <label className="account-profile-field">
                                    <span>Email address</span>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        readOnly
                                        disabled
                                        autoComplete="email"
                                    />
                                    <small>
                                        Email address cannot be changed here.
                                    </small>
                                </label>

                                <label className="account-profile-field">
                                    <span>Phone number</span>
                                    <div className="account-profile-phone-input">
                                        <Phone size={17} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={profileForm.phone}
                                            onChange={handleProfileChange}
                                            minLength={7}
                                            maxLength={30}
                                            autoComplete="tel"
                                            placeholder="Enter your phone number"
                                            disabled={savingProfile}
                                        />
                                    </div>
                                </label>
                            </div>

                            {profileError && (
                                <div className="account-profile-message account-profile-error">
                                    <AlertCircle size={18} />
                                    <span>{profileError}</span>
                                </div>
                            )}

                            <div className="account-profile-form-actions">
                                <button
                                    type="button"
                                    className="account-profile-cancel-button"
                                    onClick={handleCancelEdit}
                                    disabled={savingProfile}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="account-profile-save-button"
                                    disabled={savingProfile}
                                >
                                    {savingProfile ? (
                                        <>
                                            <LoaderCircle
                                                size={17}
                                                className="account-spinner"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={17} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {passwordSuccess && (
                    <div className="account-profile-message account-profile-success">
                        <Check size={18} />
                        <span>{passwordSuccess}</span>
                    </div>
                )}

                {showPasswordForm && (
                    <section className="account-profile-editor account-password-editor">
                        <div className="account-profile-editor-heading">
                            <div>
                                <p className="account-eyebrow">
                                    PASSWORD &amp; SECURITY
                                </p>
                                <h3>Change your password</h3>
                                <p className="account-password-description">
                                    Choose a strong password to help protect
                                    your HIMORA account.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="account-profile-close"
                                onClick={handleCancelPasswordChange}
                                disabled={savingPassword}
                                aria-label="Cancel password change"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordSubmit}>
                            <div className="account-password-fields">
                                <label className="account-profile-field">
                                    <span>Current password</span>
                                    <div className="account-password-input">
                                        <LockKeyhole size={17} />
                                        <input
                                            type={
                                                showCurrentPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="current_password"
                                            value={
                                                passwordForm.current_password
                                            }
                                            onChange={handlePasswordChange}
                                            autoComplete="current-password"
                                            placeholder="Enter current password"
                                            required
                                            disabled={savingPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCurrentPassword(
                                                    (previous) => !previous
                                                )
                                            }
                                            aria-label={
                                                showCurrentPassword
                                                    ? "Hide current password"
                                                    : "Show current password"
                                            }
                                            disabled={savingPassword}
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>
                                    </div>
                                </label>

                                <label className="account-profile-field">
                                    <span>New password</span>
                                    <div className="account-password-input">
                                        <LockKeyhole size={17} />
                                        <input
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="new_password"
                                            value={passwordForm.new_password}
                                            onChange={handlePasswordChange}
                                            autoComplete="new-password"
                                            placeholder="Enter new password"
                                            minLength={8}
                                            maxLength={128}
                                            required
                                            disabled={savingPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowNewPassword(
                                                    (previous) => !previous
                                                )
                                            }
                                            aria-label={
                                                showNewPassword
                                                    ? "Hide new password"
                                                    : "Show new password"
                                            }
                                            disabled={savingPassword}
                                        >
                                            {showNewPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>
                                    </div>
                                    <small>
                                        Use at least 8 characters.
                                    </small>
                                </label>

                                <label className="account-profile-field">
                                    <span>Confirm new password</span>
                                    <div className="account-password-input">
                                        <LockKeyhole size={17} />
                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="confirm_password"
                                            value={
                                                passwordForm.confirm_password
                                            }
                                            onChange={handlePasswordChange}
                                            autoComplete="new-password"
                                            placeholder="Re-enter new password"
                                            minLength={8}
                                            maxLength={128}
                                            required
                                            disabled={savingPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (previous) => !previous
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Hide confirmation password"
                                                    : "Show confirmation password"
                                            }
                                            disabled={savingPassword}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={17} />
                                            ) : (
                                                <Eye size={17} />
                                            )}
                                        </button>
                                    </div>
                                </label>
                            </div>

                            {passwordError && (
                                <div className="account-profile-message account-profile-error">
                                    <AlertCircle size={18} />
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            <div className="account-profile-form-actions">
                                <button
                                    type="button"
                                    className="account-profile-cancel-button"
                                    onClick={handleCancelPasswordChange}
                                    disabled={savingPassword}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="account-profile-save-button"
                                    disabled={savingPassword}
                                >
                                    {savingPassword ? (
                                        <>
                                            <LoaderCircle
                                                size={17}
                                                className="account-spinner"
                                            />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={17} />
                                            Update Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

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
