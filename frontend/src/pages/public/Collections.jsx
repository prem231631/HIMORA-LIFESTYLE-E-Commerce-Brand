import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    SlidersHorizontal,
    X,
    ArrowUpDown,
    PackageSearch,
} from "lucide-react";

import "./Collections.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const PRODUCTS_ENDPOINT =
    import.meta.env.VITE_PRODUCTS_ENDPOINT || "/api/products";

const formatPrice = (price) =>
    new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
    }).format(Number(price) || 0);

function getProductImage(product) {
    const images = Array.isArray(product.images)
        ? [...product.images].sort((a, b) => {
              if (a.is_primary !== b.is_primary) {
                  return a.is_primary ? -1 : 1;
              }

              return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          })
        : [];

    const imageUrl = images[0]?.image_url;

    if (!imageUrl) return "";

    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("data:")
    ) {
        return imageUrl;
    }

    if (imageUrl.startsWith("/")) {
        return `${API_BASE_URL}${imageUrl}`;
    }

    return imageUrl;
}

function getProductCategory(product) {
    if (typeof product.category === "string") {
        return product.category;
    }

    return product.category?.name || "";
}

function getProductPath(product) {
    return `/products/${product.slug}`;
}

function Collections() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProducts = useCallback(async (signal) => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}${PRODUCTS_ENDPOINT}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    signal,
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Unable to load products. Server returned ${response.status}.`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("The products API returned an unexpected response.");
            }

            setProducts(data);
        } catch (err) {
            if (err.name !== "AbortError") {
                setError(
                    err.message ||
                        "Something went wrong while loading products."
                );
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        loadProducts(controller.signal);

        return () => controller.abort();
    }, [loadProducts]);

    const categories = useMemo(() => {
        const uniqueCategories = new Map();

        products.forEach((product) => {
            const name = getProductCategory(product);
            const slug = product.category?.slug;

            if (name) {
                uniqueCategories.set(name, {
                    name,
                    slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
                });
            }
        });

        return [...uniqueCategories.values()].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [products]);

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        const minimum =
            minPrice.trim() === "" ? null : Number(minPrice);
        const maximum =
            maxPrice.trim() === "" ? null : Number(maxPrice);

        const result = products.filter((product) => {
            const name = (product.name || "").toLowerCase();
            const description = (product.description || "").toLowerCase();
            const category = getProductCategory(product);
            const price = Number(product.price) || 0;

            const matchesSearch =
                !query ||
                name.includes(query) ||
                description.includes(query) ||
                category.toLowerCase().includes(query);

            const matchesCategory =
                selectedCategory === "All" ||
                category === selectedCategory;

            const matchesMinimum =
                minimum === null ||
                (Number.isFinite(minimum) && price >= minimum);

            const matchesMaximum =
                maximum === null ||
                (Number.isFinite(maximum) && price <= maximum);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesMinimum &&
                matchesMaximum
            );
        });

        switch (sortBy) {
            case "price-low":
                result.sort(
                    (a, b) => Number(a.price) - Number(b.price)
                );
                break;

            case "price-high":
                result.sort(
                    (a, b) => Number(b.price) - Number(a.price)
                );
                break;

            case "name":
                result.sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "")
                );
                break;

            case "featured":
                result.sort(
                    (a, b) =>
                        Number(Boolean(b.is_featured)) -
                        Number(Boolean(a.is_featured))
                );
                break;

            case "newest":
            default:
                // The API already returns products newest first.
                break;
        }

        return result;
    }, [
        products,
        search,
        selectedCategory,
        minPrice,
        maxPrice,
        sortBy,
    ]);

    const resetFilters = () => {
        setSearch("");
        setSelectedCategory("All");
        setMinPrice("");
        setMaxPrice("");
        setSortBy("newest");
    };

    const filtersContent = (
        <>
            <div className="catalogue-filter-heading">
                <h3>Filters</h3>

                <button
                    type="button"
                    className="catalogue-reset-button"
                    onClick={resetFilters}
                >
                    Clear all
                </button>
            </div>

            <div className="catalogue-filter-group">
                <h4>Categories</h4>

                <div className="catalogue-category-options">
                    <button
                        type="button"
                        className={
                            selectedCategory === "All"
                                ? "catalogue-category-option active"
                                : "catalogue-category-option"
                        }
                        onClick={() => setSelectedCategory("All")}
                    >
                        <span>All products</span>
                        <span>{products.length}</span>
                    </button>

                    {categories.map((category) => {
                        const count = products.filter(
                            (product) =>
                                getProductCategory(product) === category.name
                        ).length;

                        return (
                            <button
                                type="button"
                                key={category.slug}
                                className={
                                    selectedCategory === category.name
                                        ? "catalogue-category-option active"
                                        : "catalogue-category-option"
                                }
                                onClick={() =>
                                    setSelectedCategory(category.name)
                                }
                            >
                                <span>{category.name}</span>
                                <span>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="catalogue-filter-group">
                <h4>Price range (NPR)</h4>

                <div className="catalogue-price-inputs">
                    <label>
                        <span>Minimum</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={minPrice}
                            onChange={(event) =>
                                setMinPrice(event.target.value)
                            }
                        />
                    </label>

                    <span className="catalogue-price-separator">—</span>

                    <label>
                        <span>Maximum</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="Any"
                            value={maxPrice}
                            onChange={(event) =>
                                setMaxPrice(event.target.value)
                            }
                        />
                    </label>
                </div>

                {minPrice !== "" &&
                    maxPrice !== "" &&
                    Number(minPrice) > Number(maxPrice) && (
                        <p className="catalogue-filter-hint">
                            Minimum price exceeds maximum price.
                        </p>
                    )}
            </div>
        </>
    );

    return (
        <main className="collections-page">
            <section className="collections-hero">
                <div className="collections-hero-content">
                    <p className="collections-eyebrow">
                        HIMORA LIFESTYLE
                    </p>

                    <h1>The Collection</h1>

                    <p className="collections-hero-description">
                        Considered pieces, timeless details, and
                        contemporary essentials inspired by the
                        landscapes and spirit of the Himalayas.
                    </p>
                </div>
            </section>

            <section className="collections-intro">
                <div className="collections-intro-label">
                    <span>01</span>
                    <span>THE WORLD OF HIMORA</span>
                </div>

                <div className="collections-intro-content">
                    <h2>Designed with intention.</h2>

                    <p>
                        Explore the HIMORA collection. Discover pieces
                        selected for their thoughtful design, everyday
                        versatility, and lasting character.
                    </p>
                </div>
            </section>

            <section className="catalogue-section" id="all-products">
                <div className="catalogue-header">
                    <div>
                        <p className="catalogue-eyebrow">
                            THE COMPLETE COLLECTION
                        </p>

                        <h2>Shop all products</h2>

                        <p className="catalogue-description">
                            Find something that feels distinctly yours.
                        </p>
                    </div>

                    <div className="catalogue-search">
                        <Search size={18} aria-hidden="true" />

                        <input
                            type="search"
                            placeholder="Search products..."
                            aria-label="Search products"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />

                        {search && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setSearch("")}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="catalogue-toolbar">
                    <p>
                        <strong>{filteredProducts.length}</strong>{" "}
                        {filteredProducts.length === 1
                            ? "product"
                            : "products"}
                    </p>

                    <div className="catalogue-toolbar-actions">
                        <button
                            type="button"
                            className="catalogue-mobile-filter-button"
                            onClick={() =>
                                setMobileFiltersOpen((open) => !open)
                            }
                        >
                            <SlidersHorizontal size={16} />
                            {mobileFiltersOpen
                                ? "Hide filters"
                                : "Filters"}
                        </button>

                        <label className="catalogue-sort">
                            <ArrowUpDown size={15} />

                            <span>Sort by</span>

                            <select
                                value={sortBy}
                                onChange={(event) =>
                                    setSortBy(event.target.value)
                                }
                                aria-label="Sort products"
                            >
                                <option value="newest">Newest</option>
                                <option value="featured">Featured</option>
                                <option value="price-low">
                                    Price: low to high
                                </option>
                                <option value="price-high">
                                    Price: high to low
                                </option>
                                <option value="name">Name</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="catalogue-layout">
                    <aside className="catalogue-sidebar">
                        {filtersContent}
                    </aside>

                    {mobileFiltersOpen && (
                        <div className="catalogue-mobile-filters">
                            <div className="catalogue-mobile-filters-top">
                                <span>Refine your selection</span>

                                <button
                                    type="button"
                                    aria-label="Close filters"
                                    onClick={() => setMobileFiltersOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {filtersContent}

                            <button
                                type="button"
                                className="catalogue-apply-filters"
                                onClick={() =>
                                    setMobileFiltersOpen(false)
                                }
                            >
                                Show {filteredProducts.length} products
                            </button>
                        </div>
                    )}

                    <div className="catalogue-results">
                        {loading ? (
                            <div className="catalogue-message">
                                <div className="catalogue-loader" />
                                <p>Discovering the collection...</p>
                            </div>
                        ) : error ? (
                            <div className="catalogue-message catalogue-error">
                                <PackageSearch size={34} />

                                <h3>We couldn't load the collection.</h3>

                                <p>{error}</p>

                                <button
                                    type="button"
                                    className="catalogue-retry-button"
                                    onClick={() => {
                                        const controller =
                                            new AbortController();

                                        loadProducts(controller.signal);
                                    }}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="catalogue-message">
                                <PackageSearch size={38} />

                                <h3>No products found</h3>

                                <p>
                                    Try another search or adjust your
                                    filters to explore more of HIMORA.
                                </p>

                                <button
                                    type="button"
                                    className="catalogue-retry-button"
                                    onClick={resetFilters}
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="catalogue-product-grid">
                                {filteredProducts.map((product) => {
                                    const image = getProductImage(product);

                                    return (
                                        <article
                                            className="catalogue-product-card"
                                            key={product.id}
                                        >
                                            <Link
                                                to={getProductPath(product)}
                                                className="catalogue-product-image"
                                                aria-label={`View ${product.name}`}
                                            >
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt={
                                                            product.images?.find(
                                                                (item) =>
                                                                    item.is_primary
                                                            )?.alt_text ||
                                                            product.name
                                                        }
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="catalogue-image-placeholder">
                                                        <PackageSearch
                                                            size={30}
                                                        />
                                                        <span>
                                                            HIMORA LIFESTYLE
                                                        </span>
                                                    </div>
                                                )}

                                                {product.is_new && (
                                                    <span className="catalogue-product-badge">
                                                        New arrival
                                                    </span>
                                                )}

                                                {!product.is_new &&
                                                    product.is_limited && (
                                                        <span className="catalogue-product-badge">
                                                            Limited edition
                                                        </span>
                                                    )}
                                            </Link>

                                            <div className="catalogue-product-info">
                                                <p className="catalogue-product-category">
                                                    {getProductCategory(product) ||
                                                        "HIMORA"}
                                                </p>

                                                <Link
                                                    to={getProductPath(product)}
                                                    className="catalogue-product-name"
                                                >
                                                    {product.name}
                                                </Link>

                                                {product.description && (
                                                    <p className="catalogue-product-description">
                                                        {product.description}
                                                    </p>
                                                )}

                                                <div className="catalogue-product-bottom">
                                                    <span className="catalogue-product-price">
                                                        {formatPrice(
                                                            product.price
                                                        )}
                                                    </span>

                                                    <Link
                                                        to={getProductPath(product)}
                                                        className="catalogue-view-product"
                                                    >
                                                        View details
                                                        <span aria-hidden="true">
                                                            {" "}↗
                                                        </span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="collections-statement">
                <p>
                    “Inspired by the Himalayas.
                    Designed for the modern world.”
                </p>

                <Link to="/">Return Home</Link>
            </section>
        </main>
    );
}

export default Collections;