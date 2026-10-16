import { useCallback, useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./Search.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

const SUGGESTIONS = ["Eyewear", "Horizon", "Altitude"];

function formatPrice(price) {
    const amount = Number(price);

    if (!Number.isFinite(amount)) {
        return "Price unavailable";
    }

    return `NPR ${amount.toLocaleString("en-NP", {
        maximumFractionDigits: 2,
    })}`;
}

function getImageUrl(imageUrl) {
    if (!imageUrl) return null;

    if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
    }

    return `${API_BASE_URL.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;
}

function Search() {
    const [query, setQuery] = useState("");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchProducts = useCallback(async (signal) => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                signal,
            });

            if (!response.ok) {
                throw new Error("Unable to load products. Please try again.");
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("The products response has an unexpected format.");
            }

            setProducts(data.filter((product) => product.is_active !== false));
        } catch (err) {
            if (err.name === "AbortError") return;

            console.error("Unable to fetch HIMORA products:", err);
            setError(err.message || "Unable to load products. Please try again.");
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        fetchProducts(controller.signal);

        return () => controller.abort();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        const searchTerm = query.trim().toLowerCase();

        if (!searchTerm) return [];

        return products.filter((product) => {
            const searchableText = [
                product.name,
                product.slug,
                product.description,
                product.category?.name,
                product.category?.slug,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }, [query, products]);

    const handleSuggestion = (term) => {
        setQuery(term);
    };

    return (
        <main className="search-page">
            <section className="search-page-header">
                <p className="search-page-eyebrow">HIMORA / DISCOVER</p>

                <h1>
                    Find your
                    <br />
                    next piece.
                </h1>

                <p className="search-page-description">
                    Explore considered pieces from the HIMORA collection.
                </p>
            </section>

            <section className="search-content">
                <form
                    className="search-form"
                    onSubmit={(event) => event.preventDefault()}
                >
                    <SearchIcon size={21} strokeWidth={1.4} />

                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search products, categories..."
                        aria-label="Search HIMORA products"
                    />

                    {query && (
                        <button
                            type="button"
                            className="search-clear"
                            onClick={() => setQuery("")}
                        >
                            Clear
                        </button>
                    )}
                </form>

                <div className="search-results-header">
                    <span>
                        {loading
                            ? "LOADING PRODUCTS"
                            : query.trim()
                              ? `${filteredProducts.length} RESULTS`
                              : "SUGGESTED SEARCHES"}
                    </span>
                </div>

                {loading ? (
                    <div className="search-empty">
                        <p>Discovering the HIMORA collection...</p>
                    </div>
                ) : error ? (
                    <div className="search-empty">
                        <h2>Unable to load the collection.</h2>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="search-clear"
                            onClick={() => {
                                const controller = new AbortController();
                                fetchProducts(controller.signal);
                            }}
                        >
                            Try again
                        </button>
                    </div>
                ) : !query.trim() ? (
                    <div className="search-suggestions">
                        {SUGGESTIONS.map((term) => (
                            <button
                                type="button"
                                key={term}
                                onClick={() => handleSuggestion(term)}
                            >
                                {term}
                                <ArrowUpRight size={15} />
                            </button>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="search-results-grid">
                        {filteredProducts.map((product) => {
                            const primaryImage =
                                product.images?.find((image) => image.is_primary) ||
                                product.images?.[0];

                            const imageUrl = getImageUrl(primaryImage?.image_url);

                            return (
                                <Link
                                    to={`/products/${product.slug || product.id}`}
                                    className="search-product"
                                    key={product.id}
                                >
                                    <div className="search-product-image">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={
                                                    primaryImage?.alt_text ||
                                                    product.name
                                                }
                                                loading="lazy"
                                                onError={(event) => {
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="search-image-placeholder">
                                                <span>HIMORA</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="search-product-info">
                                        <div>
                                            <span>
                                                HIMORA /{" "}
                                                {product.category?.name ||
                                                    "COLLECTION"}
                                            </span>

                                            <h2>{product.name}</h2>

                                            <p>
                                                {product.category?.name ||
                                                    "HIMORA COLLECTION"}
                                            </p>
                                        </div>

                                        <span className="search-product-price">
                                            {formatPrice(product.price)}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="search-empty">
                        <h2>No pieces found.</h2>

                        <p>
                            Try another search term or explore our collections.
                        </p>

                        <Link to="/collections">
                            Explore collections →
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}

export default Search;