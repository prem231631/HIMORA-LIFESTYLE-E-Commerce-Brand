import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    Plus,
    Trash2,
    Check,
    LoaderCircle,
    AlertCircle,
    Pencil,
    UserRound,
} from "lucide-react";

import "./Addresses.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token")
    );
}

const emptyForm = {
    full_name: "",
    phone: "",
    province: "",
    city: "",
    address_line: "",
    landmark: "",
    postal_code: "",
    is_default: false,
};

function Addresses() {
    const navigate = useNavigate();

    const [addresses, setAddresses] = useState([]);
    const [form, setForm] = useState({ ...emptyForm });
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadAddresses = useCallback(async () => {
        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: "/account/addresses" },
                replace: true,
            });
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/addresses`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("userName");
                localStorage.removeItem("isAdmin");

                window.dispatchEvent(
                    new Event("himora-auth-updated")
                );

                navigate("/login", {
                    state: { from: "/account/addresses" },
                    replace: true,
                });

                return;
            }

            if (!response.ok) {
                throw new Error(
                    "Unable to load your saved addresses."
                );
            }

            const data = await response.json();

            setAddresses(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(
                err.message || "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadAddresses();
    }, [loadAddresses]);

    function handleChange(event) {
        const { name, value, checked, type } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function handleAdd() {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(true);
        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function handleEdit(address) {
        setForm({
            full_name: address.full_name || "",
            phone: address.phone || "",
            province: address.province || "",
            city: address.city || "",
            address_line: address.address_line || "",
            landmark: address.landmark || "",
            postal_code: address.postal_code || "",
            is_default: Boolean(address.is_default),
        });

        setEditingId(address.id);
        setShowForm(true);
        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function handleCancel() {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: "/account/addresses" },
                replace: true,
            });
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                ...form,
                full_name: form.full_name.trim(),
                phone: form.phone.trim(),
                province: form.province.trim(),
                city: form.city.trim(),
                address_line: form.address_line.trim(),
                landmark: form.landmark.trim() || null,
                postal_code: form.postal_code.trim() || null,
            };

            const wasEditing = editingId !== null;

            const response = await fetch(
                wasEditing
                    ? `${API_BASE_URL}/api/addresses/${editingId}`
                    : `${API_BASE_URL}/api/addresses`,
                {
                    method: wasEditing ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");

                navigate("/login", {
                    state: { from: "/account/addresses" },
                    replace: true,
                });

                return;
            }

            if (!response.ok) {
                const detail = data.detail;

                throw new Error(
                    typeof detail === "string"
                        ? detail
                        : Array.isArray(detail)
                            ? detail
                                  .map((item) => item.msg)
                                  .join(", ")
                            : wasEditing
                                ? "Unable to update your address."
                                : "Unable to save your address."
                );
            }

            setForm({ ...emptyForm });
            setEditingId(null);
            setShowForm(false);

            setSuccess(
                wasEditing
                    ? "Your delivery address has been updated."
                    : "Your delivery address has been saved."
            );

            await loadAddresses();
        } catch (err) {
            setError(
                err.message || "Unable to save your address."
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(addressId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this address?"
        );

        if (!confirmed) return;

        const token = getAuthToken();

        if (!token) {
            navigate("/login", {
                state: { from: "/account/addresses" },
                replace: true,
            });
            return;
        }

        setDeletingId(addressId);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/addresses/${addressId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("token");

                navigate("/login", {
                    state: { from: "/account/addresses" },
                    replace: true,
                });

                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));

                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to delete this address."
                );
            }

            setAddresses((previous) =>
                previous.filter(
                    (address) => address.id !== addressId
                )
            );

            if (editingId === addressId) {
                handleCancel();
            }

            setSuccess("Address deleted successfully.");
        } catch (err) {
            setError(
                err.message || "Unable to delete this address."
            );
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <main className="addresses-page">
            <div className="addresses-container">
                <button
                    type="button"
                    className="addresses-back"
                    onClick={() => navigate("/account")}
                >
                    <ArrowLeft size={16} />
                    Back to my account
                </button>

                <header className="addresses-header">
                    <p className="addresses-eyebrow">
                        YOUR ACCOUNT
                    </p>

                    <h1>Delivery Addresses</h1>

                    <p className="addresses-description">
                        Keep your delivery details ready for your next
                        HIMORA LIFESTYLE order.
                    </p>
                </header>

                {error && (
                    <div
                        className="addresses-message addresses-error"
                        role="alert"
                    >
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div
                        className="addresses-message addresses-success"
                        role="status"
                    >
                        <Check size={18} />
                        <span>{success}</span>
                    </div>
                )}

                <div className="addresses-toolbar">
                    <div>
                        <h2>Saved addresses</h2>

                        <p>
                            {addresses.length}{" "}
                            {addresses.length === 1
                                ? "address"
                                : "addresses"}{" "}
                            saved
                        </p>
                    </div>

                    {!showForm && (
                        <button
                            type="button"
                            className="addresses-primary-button"
                            onClick={handleAdd}
                        >
                            <Plus size={17} />
                            Add address
                        </button>
                    )}
                </div>

                {showForm && (
                    <section className="address-form-panel">
                        <div className="address-form-heading">
                            <div>
                                <p className="addresses-eyebrow">
                                    DELIVERY DETAILS
                                </p>

                                <h2>
                                    {editingId
                                        ? "Edit delivery address"
                                        : "Add a new address"}
                                </h2>
                            </div>
                        </div>

                        <form
                            className="address-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="address-form-grid">
                                <label>
                                    Full name *
                                    <input
                                        name="full_name"
                                        value={form.full_name}
                                        onChange={handleChange}
                                        placeholder="Recipient's full name"
                                        minLength={2}
                                        maxLength={150}
                                        required
                                    />
                                </label>

                                <label>
                                    Phone number *
                                    <input
                                        name="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="98XXXXXXXX"
                                        minLength={7}
                                        maxLength={30}
                                        required
                                    />
                                </label>

                                <label>
                                    Province *
                                    <input
                                        name="province"
                                        value={form.province}
                                        onChange={handleChange}
                                        placeholder="e.g. Lumbini Province"
                                        minLength={2}
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label>
                                    City / Municipality *
                                    <input
                                        name="city"
                                        value={form.city}
                                        onChange={handleChange}
                                        placeholder="e.g. Butwal"
                                        minLength={2}
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label className="address-full-width">
                                    Street address *
                                    <textarea
                                        name="address_line"
                                        value={form.address_line}
                                        onChange={handleChange}
                                        placeholder="Ward number, street, house or building"
                                        minLength={3}
                                        maxLength={500}
                                        rows={3}
                                        required
                                    />
                                </label>

                                <label>
                                    Landmark
                                    <input
                                        name="landmark"
                                        value={form.landmark}
                                        onChange={handleChange}
                                        placeholder="Nearby landmark (optional)"
                                        maxLength={200}
                                    />
                                </label>

                                <label>
                                    Postal code
                                    <input
                                        name="postal_code"
                                        value={form.postal_code}
                                        onChange={handleChange}
                                        placeholder="Postal code (optional)"
                                        maxLength={20}
                                    />
                                </label>
                            </div>

                            <label className="address-default-option">
                                <input
                                    type="checkbox"
                                    name="is_default"
                                    checked={form.is_default}
                                    onChange={handleChange}
                                />

                                <span>
                                    Set as my default delivery address
                                </span>
                            </label>

                            <div className="address-form-actions">
                                <button
                                    type="button"
                                    className="addresses-secondary-button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="addresses-primary-button"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <LoaderCircle
                                                size={17}
                                                className="addresses-spinner"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={17} />
                                            {editingId
                                                ? "Update address"
                                                : "Save address"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {loading ? (
                    <div className="addresses-loading">
                        <LoaderCircle
                            size={25}
                            className="addresses-spinner"
                        />
                        <p>Loading your addresses...</p>
                    </div>
                ) : addresses.length === 0 && !showForm ? (
                    <section className="addresses-empty">
                        <div className="addresses-empty-icon">
                            <MapPin size={27} />
                        </div>

                        <h2>No saved addresses yet</h2>

                        <p>
                            Add your delivery details so you're ready
                            for your next order.
                        </p>

                        <button
                            type="button"
                            className="addresses-primary-button"
                            onClick={handleAdd}
                        >
                            <Plus size={17} />
                            Add your first address
                        </button>
                    </section>
                ) : (
                    !loading && (
                        <div className="addresses-list">
                            {addresses.map((address) => (
                                <article
                                    className="address-card"
                                    key={address.id}
                                >
                                    <div className="address-card-icon">
                                        <MapPin size={21} />
                                    </div>

                                    <div className="address-card-content">
                                        <div className="address-card-title">
                                            <h3>{address.full_name}</h3>

                                            {address.is_default && (
                                                <span className="address-default-badge">
                                                    DEFAULT
                                                </span>
                                            )}
                                        </div>

                                        <p className="address-card-phone">
                                            {address.phone}
                                        </p>

                                        <p>{address.address_line}</p>

                                        {address.landmark && (
                                            <p>{address.landmark}</p>
                                        )}

                                        <p>
                                            {address.city},{" "}
                                            {address.province}
                                            {address.postal_code
                                                ? `, ${address.postal_code}`
                                                : ""}
                                        </p>

                                        <div className="address-card-actions">
                                            <button
                                                type="button"
                                                className="address-edit-button"
                                                aria-label={`Edit address for ${address.full_name}`}
                                                title="Edit address"
                                                onClick={() =>
                                                    handleEdit(address)
                                                }
                                            >
                                                <Pencil size={17} />
                                                <span>Edit</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="address-delete-button"
                                                aria-label={`Delete address for ${address.full_name}`}
                                                title="Delete address"
                                                disabled={
                                                    deletingId === address.id
                                                }
                                                onClick={() =>
                                                    handleDelete(address.id)
                                                }
                                            >
                                                {deletingId === address.id ? (
                                                    <LoaderCircle
                                                        size={18}
                                                        className="addresses-spinner"
                                                    />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )
                )}

                {!loading && addresses.length > 0 && (
                    <div className="addresses-footer">
                        <p>
                            Your address details are used to help deliver
                            your orders.
                        </p>

                        <button
                            type="button"
                            className="addresses-text-button"
                            onClick={() => navigate("/checkout")}
                        >
                            Continue to checkout
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default Addresses;