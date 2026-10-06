import { Link } from "react-router-dom";

import "./Eyewear.css";

import sunglass1 from "../../assets/Sunglasses/sunglass1.png";
import sunglass2 from "../../assets/Sunglasses/sunglass2.png";

function Eyewear() {
    return (
        <main className="eyewear-page">

            {/* HERO */}
            <section className="eyewear-page-hero">

                <div className="eyewear-page-hero-content">

                    <p className="eyewear-page-eyebrow">
                        HIMORA / EYEWEAR
                    </p>

                    <h1>
                        Designed to
                        <br />
                        be seen.
                    </h1>

                    <p>
                        Distinctive frames shaped by clean geometry,
                        considered proportions, and a quiet sense
                        of individuality.
                    </p>

                </div>

            </section>


            {/* INTRO */}
            <section className="eyewear-page-intro">

                <div className="eyewear-page-intro-label">
                    <span>01</span>
                    <span>THE EYEWEAR COLLECTION</span>
                </div>

                <div className="eyewear-page-intro-copy">

                    <h2>
                        Form follows
                        <br />
                        character.
                    </h2>

                    <p>
                        HIMORA eyewear balances architectural form
                        with everyday wearability. Each silhouette
                        is designed to become part of how you move
                        through the world.
                    </p>

                </div>

            </section>


            {/* PRODUCTS */}
            <section className="eyewear-products">

                <div className="eyewear-products-header">

                    <div>
                        <p>
                            COLLECTION 01
                        </p>

                        <h2>
                            Eyewear
                        </h2>
                    </div>

                    <span>
                        2 pieces
                    </span>

                </div>


                <div className="eyewear-product-grid">

                    {/* PRODUCT 01 */}
                    <article className="eyewear-product-card">

                        <Link
                            to="/products/himora-horizon"
                            className="eyewear-product-image"
                        >
                            <img
                                src={sunglass1}
                                alt="HIMORA Horizon eyewear"
                            />

                            <span>
                                View piece →
                            </span>
                        </Link>

                        <div className="eyewear-product-info">

                            <div>
                                <p>
                                    HIMORA / E-01
                                </p>

                                <h3>
                                    Horizon
                                </h3>
                            </div>

                            <strong>
                                NPR 18,500
                            </strong>

                        </div>

                    </article>


                    {/* PRODUCT 02 */}
                    <article className="eyewear-product-card">

                        <Link
                            to="/products/himora-horizon"
                            className="eyewear-product-image"
                        >
                            <img
                                src={sunglass2}
                                alt="HIMORA eyewear"
                            />

                            <span>
                                View piece →
                            </span>
                        </Link>

                        <div className="eyewear-product-info">

                            <div>
                                <p>
                                    HIMORA / E-02
                                </p>

                                <h3>
                                    Altitude
                                </h3>
                            </div>

                            <strong>
                                NPR 18,500
                            </strong>

                        </div>

                    </article>

                </div>

            </section>


            {/* STATEMENT */}
            <section className="eyewear-page-statement">

                <p>
                    Designed for the horizon.
                </p>

                <Link to="/">
                    Return Home
                </Link>

            </section>

        </main>
    );
}

export default Eyewear;