import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    SlidersHorizontal,
    X,
    ShoppingBag,
    ArrowUpDown,
    PackageSearch,
} from "lucide-react";

import "./Collections.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const PRODUCTS_ENDPOINT =
    import.meta.env.VITE_PRODUCTS_ENDPOINT || "/api/products";

const CATEGORIES_ENDPOINT =
    import.meta.env.VITE_CATEGORIES_ENDPOINT || "/api/categories";

const formatPrice = (price) =>
    new Intl.NumberFormat("en-NP", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
    }).format(Number(price) || 0);

function getProductPrice(product) {
    return Number(
        product.price ??
        product.selling_price ??
        product.sale_price ??
        product.unit_price ??
        0
    );
}

function getProductCategory(product) {
    const category = product.category;

    if (typeof category === "string") return category;
    if (category && typeof category === "object") {
        return category.name || category.title || "";
    }

    return product.category_name || "";
}

function getProductImage(product) {
    const image =
        product.image_url ||
        product.image ||
        product.thumbnail ||
        product.primary_image ||
        product.images?.[0]?.image_url ||
        product.images?.[0]?.url;

    if (typeof image === "string") {
        if (image.startsWith("http://") || image.startsWith("https://")) {
            return image;
        }

        if (image.startsWith("/")) {
            return `${API_BASE_URL}${image}`;
        }

        return image;
    }

    return "";
}

function getProductId(product) {
    return product.slug || product.id || product.product_id;
}

function getProductName(product) {
    return product.name || product.title || "Untitled product";
}

function getProductPath(product) {
    const id = getProductId(product);

    return id ? `/products/${id}` : "/products";
}

function getProductsFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function getCategoriesFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function Collections() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("featured");
    const [inStockOnly, setInStockOnly] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const loadCatalogue = useCallback(async (signal) => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");

            const headers = {
                Accept: "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const [productsResponse, categoriesResponse] =
                await Promise.all([
                    fetch(`${API_BASE_URL}${PRODUCTS_ENDPOINT}`, {
                        headers,
                        signal,
                    }),
                    fetch(`${API_BASE_URL}${CATEGORIES_ENDPOINT}`, {
                        headers,
                        signal,
                    }),
                ]);

            if (!productsResponse.ok) {
                throw new Error(
                    `Could not load products (HTTP ${productsResponse.status}).`
                );
            }

            const productsData = await productsResponse.json();

            if (!categoriesResponse.ok) {
                console.warn(
                    "Categories could not be loaded:",
                    categoriesResponse.status
                );
            }

            setProducts(getProductsFromResponse(productsData));

            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                setCategories(getCategoriesFromResponse(categoriesData));
            } else {
                setCategories([]);
            }
        } catch (err) {
            if (err.name === "AbortError") return;

            console.error("Catalogue loading error:", err);
            setError(
                err.message ||
                "Unable to load the collection. Please try again."
            );
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        loadCatalogue(controller.signal);

        return () => controller.abort();
    }, [loadCatalogue]);

    const categoryNames = useMemo(() => {
        const names = categories
            .map((category) =>
                typeof category === "string"
                    ? category
                    : category.name || category.title
            )
            .filter(Boolean);

        const productCategoryNames = products
            .map(getProductCategory)
            .filter(Boolean);

        return [
            "All",
            ...new Set([...names, ...productCategoryNames]),
        ];
    }, [categories, products]);

    const filteredProducts = useMemo(() => {
        let result = [...products];

        const query = search.trim().toLowerCase();

        if (query) {
            result = result.filter((product) => {
                const searchableText = [
                    getProductName(product),
                    product.description,
                    getProductCategory(product),
                    product.brand,
                    product.sku,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            });
        }

        if (selectedCategory !== "All") {
            result = result.filter(
                (product) =>
                    getProductCategory(product).toLowerCase() ===
                    selectedCategory.toLowerCase()
            );
        }

        if (minPrice !== "" && Number.isFinite(Number(minPrice))) {
            result = result.filter(
                (product) => getProductPrice(product) >= Number(minPrice)
            );
        }

        if (maxPrice !== "" && Number.isFinite(Number(maxPrice))) {
            result = result.filter(
                (product) => getProductPrice(product) <= Number(maxPrice)
            );
        }

        if (inStockOnly) {
            result = result.filter((product) => {
                const stock =
                    product.stock_quantity ??
                    product.stock ??
                    product.quantity ??
                    product.inventory?.quantity;

                return product.is_active !== false &&
                    product.is_available !== false &&
                    (stock === undefined || Number(stock) > 0);
            });
        }

        if (sortBy === "price-low") {
            result.sort((a, b) => getProductPrice(a) - getProductPrice(b));
        } else if (sortBy === "price-high") {
            result.sort((a, b) => getProductPrice(b) - getProductPrice(a));
        } else if (sortBy === "name") {
            result.sort((a, b) =>
                getProductName(a).localeCompare(getProductName(b))
            );
        } else if (sortBy === "newest") {
            result.sort(
                (a, b) =>
                    new Date(b.created_at || b.createdAt || 0) -
                    new Date(a.created_at || a.createdAt || 0)
            );
        }

        return result;
    }, [
        products,
        search,
        selectedCategory,
        minPrice,
        maxPrice,
        sortBy,
        inStockOnly,
    ]);

    const resetFilters = () => {
        setSearch("");
        setSelectedCategory("All");
        setMinPrice("");
        setMaxPrice("");
        setSortBy("featured");
        setInStockOnly(false);
    };

    return (
        <main className="collections-page catalogue-page">
            <section className="catalogue-hero">
                <div className="catalogue-hero-inner">
                    <p className="catalogue-eyebrow">
                        HIMORA LIFESTYLE / THE COLLECTION
                    </p>

                    <h1>
                        Considered pieces.
                        <br />
                        <span>Enduring style.</span>
                    </h1>

                    <p>
                        Explore the complete collection of eyewear,
                        apparel, accessories, and everyday essentials.
                    </p>
                </div>
            </section>

            <section className="catalogue-section">
                <div className="catalogue-heading">
                    <div>
                        <p className="catalogue-eyebrow">
                            THE HIMORA EDIT
                        </p>
                        <h2>Shop the collection</h2>
                    </div>

                    <span className="catalogue-count">
                        {loading
                            ? "Loading pieces…"
                            : `${filteredProducts.length} pieces`}
                    </span>
                </div>

                <div className="catalogue-toolbar">
                    <label className="catalogue-search">
                        <Search size={18} />

                        <input
                            type="search"
                            placeholder="Search the collection..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        {search && (
                            <button
                                type="button"
                                className="catalogue-clear-search"
                                aria-label="Clear search"
                                onClick={() => setSearch("")}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </label>

                    <button
                        type="button"
                        className="catalogue-mobile-filter"
                        onClick={() =>
                            setMobileFiltersOpen((previous) => !previous)
                        }
                    >
                        <SlidersHorizontal size={17} />
                        Filters
                    </button>

                    <label className="catalogue-sort">
                        <ArrowUpDown size={16} />

                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            aria-label="Sort products"
                        >
                            <option value="featured">Featured</option>
                            <option value="newest">Newest first</option>
                            <option value="price-low">
                                Price: low to high
                            </option>
                            <option value="price-high">
                                Price: high to low
                            </option>
                            <option value="name">Name: A–Z</option>
                        </select>
                    </label>
                </div>

                <div className="catalogue-layout">
                    <aside
                        className={`catalogue-sidebar ${
                            mobileFiltersOpen ? "is-open" : ""
                        }`}
                    >
                        <div className="catalogue-sidebar-heading">
                            <h3>Refine your search</h3>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="catalogue-reset"
                            >
                                Clear all
                            </button>

                            <button
                                type="button"
                                className="catalogue-close-filters"
                                aria-label="Close filters"
                                onClick={() => setMobileFiltersOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="catalogue-filter-group">
                            <h4>Categories</h4>

                            <div className="catalogue-category-list">
                                {categoryNames.map((category) => (
                                    <button
                                        type="button"
                                        key={category}
                                        className={
                                            selectedCategory === category
                                                ? "is-selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            setSelectedCategory(category)
                                        }
                                    >
                                        <span>{category}</span>

                                        {selectedCategory === category && (
                                            <span aria-hidden="true">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="catalogue-filter-group">
                            <h4>Price range</h4>

                            <p className="catalogue-filter-hint">
                                Set your preferred price in NPR.
                            </p>

                            <div className="catalogue-price-inputs">
                                <label>
                                    <span>Min</span>
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

                                <span className="catalogue-price-dash">—</span>

                                <label>
                                    <span>Max</span>
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
                                    <p className="catalogue-filter-error">
                                        Minimum price must not exceed maximum.
                                    </p>
                                )}
                        </div>

                        <div className="catalogue-filter-group">
                            <h4>Availability</h4>

                            <label className="catalogue-stock-filter">
                                <input
                                    type="checkbox"
                                    checked={inStockOnly}
                                    onChange={(event) =>
                                        setInStockOnly(event.target.checked)
                                    }
                                />
                                <span>Available products only</span>
                            </label>
                        </div>

                        <button
                            type="button"
                            className="catalogue-apply-filters"
                            onClick={() => setMobileFiltersOpen(false)}
                        >
                            Show {filteredProducts.length} pieces
                        </button>
                    </aside>

                    <div className="catalogue-results">
                        {error && (
                            <div className="catalogue-message catalogue-error">
                                <h3>We couldn't load the collection.</h3>
                                <p>{error}</p>
                                <button
                                    type="button"
                                    onClick={() => loadCatalogue()}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {loading && !error && (
                            <div className="catalogue-loading">
                                <span className="catalogue-loader" />
                                <p>Curating the collection...</p>
                            </div>
                        )}

                        {!loading && !error && filteredProducts.length === 0 && (
                            <div className="catalogue-message catalogue-empty">
                                <PackageSearch size={36} strokeWidth={1.3} />
                                <h3>No pieces found</h3>
                                <p>
                                    Try changing your search or removing some
                                    filters.
                                </p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {!loading && !error && filteredProducts.length > 0 && (
                            <div className="catalogue-product-grid">
                                {filteredProducts.map((product, index) => {
                                    const image = getProductImage(product);
                                    const price = getProductPrice(product);
                                    const productId = getProductId(product);
                                    const name = getProductName(product);
                                    const category =
                                        getProductCategory(product);

                                    const originalPrice = Number(
                                        product.original_price ??
                                        product.compare_at_price ??
                                        product.mrp ??
                                        0
                                    );

                                    return (
                                        <article
                                            className="catalogue-product-card"
                                            key={productId ?? `${name}-${index}`}
                                        >
                                            <Link
                                                to={getProductPath(product)}
                                                className="catalogue-product-link"
                                            >
                                                <div className="catalogue-product-image">
                                                    {image ? (
                                                        <img
                                                            src={image}
                                                            alt={name}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="catalogue-no-image">
                                                            <ShoppingBag
                                                                size={30}
                                                                strokeWidth={1.2}
                                                            />
                                                            <span>HIMORA</span>
                                                        </div>
                                                    )}

                                                    {product.is_new && (
                                                        <span className="catalogue-product-badge">
                                                            New
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="catalogue-product-info">
                                                    <p className="catalogue-product-category">
                                                        {category || "HIMORA"}
                                                    </p>

                                                    <h3>{name}</h3>

                                                    <div className="catalogue-product-prices">
                                                        <span className="catalogue-product-price">
                                                            {formatPrice(price)}
                                                        </span>

                                                        {originalPrice > price &&
                                                            price > 0 && (
                                                                <span className="catalogue-original-price">
                                                                    {formatPrice(
                                                                        originalPrice
                                                                    )}
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                to={getProductPath(product)}
                                                className="catalogue-view-product"
                                            >
                                                View piece <span>→</span>
                                            </Link>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="catalogue-statement">
                <p>
                    Inspired by the Himalayas.
                    <br />
                    Designed for the modern world.
                </p>

                <Link to="/">Return home</Link>
            </section>
        </main>
    );
}

export default Collections;