import "./EyewearSection.css";

function EyewearSection() {
    return (
        <section className="eyewear-section">
            <div className="container">
                <div className="eyewear-header">
                    <div>
                        <p className="eyewear-eyebrow">
                            02 — Eyewear
                        </p>
                    </div>

                    <div className="eyewear-heading">
                        <h2 className="display-text">
                            Designed to
                            <br />
                            be seen.
                        </h2>

                        <p>
                            Distinctive frames shaped by clean geometry,
                            considered proportions, and a quiet sense
                            of individuality.
                        </p>

                        <a
                            href="/eyewear"
                            className="editorial-link"
                        >
                            Explore eyewear
                            <span>→</span>
                        </a>
                    </div>
                </div>

                <div className="eyewear-feature">
                    <div className="eyewear-feature-image">
                        <img
                            src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1800&q=85"
                            alt="HIMORA eyewear"
                        />
                    </div>

                    <div className="eyewear-feature-info">
                        <p className="eyewear-product-number">
                            HIMORA / E-01
                        </p>

                        <h3>Altitude</h3>

                        <p className="eyewear-product-description">
                            A sculpted silhouette inspired by the
                            strength and clarity of high-altitude
                            landscapes.
                        </p>

                        <a href="/eyewear/altitude">
                            View product <span>→</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EyewearSection;