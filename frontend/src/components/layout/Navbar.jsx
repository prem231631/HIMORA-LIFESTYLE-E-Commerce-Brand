
import {
    Search,
    UserRound,
    ShoppingBag,
    Menu,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./Navbar.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [bagCount, setBagCount] = useState(0);

    const navigate = useNavigate();
    const location = useLocation();

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const handleAccountClick = () => {
        const token = localStorage.getItem("access_token");

        if (token) {
            let user = null;

            try {
                user = JSON.parse(
                    localStorage.getItem("user") || "null"
                );
            } catch {
                user = null;
            }

            if (user?.role === "admin") {
                navigate("/admin/orders");
            } else {
                navigate("/account");
            }
        } else {
            navigate("/login");
        }
    };

    const fetchBagCount = useCallback(async () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setBagCount(0);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/cart`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    setBagCount(0);
                }
                return;
            }

            const cart = await response.json();

            // Count total units, not just distinct product rows.
            const count = Array.isArray(cart.items)
                ? cart.items.reduce(
                    (total, item) =>
                        total + Number(item.quantity || 0),
                    0
                )
                : 0;

            setBagCount(count);
        } catch (error) {
            console.error("Unable to fetch shopping bag count:", error);
        }
    }, []);

    // Refresh when navigating between pages.
    useEffect(() => {
        fetchBagCount();
    }, [fetchBagCount, location.pathname]);

    // Refresh when the cart changes in another component or tab.
    useEffect(() => {
        const handleCartUpdated = () => {
            fetchBagCount();
        };

        const handleStorageChange = (event) => {
            if (
                event.key === "access_token" ||
                event.key === "user"
            ) {
                fetchBagCount();
            }
        };

        window.addEventListener(
            "himora-cart-updated",
            handleCartUpdated
        );

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener(
                "himora-cart-updated",
                handleCartUpdated
            );

            window.removeEventListener(
                "storage",
                handleStorageChange
            );
        };
    }, [fetchBagCount]);

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
                    <Link to="/collections">Collections</Link>
                    <Link to="/eyewear">Eyewear</Link>
                    <Link to="/apparel">Apparel</Link>
                    <Link to="/accessories">Accessories</Link>
                </div>

                {/* Actions */}
                <div className="navbar-actions">
                    <button
                        type="button"
                        aria-label="Search"
                        onClick={() => navigate("/search")}
                    >
                        <Search size={19} strokeWidth={1.5} />
                    </button>

                    <button
                        type="button"
                        aria-label="Account"
                        onClick={handleAccountClick}
                    >
                        <UserRound size={19} strokeWidth={1.5} />
                    </button>

                    <button
                        type="button"
                        className="navbar-bag"
                        aria-label={`Shopping bag, ${bagCount} items`}
                        onClick={() => navigate("/cart")}
                    >
                        <ShoppingBag
                            size={19}
                            strokeWidth={1.5}
                        />
                        <span>{bagCount}</span>
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
                    <Link to="/" onClick={closeMobileMenu}>
                        New
                    </Link>
                    <Link to="/collections" onClick={closeMobileMenu}>
                        Collections
                    </Link>
                    <Link to="/eyewear" onClick={closeMobileMenu}>
                        Eyewear
                    </Link>
                    <Link to="/apparel" onClick={closeMobileMenu}>
                        Apparel
                    </Link>
                    <Link to="/accessories" onClick={closeMobileMenu}>
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
                        Shopping Bag ({bagCount})
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Navbar;