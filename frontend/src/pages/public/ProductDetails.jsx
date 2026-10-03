import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
    getProduct,
    getProductVariants,
} from "../../services/productService";

import "./ProductDetails.css";


function ProductDetails() {
    const { productId } = useParams();

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProduct() {
            try {
                setLoading(true);
                setError("");

                const [productData, variantData] = await Promise.all([
                    getProduct(productId),
                    getProductVariants(productId),
                ]);

                setProduct(productData);
                setVariants(variantData);

                if (variantData.length > 0) {
                    setSelectedVariant(variantData[0]);
                }
            } catch (err) {
                setError(err.message || "Unable to load product.");
            } finally {
                setLoading(false);
            }
        }

        loadProduct();
    }, [productId]);


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
                    Return home
                    <span>→</span>
                </Link>
            </main>
        );
    }


    const primaryImage =
        product.images?.find((image) => image.is_primary) ||
        product.images?.[0];


    const availableQuantity =
        selectedVariant?.inventory?.available_quantity ?? 0;


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
                            {primaryImage ? (
                                <img
                                    src={primaryImage.image_url}
                                    alt={
                                        primaryImage.alt_text ||
                                        product.name
                                    }
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

                        <h1 className="display-text">
                            {product.name}
                        </h1>

                        <p className="product-details-price">
                            NPR{" "}
                            {Number(product.price).toLocaleString()}
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

                                    {selectedVariant && (
                                        <span>
                                            {selectedVariant.color ||
                                                selectedVariant.size ||
                                                ""}
                                        </span>
                                    )}
                                </div>


                                <div className="product-details-variants">

                                    {variants.map((variant) => {
                                        const isSelected =
                                            selectedVariant?.id ===
                                            variant.id;

                                        const available =
                                            variant.inventory
                                                ?.available_quantity ?? 0;

                                        return (
                                            <button
                                                key={variant.id}
                                                type="button"
                                                className={`product-variant ${
                                                    isSelected
                                                        ? "is-selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setSelectedVariant(
                                                        variant
                                                    )
                                                }
                                                disabled={
                                                    !variant.is_active ||
                                                    available <= 0
                                                }
                                            >
                                                <span>
                                                    {variant.color ||
                                                        "Standard"}
                                                </span>

                                                {variant.size && (
                                                    <span>
                                                        {variant.size}
                                                    </span>
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
                                <span>
                                    Select an available option
                                </span>
                            )}

                        </div>


                        <button
                            type="button"
                            className="product-details-add"
                            disabled={
                                !selectedVariant ||
                                availableQuantity <= 0
                            }
                        >
                            <span>Add to bag</span>
                            <span>→</span>
                        </button>


                        <div className="product-details-meta">

                            <div>
                                <span>Collection</span>
                                <span>
                                    {product.category?.name ||
                                        "HIMORA"}
                                </span>
                            </div>

                            <div>
                                <span>SKU</span>
                                <span>
                                    {selectedVariant?.sku || "—"}
                                </span>
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