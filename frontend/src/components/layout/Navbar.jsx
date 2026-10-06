import {
    Search,
    UserRound,
    ShoppingBag,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Navbar.css";

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navigate = useNavigate();

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const handleAccountClick = () => {
        const token = localStorage.getItem("access_token");

        if (token) {
            const user = JSON.parse(
                localStorage.getItem("user") || "null"
            );

            if (user?.role === "admin") {
                navigate("/admin/orders");
            } else {
                navigate("/account");
            }
        } else {
            navigate("/login");
        }
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
                <Link
                    to="/"
                    className="navbar-brand"
                    aria-label="HIMORA Lifestyle home"
                >
                    HIMORA
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    <Link to="/">New</Link>

                    <Link to="/collections">
                        Collections
                    </Link>

                    <Link to="/eyewear">
                        Eyewear
                    </Link>

                    <Link to="/apparel">
                        Apparel
                    </Link>

                    <Link to="/accessories">
                        Accessories
                    </Link>
                </div>

                {/* Actions */}
                <div className="navbar-actions">

                    {/* Search */}
                    <button
                        type="button"
                        aria-label="Search"
                        onClick={() => navigate("/search")}
                    >
                        <Search
                            size={19}
                            strokeWidth={1.5}
                        />
                    </button>

                    {/* Account */}
                    <button
                        type="button"
                        aria-label="Account"
                        onClick={handleAccountClick}
                    >
                        <UserRound
                            size={19}
                            strokeWidth={1.5}
                        />
                    </button>

                    {/* Shopping Bag */}
                    <button
                        type="button"
                        className="navbar-bag"
                        aria-label="Shopping bag"
                        onClick={() => navigate("/cart")}
                    >
                        <ShoppingBag
                            size={19}
                            strokeWidth={1.5}
                        />

                        <span>0</span>
                    </button>

                </div>
            </nav>

            {/* Mobile Navigation */}
            <div
                className={`mobile-menu ${
                    mobileMenuOpen
                        ? "mobile-menu-open"
                        : ""
                }`}
            >

                <div className="mobile-menu-header">

                    <span className="mobile-menu-title">
                        MENU
                    </span>

                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={closeMobileMenu}
                    >
                        <X
                            size={21}
                            strokeWidth={1.5}
                        />
                    </button>

                </div>

                <div className="mobile-menu-links">

                    <Link
                        to="/"
                        onClick={closeMobileMenu}
                    >
                        New
                    </Link>

                    <Link
                        to="/collections"
                        onClick={closeMobileMenu}
                    >
                        Collections
                    </Link>

                    <Link
                        to="/eyewear"
                        onClick={closeMobileMenu}
                    >
                        Eyewear
                    </Link>

                    <Link
                        to="/apparel"
                        onClick={closeMobileMenu}
                    >
                        Apparel
                    </Link>

                    <Link
                        to="/accessories"
                        onClick={closeMobileMenu}
                    >
                        Accessories
                    </Link>

                </div>

                <div className="mobile-menu-footer">

                    <button
                        type="button"
                        onClick={() => {
                            closeMobileMenu();
                            handleAccountClick();
                        }}
                    >
                        Account
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            closeMobileMenu();
                            navigate("/search");
                        }}
                    >
                        Search
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            closeMobileMenu();
                            navigate("/cart");
                        }}
                    >
                        Shopping Bag
                    </button>

                </div>

            </div>
        </header>
    );
}

export default Navbar;