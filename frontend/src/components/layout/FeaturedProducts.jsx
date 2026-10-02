import ProductGrid from "../product/ProductGrid";
import "./FeaturedProducts.css";

function FeaturedProducts() {
    return (
        <section className="featured-products">
            <div className="container">

                <div className="featured-products-header">
                    <div>
                        <p className="eyebrow">
                            03 — Selected Pieces
                        </p>
                    </div>

                    <div className="featured-products-heading">
                        <h2 className="display-text">
                            Pieces worth
                            <br />
                            keeping.
                        </h2>

                        <a
                            href="/collections"
                            className="editorial-link"
                        >
                            View all pieces
                            <span>→</span>
                        </a>
                    </div>
                </div>

                <div className="featured-products-list">
                    <ProductGrid />
                </div>

            </div>
        </section>
    );
}

export default FeaturedProducts;