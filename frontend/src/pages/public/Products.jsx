import { Link } from "react-router-dom";

import "./Products.css";

function Products() {
    return (
        <main className="products-page">

            <section className="products-page-header">
                <p className="products-page-eyebrow">
                    HIMORA / COLLECTION
                </p>

                <h1>
                    All
                    <br />
                    pieces.
                </h1>

                <p>
                    A considered selection of HIMORA pieces,
                    designed around modern living and inspired
                    by the Himalayas.
                </p>
            </section>

            <section className="products-page-grid">

                <Link
                    to="/products/himora-horizon"
                    className="products-page-card"
                >
                    <div className="products-page-image">
                        <img
                            src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=85"
                            alt="HIMORA Horizon"
                        />
                    </div>

                    <div className="products-page-info">
                        <div>
                            <span>HIMORA / E-01</span>
                            <h2>Horizon</h2>
                        </div>

                        <span>NPR 18,500</span>
                    </div>
                </Link>

                <Link
                    to="/products/himora-horizon"
                    className="products-page-card"
                >
                    <div className="products-page-image">
                        <img
                            src="https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1400&q=85"
                            alt="HIMORA Altitude"
                        />
                    </div>

                    <div className="products-page-info">
                        <div>
                            <span>HIMORA / E-02</span>
                            <h2>Altitude</h2>
                        </div>

                        <span>NPR 18,500</span>
                    </div>
                </Link>

            </section>

            <section className="products-page-footer">
                <p>
                    More HIMORA pieces are being prepared.
                </p>

                <Link to="/collections">
                    Explore the collections →
                </Link>
            </section>

        </main>
    );
}

export default Products;