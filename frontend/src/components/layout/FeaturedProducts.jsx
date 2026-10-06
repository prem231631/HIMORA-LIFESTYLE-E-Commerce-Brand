import { Link } from "react-router-dom";

import "./FeaturedProducts.css";

function FeaturedProducts() {
    return (
        <section className="featured-products">
            <div className="container">

                <div className="featured-products-header">
                    <div>
                        <p className="featured-products-eyebrow">
                            03 — Featured Pieces
                        </p>

                        <h2 className="display-text">
                            Selected
                            <br />
                            pieces.
                        </h2>
                    </div>

                    <Link
                        to="/products"
                        className="editorial-link"
                    >
                        View all pieces
                        <span>→</span>
                    </Link>
                </div>

                <div className="featured-products-grid">

                    <Link
                        to="/products/himora-horizon"
                        className="featured-product-card"
                    >
                        <div className="featured-product-image">
                            <img
                                src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=85"
                                alt="HIMORA Horizon eyewear"
                            />
                        </div>

                        <div className="featured-product-info">
                            <div>
                                <span>HIMORA / E-01</span>
                                <h3>Horizon</h3>
                            </div>

                            <span>NPR 18,500</span>
                        </div>
                    </Link>

                    <Link
                        to="/products/himora-horizon"
                        className="featured-product-card"
                    >
                        <div className="featured-product-image">
                            <img
                                src="https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=85"
                                alt="HIMORA eyewear"
                            />
                        </div>

                        <div className="featured-product-info">
                            <div>
                                <span>HIMORA / E-02</span>
                                <h3>Altitude</h3>
                            </div>

                            <span>NPR 18,500</span>
                        </div>
                    </Link>

                </div>

            </div>
        </section>
    );
}

export default FeaturedProducts;