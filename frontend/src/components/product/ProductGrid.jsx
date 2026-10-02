import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { getFeaturedProducts } from "../../services/productService";
import "./ProductGrid.css";

function ProductGrid() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProducts() {
            try {
                const data = await getFeaturedProducts();

                setProducts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    if (loading) {
        return (
            <div className="product-grid-state">
                Loading collection...
            </div>
        );
    }

    if (error) {
        return (
            <div className="product-grid-state">
                <p>Unable to load the collection.</p>
            </div>
        );
    }

    if (!products.length) {
        return (
            <div className="product-grid-state">
                <p>No featured products available.</p>
            </div>
        );
    }

    return (
        <div className="product-grid">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                />
            ))}
        </div>
    );
}

export default ProductGrid;