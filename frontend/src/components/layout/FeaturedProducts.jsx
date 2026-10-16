import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./FeaturedProducts.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function getProductImage(product) {
    const image =
        product.images?.find((item) => item.is_primary) ||
        product.images?.[0];

    if (!image?.image_url) {
        return null;
    }

    if (
        image.image_url.startsWith("http://") ||
        image.image_url.startsWith("https://")
    ) {
        return image.image_url;
    }

    return `${API_BASE_URL.replace(/\/$/, "")}/${image.image_url.replace(
        /^\//,
        ""
    )}`;
}

function FeaturedProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchFeaturedProducts() {
            try {
                setLoading(true);
                setError(false);

                const response = await fetch(
                    `${API_BASE_URL}/api/products/featured`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Unable to load featured products.");
                }

                const data = await response.json();

                setProducts(Array.isArray(data) ? data : []);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error(
                        "Featured products loading error:",
                        err
                    );

                    setError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchFeaturedProducts();

        return () => controller.abort();
    }, []);

    return (
        <section className="featured-products">
            <div className="container">
                <div className="featured-products-header">
                    <div>
                        <p className="featured-products-eyebrow">
                            03 — Featured Collection
                        </p>

                        <h2 className="display-text">
                            Selected
                            <br />
                            pieces.
                        </h2>
                    </div>

                    <Link
                        to="/products"
                        className="editorial-link"
                    >
                        View all pieces
                        <span>→</span>
                    </Link>
                </div>

                {loading ? (
                    <div
                        className="featured-products-message"
                        role="status"
                    >
                        <span className="featured-products-message-label">
                            HIMORA / COLLECTION
                        </span>

                        <h3>Discovering the collection</h3>

                        <p>
                            Please wait while we bring the collection
                            together.
                        </p>
                    </div>
                ) : error ? (
                    <div
                        className="featured-products-message"
                        role="alert"
                    >
                        <span className="featured-products-message-label">
                            HIMORA / COLLECTION
                        </span>

                        <h3>Collection temporarily unavailable</h3>

                        <p>
                            We couldn’t load the featured collection.
                            Please try again shortly.
                        </p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="featured-products-message">
                        <span className="featured-products-message-label">
                            HIMORA / COMING SOON
                        </span>

                        <h3>Something exceptional is on its way.</h3>

                        <p>
                            Our featured collection is being carefully
                            curated. Discover it here soon.
                        </p>
                    </div>
                ) : (
                    <div className="featured-products-grid">
                        {products.map((product) => {
                            const imageUrl = getProductImage(product);

                            return (
                                <Link
                                    key={product.id}
                                    to={`/products/${product.slug}`}
                                    className="featured-product-card"
                                >
                                    <div className="featured-product-image">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={
                                                    product.images?.find(
                                                        (image) =>
                                                            image.is_primary
                                                    )?.alt_text ||
                                                    product.name
                                                }
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="featured-product-placeholder">
                                                HIMORA
                                            </div>
                                        )}
                                    </div>

                                    <div className="featured-product-info">
                                        <div>
                                            <span>
                                                {product.category?.name ||
                                                    "HIMORA"}
                                            </span>

                                            <h3>{product.name}</h3>
                                        </div>

                                        <span>
                                            NPR{" "}
                                            {Number(
                                                product.price
                                            ).toLocaleString("en-NP")}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

export default FeaturedProducts;