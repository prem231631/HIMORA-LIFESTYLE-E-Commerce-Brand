import { Link } from "react-router-dom";

import "./Hero.css";

function Hero() {
    return (
        <section className="hero">

            <div className="hero-image">
                <img
                    src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=85"
                    alt="Himalayan mountain landscape"
                />
            </div>

            <div className="hero-overlay" />

            <div className="hero-content container">

                <p className="hero-eyebrow">
                    HIMORA LIFESTYLE — 2026
                </p>

                <h1 className="hero-title">
                    Inspired by
                    <br />
                    the Himalayas.
                </h1>

                <p className="hero-description">
                    Designed for the modern world.
                </p>

                <Link
                    to="/collections"
                    className="hero-link"
                >
                    <span>Explore the collection</span>

                    <span className="hero-link-arrow">
                        →
                    </span>
                </Link>

            </div>

            <div className="hero-scroll">

                <span>
                    Scroll to discover
                </span>

                <span className="hero-scroll-line" />

            </div>

        </section>
    );
}

export default Hero;