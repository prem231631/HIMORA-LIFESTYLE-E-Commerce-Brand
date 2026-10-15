import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
    getProduct,
    getProductVariants,
} from "../../services/productService";

import "./ProductDetails.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getImageUrl(imageUrl) {
    if (!imageUrl) return null;

    if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
    }

    return `${API_BASE_URL.replace(/\/$/, "")}/${imageUrl.replace(
        /^\/+/,
        ""
    )}`;
}

function ProductDetails() {
    const { productId, slug } = useParams();
    const navigate = useNavigate();

    const productIdentifier = productId || slug;

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);

    const [loading, setLoading] = useState(true);
    const [addingToBag, setAddingToBag] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadProduct() {
            try {
                setLoading(true);
                setError("");
                setMessage("");

                const productData = await getProduct(productIdentifier);

                if (!productData) {
                    throw new Error("Product not found.");
                }

                const variantData = await getProductVariants(productData.id);

                if (cancelled) return;

                const safeVariants = Array.isArray(variantData)
                    ? variantData
                    : [];

                setProduct(productData);
                setVariants(safeVariants);

                const availableVariant = safeVariants.find(
                    (variant) =>
                        variant.is_active &&
                        (variant.inventory?.available_quantity ?? 0) > 0
                );

                setSelectedVariant(
                    availableVariant || safeVariants[0] || null
                );
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Unable to load product.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        if (productIdentifier) {
            loadProduct();
        } else {
            setError("Product not found.");
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [productIdentifier]);

    async function handleAddToBag() {
        if (!product) return;

        const token = localStorage.getItem("access_token");

        if (!token) {
            navigate("/login", {
                state: {
                    from: `/products/${product.slug || product.id}`,
                },
            });
            return;
        }

        if (
            !selectedVariant ||
            !selectedVariant.is_active ||
            (selectedVariant.inventory?.available_quantity ?? 0) <= 0 ||
            addingToBag
        ) {
            return;
        }

        setAddingToBag(true);
        setMessage("");
        setMessageType("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/cart/items`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        variant_id: selectedVariant.id,
                        quantity: 1,
                    }),
                }
            );

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                localStorage.removeItem("isAdmin");
                localStorage.removeItem("userName");

                navigate("/login", {
                    state: {
                        from: `/products/${product.slug || product.id}`,
                    },
                });

                return;
            }

            if (!response.ok) {
                const detail = data?.detail;

                const errorMessage = Array.isArray(detail)
                    ? detail.map((item) => item.msg).join(", ")
                    : typeof detail === "string"
                      ? detail
                      : "Unable to add this item to your bag.";

                throw new Error(errorMessage);
            }

            setMessage("Added to your bag successfully.");
            setMessageType("success");

            const updatedVariants = await getProductVariants(product.id);
            const safeUpdatedVariants = Array.isArray(updatedVariants)
                ? updatedVariants
                : [];

            setVariants(safeUpdatedVariants);

            const updatedSelectedVariant = safeUpdatedVariants.find(
                (variant) => variant.id === selectedVariant.id
            );

            if (updatedSelectedVariant) {
                setSelectedVariant(updatedSelectedVariant);
            }
        } catch (err) {
            setMessage(
                err.message || "Something went wrong. Please try again."
            );
            setMessageType("error");
        } finally {
            setAddingToBag(false);
        }
    }

    if (loading) {
        return (
            <main className="product-details-state">
                <p>Loading piece...</p>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="product-details-state">
                <p>{error || "Product not found."}</p>

                <Link to="/" className="editorial-link">
                    Return home <span>→</span>
                </Link>
            </main>
        );
    }

    const primaryImage =
        product.images?.find((image) => image.is_primary) ||
        product.images?.[0];

    const imageUrl = getImageUrl(primaryImage?.image_url);

    const availableQuantity =
        selectedVariant?.inventory?.available_quantity ?? 0;

    const canAddToBag =
        Boolean(selectedVariant) &&
        Boolean(selectedVariant.is_active) &&
        availableQuantity > 0 &&
        !addingToBag;

    return (
        <main className="product-details-page">
            <div className="container">
                <div className="product-details-breadcrumb">
                    <Link to="/">HIMORA</Link>
                    <span>/</span>
                    <span>{product.category?.name || "Collection"}</span>
                    <span>/</span>
                    <span>{product.name}</span>
                </div>

                <div className="product-details-layout">
                    <section className="product-details-gallery">
                        <div className="product-details-main-image">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={
                                        primaryImage?.alt_text ||
                                        product.name
                                    }
                                    onError={(event) => {
                                        event.currentTarget.style.display =
                                            "none";
                                    }}
                                />
                            ) : (
                                <div className="product-details-placeholder">
                                    HIMORA
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="product-details-information">
                        <p className="eyebrow">
                            {product.category?.name || "HIMORA"}
                        </p>

                        <h1 className="display-text">{product.name}</h1>

                        <p className="product-details-price">
                            NPR{" "}
                            {Number(product.price).toLocaleString("en-NP")}
                        </p>

                        {product.description && (
                            <p className="product-details-description">
                                {product.description}
                            </p>
                        )}

                        {variants.length > 0 && (
                            <div className="product-details-options">
                                <div className="product-details-option-header">
                                    <span>Available options</span>
                                    <span>
                                        {selectedVariant?.color ||
                                            selectedVariant?.size ||
                                            ""}
                                    </span>
                                </div>

                                <div className="product-details-variants">
                                    {variants.map((variant) => {
                                        const isSelected =
                                            selectedVariant?.id === variant.id;

                                        const quantity =
                                            variant.inventory
                                                ?.available_quantity ?? 0;

                                        const isAvailable =
                                            Boolean(variant.is_active) &&
                                            quantity > 0;

                                        return (
                                            <button
                                                key={variant.id}
                                                type="button"
                                                className={`product-variant ${
                                                    isSelected
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                                onClick={() => {
                                                    setSelectedVariant(variant);
                                                    setMessage("");
                                                    setMessageType("");
                                                }}
                                                disabled={!isAvailable}
                                                aria-pressed={isSelected}
                                            >
                                                <span>
                                                    {variant.color || "Standard"}
                                                </span>

                                                {variant.size && (
                                                    <span>{variant.size}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="product-details-stock">
                            {selectedVariant ? (
                                availableQuantity > 0 ? (
                                    <span>
                                        {availableQuantity} available
                                    </span>
                                ) : (
                                    <span>Currently unavailable</span>
                                )
                            ) : (
                                <span>No available options</span>
                            )}
                        </div>

                        <button
                            type="button"
                            className="product-details-add"
                            onClick={handleAddToBag}
                            disabled={!canAddToBag}
                        >
                            <span>
                                {addingToBag
                                    ? "Adding..."
                                    : availableQuantity <= 0
                                      ? "Out of stock"
                                      : "Add to bag"}
                            </span>

                            <span>{addingToBag ? "…" : "→"}</span>
                        </button>

                        {message && (
                            <p
                                role="status"
                                aria-live="polite"
                                className={`product-details-feedback ${
                                    messageType === "success"
                                        ? "is-success"
                                        : "is-error"
                                }`}
                            >
                                {message}

                                {messageType === "success" && (
                                    <>
                                        {" "}
                                        <Link to="/cart">View bag →</Link>
                                    </>
                                )}
                            </p>
                        )}

                        <div className="product-details-meta">
                            <div>
                                <span>Collection</span>
                                <span>
                                    {product.category?.name || "HIMORA"}
                                </span>
                            </div>

                            <div>
                                <span>SKU</span>
                                <span>{selectedVariant?.sku || "—"}</span>
                            </div>

                            <div>
                                <span>Availability</span>
                                <span>
                                    {availableQuantity > 0
                                        ? "Available"
                                        : "Unavailable"}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

export default ProductDetails;