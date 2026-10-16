import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./EyewearSection.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

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

function EyewearSection() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadEyewear() {
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
                    throw new Error("Unable to load eyewear products.");
                }

                const data = await response.json();

                const eyewearProducts = (Array.isArray(data) ? data : [])
                    .filter((product) => {
                        const categoryName =
                            product.category?.name?.toLowerCase() || "";

                        const categorySlug =
                            product.category?.slug?.toLowerCase() || "";

                        return (
                            product.is_active !== false &&
                            (categorySlug === "eyewear" ||
                                categoryName === "eyewear")
                        );
                    })
                    .slice(0, 2);

                setProducts(eyewearProducts);
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Eyewear loading error:", err);
                    setError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadEyewear();

        return () => controller.abort();
    }, []);

    return (
        <section className="eyewear-section">
            <div className="container">
                <div className="eyewear-intro">
                    <div>
                        <p className="eyewear-eyebrow">
                            02 — Eyewear
                        </p>
                    </div>

                    <div className="eyewear-intro-copy">
                        <h2 className="display-text">
                            Designed to
                            <br />
                            be seen.
                        </h2>

                        <p>
                            Explore considered eyewear from the HIMORA
                            collection, where distinctive design meets
                            everyday expression.
                        </p>

                        <Link
                            to="/eyewear"
                            className="editorial-link"
                        >
                            Explore eyewear
                            <span>→</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="eyewear-coming-soon" role="status">
                        <span>HIMORA / EYEWEAR</span>
                        <h3>Discovering the collection</h3>
                        <p>Loading available eyewear pieces.</p>
                    </div>
                ) : error ? (
                    <div className="eyewear-coming-soon" role="alert">
                        <span>HIMORA / EYEWEAR</span>
                        <h3>The collection is temporarily unavailable.</h3>
                        <p>Please try again shortly.</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="eyewear-coming-soon">
                        <span>HIMORA / COMING SOON</span>
                        <h3>A clearer point of view is on its way.</h3>
                        <p>
                            Our eyewear collection is being prepared.
                            Visit again soon to discover the pieces.
                        </p>
                    </div>
                ) : (
                    <div className="eyewear-grid">
                        {products.map((product, index) => {
                            const imageUrl = getProductImage(product);

                            return (
                                <Link
                                    key={product.id}
                                    to={`/products/${product.slug}`}
                                    className={`eyewear-image ${
                                        index === 0
                                            ? "eyewear-image-large"
                                            : "eyewear-image-small"
                                    }`}
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
                                        <div className="eyewear-product-placeholder">
                                            HIMORA
                                        </div>
                                    )}

                                    <div className="eyewear-image-label">
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

export default EyewearSection;