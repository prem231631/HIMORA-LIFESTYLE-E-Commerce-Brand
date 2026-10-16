import { Link } from "react-router-dom";
import "./ProductCard.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function ProductCard({ product }) {
    const primaryImage =
        product.images?.find((image) => image.is_primary) ||
        product.images?.[0];

    const imageUrl = primaryImage?.image_url
        ? primaryImage.image_url.startsWith("http")
            ? primaryImage.image_url
            : `${API_BASE_URL.replace(/\/$/, "")}/${primaryImage.image_url.replace(/^\//, "")}`
        : null;

    return (
        <article className="product-card">
            <Link
                to={`/products/${product.slug}`}
                className="product-card-image"
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={primaryImage?.alt_text || product.name}
                        loading="lazy"
                        onError={(event) => {
                            event.currentTarget.style.display = "none";
                        }}
                    />
                ) : (
                    <div className="product-card-image-placeholder">
                        <span>HIMORA</span>
                    </div>
                )}
            </Link>

            <div className="product-card-info">
                <div className="product-card-details">
                    <div>
                        <p className="product-card-category">
                            {product.category?.name || "HIMORA"}
                        </p>

                        <h3>{product.name}</h3>
                    </div>

                    <p className="product-card-price">
                        NPR{" "}
                        {Number(product.price).toLocaleString("en-NP")}
                    </p>
                </div>

                <Link
                    to={`/products/${product.slug}`}
                    className="product-card-link"
                >
                    View product
                    <span>→</span>
                </Link>
            </div>
        </article>
    );
}

export default ProductCard;