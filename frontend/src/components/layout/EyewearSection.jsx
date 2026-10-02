import "./EyewearSection.css";
import sunglass1 from "../../assets/Sunglasses/sunglass1.png";
import sunglass2 from "../../assets/Sunglasses/sunglass2.png";
function EyewearSection() {
    return (
        <section className="eyewear-section">
            <div className="container">

                <div className="eyewear-intro">
                    <div>
                        <p className="eyewear-eyebrow">
                            02 — Eyewear
                        </p>
                    </div>

                    <div className="eyewear-intro-copy">
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

                <div className="eyewear-grid">

                    <a
                        href="/eyewear"
                        className="eyewear-image eyewear-image-large"
                    >
                        <img
                            src={sunglass1}
                            alt="HIMORA eyewear collection"
                        />

                        <div className="eyewear-image-label">
                            <span>HIMORA / E-01</span>
                            <span>Explore →</span>
                        </div>
                    </a>

                    <a
                        href="/eyewear"
                        className="eyewear-image eyewear-image-small"
                    >
                        <img
                            src={sunglass2}
                            alt="HIMORA sunglasses"
                        />

                        <div className="eyewear-image-label">
                            <span>HIMORA / E-02</span>
                            <span>View →</span>
                        </div>
                    </a>

                </div>

            </div>
        </section>
    );
}

export default EyewearSection;