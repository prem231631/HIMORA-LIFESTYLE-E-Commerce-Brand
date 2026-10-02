import { Search, UserRound, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import "./Navbar.css";

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <header className="site-header">
            <nav className="navbar container">
                {/* Mobile Menu Button */}
                <button
                    className="navbar-mobile-toggle"
                    type="button"
                    aria-label="Open menu"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu size={20} strokeWidth={1.5} />
                </button>

                {/* Brand */}
                <a href="/" className="navbar-brand" aria-label="HIMORA Lifestyle home">
                    HIMORA
                </a>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    <a href="/">New</a>
                    <a href="/collections">Collections</a>
                    <a href="/eyewear">Eyewear</a>
                    <a href="/apparel">Apparel</a>
                    <a href="/accessories">Accessories</a>
                </div>

                {/* Actions */}
                <div className="navbar-actions">
                    <button type="button" aria-label="Search">
                        <Search size={19} strokeWidth={1.5} />
                    </button>

                    <button type="button" aria-label="Account">
                        <UserRound size={19} strokeWidth={1.5} />
                    </button>

                    <button
                        type="button"
                        className="navbar-bag"
                        aria-label="Shopping bag"
                    >
                        <ShoppingBag size={19} strokeWidth={1.5} />
                        <span>0</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation */}
            <div
                className={`mobile-menu ${
                    mobileMenuOpen ? "mobile-menu-open" : ""
                }`}
            >
                <div className="mobile-menu-header">
                    <span className="mobile-menu-title">MENU</span>

                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={closeMobileMenu}
                    >
                        <X size={21} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="mobile-menu-links">
                    <a href="/" onClick={closeMobileMenu}>
                        New
                    </a>

                    <a href="/collections" onClick={closeMobileMenu}>
                        Collections
                    </a>

                    <a href="/eyewear" onClick={closeMobileMenu}>
                        Eyewear
                    </a>

                    <a href="/apparel" onClick={closeMobileMenu}>
                        Apparel
                    </a>

                    <a href="/accessories" onClick={closeMobileMenu}>
                        Accessories
                    </a>
                </div>

                <div className="mobile-menu-footer">
                    <a href="/account">Account</a>
                    <a href="/search">Search</a>
                </div>
            </div>
        </header>
    );
}

export default Navbar;