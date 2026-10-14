import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./NewCollection.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getProductImage(product) {
    const image =
        product.images?.find((item) => item.is_primary) ||
        product.images?.[0];

    if (!image?.image_url) return null;

    if (/^https?:\/\//i.test(image.image_url)) {
        return image.image_url;
    }

    return `${API_BASE_URL.replace(/\/$/, "")}/${image.image_url.replace(
        /^\//,
        ""
    )}`;
}

function NewCollection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadNewArrivals() {
            try {
                setLoading(true);
                setError(false);

                const response = await fetch(
                    `${API_BASE_URL}/api/products`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Could not load new arrivals.");
                }

                const data = await response.json();

                const activeProducts = Array.isArray(data)
                    ? data.filter((product) => product.is_active !== false)
                    : [];

                setProducts(activeProducts.slice(0, 4));
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("New arrivals error:", err);
                    setError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadNewArrivals();

        return () => controller.abort();
    }, []);

    return (
        <section className="new-collection">
            <div className="container">
                <div className="collection-intro">
                    <div>
                        <p className="eyebrow">
                            01 — The Latest Edit
                        </p>
                    </div>

                    <div className="collection-intro-copy">
                        <h2 className="display-text">
                            New arrivals.
                            <br />
                            Timeless character.
                        </h2>

                        <p>
                            Discover the latest pieces added to HIMORA
                            LIFESTYLE. Each product is presented directly
                            from our current collection.
                        </p>

                        <Link
                            to="/products"
                            className="editorial-link"
                        >
                            Discover all products
                            <span>→</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="collection-empty">
                        <span>HIMORA / NEW ARRIVALS</span>
                        <h3>Curating the latest edit</h3>
                        <p>
                            Please wait while we load the newest pieces.
                        </p>
                    </div>
                ) : error ? (
                    <div className="collection-empty" role="alert">
                        <span>HIMORA / NEW ARRIVALS</span>
                        <h3>The collection is temporarily unavailable.</h3>
                        <p>
                            We couldn't load the latest products. Please
                            try again shortly.
                        </p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="collection-empty">
                        <span>HIMORA / COMING SOON</span>
                        <h3>Something new is on its way.</h3>
                        <p>
                            Our next collection is being prepared.
                            Check back soon to discover the latest pieces.
                        </p>
                    </div>
                ) : (
                    <div className="collection-grid">
                        {products.map((product) => {
                            const imageUrl = getProductImage(product);

                            return (
                                <Link
                                    key={product.id}
                                    to={`/products/${product.slug}`}
                                    className="collection-image"
                                >
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
                                        <div className="collection-product-placeholder">
                                            HIMORA
                                        </div>
                                    )}

                                    <div className="collection-image-label">
                                        <span>{product.name}</span>

                                        <span>
                                            NPR{" "}
                                            {Number(
                                                product.price
                                            ).toLocaleString("en-NP")}
                                            {" "} →
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

export default NewCollection;