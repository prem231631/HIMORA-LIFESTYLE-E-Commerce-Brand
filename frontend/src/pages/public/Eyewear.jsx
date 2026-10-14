import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Eyewear.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getProductImage(product) {
    const images = Array.isArray(product.images) ? product.images : [];

    const image =
        images.find((item) => item.is_primary) ||
        images.sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )[0];

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

function Eyewear() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchEyewear() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API_BASE_URL}/api/products`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Unable to load the eyewear collection.");
                }

                const data = await response.json();
                const allProducts = Array.isArray(data)
                    ? data
                    : data.items ?? data.products ?? [];

                const eyewearProducts = allProducts.filter((product) => {
                    const categoryName = product.category?.name
                        ?.trim()
                        .toLowerCase();

                    const categorySlug = product.category?.slug
                        ?.trim()
                        .toLowerCase();

                    return (
                        product.is_active !== false &&
                        (categorySlug === "eyewear" ||
                            categoryName === "eyewear")
                    );
                });

                setProducts(eyewearProducts);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(
                        err.message || "Something went wrong. Please try again."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchEyewear();

        return () => controller.abort();
    }, []);

    return (
        <main className="eyewear-page">
            {/* HERO */}
            <section className="eyewear-page-hero">
                <div className="eyewear-page-hero-content">
                    <p className="eyewear-page-eyebrow">
                        HIMORA / EYEWEAR
                    </p>

                    <h1>
                        Designed to
                        <br />
                        be seen.
                    </h1>

                    <p>
                        Distinctive frames shaped by clean geometry,
                        considered proportions, and a quiet sense
                        of individuality.
                    </p>
                </div>
            </section>

            {/* INTRO */}
            <section className="eyewear-page-intro">
                <div className="eyewear-page-intro-label">
                    <span>01</span>
                    <span>THE EYEWEAR COLLECTION</span>
                </div>

                <div className="eyewear-page-intro-copy">
                    <h2>
                        Form follows
                        <br />
                        character.
                    </h2>

                    <p>
                        HIMORA eyewear balances architectural form
                        with everyday wearability. Each silhouette
                        is designed to become part of how you move
                        through the world.
                    </p>
                </div>
            </section>

            {/* DATABASE PRODUCTS */}
            <section className="eyewear-products">
                <div className="eyewear-products-header">
                    <div>
                        <p>COLLECTION 01</p>
                        <h2>Eyewear</h2>
                    </div>

                    <span>
                        {loading
                            ? "Loading collection"
                            : `${products.length} ${
                                  products.length === 1 ? "piece" : "pieces"
                              }`}
                    </span>
                </div>

                {loading ? (
                    <div className="eyewear-coming-soon">
                        <p>HIMORA / EYEWEAR</p>
                        <h3>Discovering the collection...</h3>
                    </div>
                ) : error ? (
                    <div className="eyewear-coming-soon" role="alert">
                        <p>COLLECTION UNAVAILABLE</p>
                        <h3>We couldn't load the collection.</h3>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                        >
                            Try again
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="eyewear-coming-soon">
                        <p>HIMORA / EYEWEAR</p>
                        <h3>Something exceptional is coming.</h3>
                        <p>
                            Our eyewear collection is being curated.
                            Please return soon to discover the pieces.
                        </p>
                    </div>
                ) : (
                    <div className="eyewear-product-grid">
                        {products.map((product, index) => {
                            const imageUrl = getProductImage(product);

                            return (
                                <article
                                    className="eyewear-product-card"
                                    key={product.id ?? product.slug}
                                >
                                    <Link
                                        to={`/products/${product.slug}`}
                                        className="eyewear-product-image"
                                    >
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={
                                                    product.name ||
                                                    "HIMORA eyewear"
                                                }
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="eyewear-image-placeholder">
                                                HIMORA
                                            </div>
                                        )}

                                        <span>View piece →</span>
                                    </Link>

                                    <div className="eyewear-product-info">
                                        <div>
                                            <p>
                                                HIMORA / E-
                                                {String(index + 1).padStart(
                                                    2,
                                                    "0"
                                                )}
                                            </p>

                                            <h3>{product.name}</h3>
                                        </div>

                                        <strong>
                                            NPR{" "}
                                            {Number(
                                                product.price
                                            ).toLocaleString("en-NP")}
                                        </strong>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* STATEMENT */}
            <section className="eyewear-page-statement">
                <p>Designed for the horizon.</p>

                <Link to="/">Return Home</Link>
            </section>
        </main>
    );
}

export default Eyewear;