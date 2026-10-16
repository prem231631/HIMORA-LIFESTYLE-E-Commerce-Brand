import {
    Search,
    UserRound,
    ShoppingBag,
    Menu,
    X,
    LogOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./Navbar.css";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [bagCount, setBagCount] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const refreshAuthState = useCallback(() => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setCurrentUser(null);
            setBagCount(0);
            return;
        }

        try {
            const user = JSON.parse(
                localStorage.getItem("user") || "null"
            );

            setCurrentUser(user);
        } catch {
            setCurrentUser(null);
        }
    }, []);

    const handleAccountClick = () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            navigate("/login");
            return;
        }

        let user = null;

        try {
            user = JSON.parse(
                localStorage.getItem("user") || "null"
            );
        } catch {
            user = null;
        }

        if (user?.role === "admin" || user?.is_admin === true) {
            navigate("/admin/dashboard");
        } else {
            navigate("/account");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("userName");
        localStorage.removeItem("isAdmin");

        setCurrentUser(null);
        setBagCount(0);
        closeMobileMenu();

        window.dispatchEvent(new Event("himora-auth-updated"));
        window.dispatchEvent(new Event("himora-cart-updated"));

        navigate("/", { replace: true });
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

            const count = Array.isArray(cart.items)
                ? cart.items.reduce(
                    (total, item) =>
                        total + Number(item.quantity || 0),
                    0
                )
                : 0;

            setBagCount(count);
        } catch (error) {
            console.error(
                "Unable to fetch shopping bag count:",
                error
            );
        }
    }, []);

    useEffect(() => {
        refreshAuthState();
        fetchBagCount();
    }, [
        location.pathname,
        refreshAuthState,
        fetchBagCount,
    ]);

    useEffect(() => {
        const handleAuthUpdated = () => {
            refreshAuthState();
            fetchBagCount();
        };

        const handleCartUpdated = () => {
            fetchBagCount();
        };

        const handleStorageChange = (event) => {
            if (
                event.key === "access_token" ||
                event.key === "user"
            ) {
                refreshAuthState();
                fetchBagCount();
            }
        };

        window.addEventListener(
            "himora-auth-updated",
            handleAuthUpdated
        );

        window.addEventListener(
            "himora-cart-updated",
            handleCartUpdated
        );

        window.addEventListener(
            "storage",
            handleStorageChange
        );

        return () => {
            window.removeEventListener(
                "himora-auth-updated",
                handleAuthUpdated
            );

            window.removeEventListener(
                "himora-cart-updated",
                handleCartUpdated
            );

            window.removeEventListener(
                "storage",
                handleStorageChange
            );
        };
    }, [refreshAuthState, fetchBagCount]);

    const isAdmin =
        currentUser?.role === "admin" ||
        currentUser?.is_admin === true;

    const displayName =
        currentUser?.full_name ||
        currentUser?.name ||
        localStorage.getItem("userName") ||
        "My Account";

    return (
        <header className="site-header">
            <nav className="navbar container">
                <button
                    className="navbar-mobile-toggle"
                    type="button"
                    aria-label="Open menu"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu size={20} strokeWidth={1.5} />
                </button>

                <Link
                    to="/"
                    className="navbar-brand"
                    aria-label="HIMORA Lifestyle home"
                >
                    HIMORA
                </Link>

                <div className="navbar-links">
                    <Link to="/">New</Link>
                    <Link to="/collections">Collections</Link>
                    <Link to="/eyewear">Eyewear</Link>
                    <Link to="/apparel">Apparel</Link>
                    <Link to="/accessories">Accessories</Link>
                </div>

                <div className="navbar-actions">
                    <button
                        type="button"
                        aria-label="Search"
                        onClick={() => navigate("/search")}
                    >
                        <Search size={19} strokeWidth={1.5} />
                    </button>

                    {currentUser ? (
                        <div className="navbar-account">
                            <button
                                type="button"
                                className="navbar-account-button"
                                aria-label={`Account: ${displayName}`}
                                title={displayName}
                                onClick={handleAccountClick}
                            >
                                <UserRound
                                    size={19}
                                    strokeWidth={1.5}
                                />
                                <span className="navbar-account-name">
                                    {displayName}
                                </span>
                            </button>

                            <button
                                type="button"
                                className="navbar-logout-button"
                                onClick={handleLogout}
                                aria-label="Log out"
                                title="Log out"
                            >
                                <LogOut
                                    size={17}
                                    strokeWidth={1.5}
                                />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            aria-label="Login or create account"
                            title="Login / Register"
                            onClick={() => navigate("/login")}
                        >
                            <UserRound
                                size={19}
                                strokeWidth={1.5}
                            />
                        </button>
                    )}

                    <button
                        type="button"
                        className="navbar-bag"
                        aria-label={`Shopping bag, ${bagCount} items`}
                        onClick={() => {
                            if (
                                localStorage.getItem("access_token")
                            ) {
                                navigate("/cart");
                            } else {
                                navigate("/login", {
                                    state: { from: "/cart" },
                                });
                            }
                        }}
                    >
                        <ShoppingBag
                            size={19}
                            strokeWidth={1.5}
                        />
                        <span>{bagCount}</span>
                    </button>
                </div>
            </nav>

            <div
                className={`mobile-menu ${
                    mobileMenuOpen ? "mobile-menu-open" : ""
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
                        <X size={21} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="mobile-menu-links">
                    <Link to="/" onClick={closeMobileMenu}>
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
                    {currentUser && (
                        <p className="mobile-account-greeting">
                            Signed in as {displayName}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            closeMobileMenu();
                            handleAccountClick();
                        }}
                    >
                        {currentUser
                            ? isAdmin
                                ? "Admin Dashboard"
                                : "My Account"
                            : "Login / Register"}
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

                            if (
                                localStorage.getItem("access_token")
                            ) {
                                navigate("/cart");
                            } else {
                                navigate("/login", {
                                    state: { from: "/cart" },
                                });
                            }
                        }}
                    >
                        Shopping Bag ({bagCount})
                    </button>

                    {currentUser && (
                        <button
                            type="button"
                            onClick={handleLogout}
                        >
                            Log Out
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;