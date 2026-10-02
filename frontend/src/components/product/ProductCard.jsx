import "./ProductCard.css";

function ProductCard({ product }) {
    const primaryImage =
        product.images?.find((image) => image.is_primary) ||
        product.images?.[0];

    return (
        <article className="product-card">
            <a
                href={`/products/${product.slug}`}
                className="product-card-image"
            >
                {primaryImage ? (
                    <img
                        src={primaryImage.image_url}
                        alt={product.name}
                    />
                ) : (
                    <div className="product-card-image-placeholder">
                        <span>HIMORA</span>
                    </div>
                )}
            </a>

            <div className="product-card-info">
                <div className="product-card-details">
                    <div>
                        <p className="product-card-category">
                            {product.category?.name || "HIMORA"}
                        </p>

                        <h3>{product.name}</h3>
                    </div>

                    <p className="product-card-price">
                        NPR {Number(product.price).toLocaleString()}
                    </p>
                </div>

                <a
                    href={`/products/${product.slug}`}
                    className="product-card-link"
                >
                    View product
                    <span>→</span>
                </a>
            </div>
        </article>
    );
}

export default ProductCard;