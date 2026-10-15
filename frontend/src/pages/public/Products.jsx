import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./Products.css";

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

function getProductImage(product) {
    const images = Array.isArray(product.images)
        ? [...product.images].sort(
              (a, b) =>
                  Number(b.is_primary) - Number(a.is_primary) ||
                  (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
        : [];

    const imageUrl = images[0]?.image_url;

    if (!imageUrl) return null;

    if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
    }

    return `${API_BASE_URL}/${imageUrl.replace(/^\/+/, "")}`;
}

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadProducts() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API_BASE_URL}/api/products`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Unable to load the collection.");
                }

                const data = await response.json();

                const productList = Array.isArray(data)
                    ? data
                    : Array.isArray(data.items)
                      ? data.items
                      : Array.isArray(data.products)
                        ? data.products
                        : [];

                setProducts(
                    productList.filter(
                        (product) => product.is_active !== false
                    )
                );
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(
                        err.message ||
                            "Something went wrong while loading products."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => controller.abort();
    }, []);

    return (
        <main className="products-page">
            <section className="products-page-header">
                <p className="products-page-eyebrow">
                    HIMORA / COLLECTION
                </p>

                <h1>
                    All
                    <br />
                    pieces.
                </h1>

                <p>
                    A considered selection of HIMORA pieces,
                    designed around modern living and inspired
                    by the Himalayas.
                </p>
            </section>

            {loading ? (
                <section className="products-page-state" aria-live="polite">
                    <p>Discovering the collection...</p>
                </section>
            ) : error ? (
                <section className="products-page-state" role="alert">
                    <p>{error}</p>

                    <button
                        type="button"
                        className="products-page-retry"
                        onClick={() => window.location.reload()}
                    >
                        Try again →
                    </button>
                </section>
            ) : products.length === 0 ? (
                <section className="products-page-state products-page-empty">
                    <span className="products-page-empty-label">
                        THE COLLECTION
                    </span>

                    <h2>Something considered is coming.</h2>

                    <p>
                        Our next collection is being prepared.
                        Please return soon to discover the pieces.
                    </p>

                    <Link to="/collections">
                        Explore the collections →
                    </Link>
                </section>
            ) : (
                <section className="products-page-grid">
                    {products.map((product) => {
                        const imageUrl = getProductImage(product);

                        return (
                            <Link
                                key={product.id}
                                to={`/products/${product.slug || product.id}`}
                                className="products-page-card"
                            >
                                <div className="products-page-image">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={
                                                product.images?.find(
                                                    (image) => image.is_primary
                                                )?.alt_text || product.name
                                            }
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="products-page-placeholder">
                                            HIMORA
                                        </div>
                                    )}

                                    <span className="products-page-view">
                                        Discover piece →
                                    </span>
                                </div>

                                <div className="products-page-info">
                                    <div>
                                        <span>
                                            HIMORA /{" "}
                                            {product.category?.name ||
                                                "COLLECTION"}
                                        </span>

                                        <h2>{product.name}</h2>
                                    </div>

                                    <span>
                                        NPR{" "}
                                        {Number(product.price).toLocaleString(
                                            "en-NP"
                                        )}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            )}

            {!loading && !error && products.length > 0 && (
                <section className="products-page-footer">
                    <p>
                        You have discovered every available piece in
                        this collection.
                    </p>

                    <Link to="/collections">
                        Explore the collections →
                    </Link>
                </section>
            )}
        </main>
    );
}

export default Products;