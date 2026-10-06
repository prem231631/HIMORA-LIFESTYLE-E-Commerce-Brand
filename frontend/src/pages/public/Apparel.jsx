import { Link } from "react-router-dom";

import "./Apparel.css";

function Apparel() {
    return (
        <main className="apparel-page">

            {/* HERO */}
            <section className="apparel-page-hero">

                <div className="apparel-page-hero-content">

                    <p className="apparel-page-eyebrow">
                        HIMORA / APPAREL
                    </p>

                    <h1>
                        Made for
                        <br />
                        movement.
                    </h1>

                    <p>
                        Modern silhouettes shaped around comfort,
                        simplicity, and the rhythm of everyday life.
                    </p>

                </div>

            </section>


            {/* INTRO */}
            <section className="apparel-page-intro">

                <div className="apparel-page-intro-label">
                    <span>01</span>
                    <span>THE APPAREL COLLECTION</span>
                </div>

                <div className="apparel-page-intro-copy">

                    <h2>
                        Quiet form.
                        <br />
                        Everyday function.
                    </h2>

                    <p>
                        HIMORA apparel brings a refined approach to
                        everyday dressing. Clean proportions, subtle
                        details, and versatile silhouettes create
                        pieces designed to move between places,
                        seasons, and moments.
                    </p>

                </div>

            </section>


            {/* COLLECTION */}
            <section className="apparel-products">

                <div className="apparel-products-header">

                    <div>
                        <p>
                            COLLECTION 02
                        </p>

                        <h2>
                            Apparel
                        </h2>
                    </div>

                    <span>
                        Coming soon
                    </span>

                </div>


                <div className="apparel-editorial">

                    <div className="apparel-editorial-block">

                        <span>
                            01
                        </span>

                        <h3>
                            Essential
                            <br />
                            layers.
                        </h3>

                        <p>
                            Considered everyday pieces built around
                            understated form and lasting versatility.
                        </p>

                    </div>


                    <div className="apparel-editorial-block apparel-editorial-dark">

                        <span>
                            02
                        </span>

                        <h3>
                            Modern
                            <br />
                            silhouettes.
                        </h3>

                        <p>
                            Designed to feel effortless from the city
                            to the mountains.
                        </p>

                    </div>

                </div>

            </section>


            {/* COMING SOON */}
            <section className="apparel-coming-soon">

                <p className="apparel-coming-eyebrow">
                    HIMORA APPAREL
                </p>

                <h2>
                    The first apparel collection
                    <br />
                    is coming soon.
                </h2>

                <p>
                    Stay close. New pieces are being considered,
                    refined, and prepared for the world.
                </p>

                <Link to="/collections">
                    Explore the collection
                </Link>

            </section>

        </main>
    );
}

export default Apparel;