
import { useMemo, useState } from "react";
import { Search as SearchIcon, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import "./Search.css";

const products = [
    {
        id: "himora-horizon",
        name: "Horizon",
        category: "Eyewear",
        code: "HIMORA / E-01",
        price: "NPR 18,500",
        image:
            "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",
    },
    {
        id: "himora-altitude",
        name: "Altitude",
        category: "Eyewear",
        code: "HIMORA / E-02",
        price: "NPR 18,500",
        image:
            "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=85",
    },
];

function Search() {
    const [query, setQuery] = useState("");

    const filteredProducts = useMemo(() => {
        const searchTerm = query.trim().toLowerCase();

        if (!searchTerm) {
            return [];
        }

        return products.filter((product) =>
            `${product.name} ${product.category} ${product.code}`
                .toLowerCase()
                .includes(searchTerm)
        );
    }, [query]);

    return (
        <main className="search-page">
            <section className="search-page-header">
                <p className="search-page-eyebrow">
                    HIMORA / DISCOVER
                </p>

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
                        {query.trim()
                            ? `${filteredProducts.length} RESULTS`
                            : "SUGGESTED SEARCHES"}
                    </span>
                </div>

                {!query.trim() ? (
                    <div className="search-suggestions">
                        {["Eyewear", "Horizon", "Altitude"].map((term) => (
                            <button
                                type="button"
                                key={term}
                                onClick={() => setQuery(term)}
                            >
                                {term}
                                <ArrowUpRight size={15} />
                            </button>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="search-results-grid">
                        {filteredProducts.map((product) => (
                            <Link
                                to="/products/himora-horizon"
                                className="search-product"
                                key={product.id}
                            >
                                <div className="search-product-image">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                    />
                                </div>

                                <div className="search-product-info">
                                    <div>
                                        <span>{product.code}</span>
                                        <h2>{product.name}</h2>
                                        <p>{product.category}</p>
                                    </div>

                                    <span className="search-product-price">
                                        {product.price}
                                    </span>
                                </div>
                            </Link>
                        ))}
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