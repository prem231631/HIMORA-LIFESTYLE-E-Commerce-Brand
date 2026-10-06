import { Link } from "react-router-dom";

import "./Accessories.css";

function Accessories() {
    return (
        <main className="accessories-page">

            {/* HERO */}
            <section className="accessories-page-hero">
                <div className="accessories-page-hero-content">
                    <p className="accessories-page-eyebrow">
                        HIMORA / ACCESSORIES
                    </p>

                    <h1>
                        Details
                        <br />
                        matter.
                    </h1>

                    <p>
                        Refined objects designed to complete
                        the HIMORA way of living.
                    </p>
                </div>
            </section>

            {/* INTRO */}
            <section className="accessories-page-intro">
                <div className="accessories-page-intro-label">
                    <span>01</span>
                    <span>THE ACCESSORIES COLLECTION</span>
                </div>

                <div className="accessories-page-intro-copy">
                    <h2>
                        Essential objects.
                        <br />
                        Considered details.
                    </h2>

                    <p>
                        From everyday essentials to distinctive
                        finishing pieces, HIMORA accessories are
                        designed around simplicity, utility, and
                        understated character.
                    </p>
                </div>
            </section>

            {/* COLLECTION */}
            <section className="accessories-products">

                <div className="accessories-products-header">
                    <div>
                        <p>COLLECTION 03</p>
                        <h2>Accessories</h2>
                    </div>

                    <span>Coming soon</span>
                </div>

                <div className="accessories-editorial">

                    <div className="accessories-editorial-block">
                        <span>01</span>

                        <h3>
                            Everyday
                            <br />
                            essentials.
                        </h3>

                        <p>
                            Functional objects shaped with
                            clean lines and a quiet sense of
                            refinement.
                        </p>
                    </div>

                    <div className="accessories-editorial-block accessories-editorial-dark">
                        <span>02</span>

                        <h3>
                            Distinctive
                            <br />
                            details.
                        </h3>

                        <p>
                            Small pieces designed to bring
                            character to the everyday.
                        </p>
                    </div>

                </div>
            </section>

            {/* COMING SOON */}
            <section className="accessories-coming-soon">

                <p className="accessories-coming-eyebrow">
                    HIMORA ACCESSORIES
                </p>

                <h2>
                    The accessories collection
                    <br />
                    is coming soon.
                </h2>

                <p>
                    New pieces are being considered,
                    refined, and prepared for the world.
                </p>

                <Link to="/collections">
                    Explore the collection
                </Link>

            </section>

        </main>
    );
}

export default Accessories;