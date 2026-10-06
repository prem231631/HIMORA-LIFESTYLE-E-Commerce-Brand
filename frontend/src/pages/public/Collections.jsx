import { Link } from "react-router-dom";

import "./Collections.css";

function Collections() {
    return (
        <main className="collections-page">

            {/* HERO */}
            <section className="collections-hero">

                <div className="collections-hero-content">

                    <p className="collections-eyebrow">
                        HIMORA LIFESTYLE
                    </p>

                    <h1>
                        The Collection
                    </h1>

                    <p className="collections-hero-description">
                        A considered collection of contemporary pieces
                        inspired by the landscapes, textures, and spirit
                        of the Himalayas.
                    </p>

                </div>

            </section>


            {/* COLLECTION INTRO */}
            <section className="collections-intro">

                <div className="collections-intro-label">
                    <span>01</span>
                    <span>THE WORLD OF HIMORA</span>
                </div>

                <div className="collections-intro-content">

                    <h2>
                        Designed with intention.
                    </h2>

                    <p>
                        Discover HIMORA's evolving collection of
                        eyewear, apparel, accessories, and everyday
                        objects. Each piece is designed to exist
                        beyond seasons and trends.
                    </p>

                </div>

            </section>


            {/* COLLECTION CATEGORIES */}
            <section className="collections-grid">

                <Link
                    to="/eyewear"
                    className="collection-category collection-eyewear"
                >
                    <div className="collection-category-content">

                        <span>
                            01
                        </span>

                        <h2>
                            Eyewear
                        </h2>

                        <p>
                            Refined frames inspired by Himalayan
                            landscapes.
                        </p>

                        <strong>
                            Explore Eyewear →
                        </strong>

                    </div>
                </Link>


                <Link
                    to="/apparel"
                    className="collection-category collection-apparel"
                >
                    <div className="collection-category-content">

                        <span>
                            02
                        </span>

                        <h2>
                            Apparel
                        </h2>

                        <p>
                            Modern silhouettes built for everyday
                            movement.
                        </p>

                        <strong>
                            Explore Apparel →
                        </strong>

                    </div>
                </Link>


                <Link
                    to="/accessories"
                    className="collection-category collection-accessories"
                >
                    <div className="collection-category-content">

                        <span>
                            03
                        </span>

                        <h2>
                            Accessories
                        </h2>

                        <p>
                            Considered details for the modern
                            lifestyle.
                        </p>

                        <strong>
                            Explore Accessories →
                        </strong>

                    </div>
                </Link>

            </section>


            {/* EDITORIAL STATEMENT */}
            <section className="collections-statement">

                <p>
                    "Inspired by the Himalayas.
                    Designed for the modern world."
                </p>

                <Link to="/">
                    Return Home
                </Link>

            </section>

        </main>
    );
}

export default Collections;