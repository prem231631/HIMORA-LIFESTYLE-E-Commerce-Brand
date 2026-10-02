import "./NewCollection.css";

function NewCollection() {
    return (
        <section className="new-collection">
            <div className="container">

                <div className="collection-intro">
                    <div>
                        <p className="eyebrow">01 — New Collection</p>
                    </div>

                    <div className="collection-intro-copy">
                        <h2 className="display-text">
                            Quiet forms.
                            <br />
                            Strong character.
                        </h2>

                        <p>
                            A considered collection shaped by Himalayan
                            landscapes, natural textures, and contemporary
                            silhouettes.
                        </p>

                        <a
                            href="/collections"
                            className="editorial-link"
                        >
                            Discover the collection
                            <span>→</span>
                        </a>
                    </div>
                </div>

                <div className="collection-grid">

                    <a
                        href="/collections/new"
                        className="collection-image collection-image-large"
                    >
                        <img
                            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=85"
                            alt="HIMORA new collection"
                        />

                        <div className="collection-image-label">
                            <span>HIMORA / 01</span>
                            <span>Explore →</span>
                        </div>
                    </a>

                    <a
                        href="/collections/essentials"
                        className="collection-image collection-image-small"
                    >
                        <img
                            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
                            alt="HIMORA essentials collection"
                        />

                        <div className="collection-image-label">
                            <span>ESSENTIALS</span>
                            <span>View →</span>
                        </div>
                    </a>

                </div>
            </div>
        </section>
    );
}

export default NewCollection;