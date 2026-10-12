import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
import FeaturedProducts from "./components/layout/FeaturedProducts";

import Search from "./pages/public/Search";
import Cart from "./pages/public/Cart";
import Checkout from "./pages/public/Checkout";
import Collections from "./pages/public/Collections";
import Eyewear from "./pages/public/Eyewear";
import Apparel from "./pages/public/Apparel";
import Accessories from "./pages/public/Accessories";
import Products from "./pages/public/Products";
import ProductDetails from "./pages/public/ProductDetails";
import Addresses from "./pages/public/Addresses";
import Orders from "./pages/public/Orders";

import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetail";

import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";

function HomePage() {
    return (
        <>
            <Navbar />

            <main>
                <Hero />
                <NewCollection />
                <EyewearSection />
                <FeaturedProducts />
            </main>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* HOME */}
                <Route
                    path="/"
                    element={<HomePage />}
                />

                {/* SEARCH */}
                <Route
                    path="/search"
                    element={
                        <>
                            <Navbar />
                            <Search />
                        </>
                    }
                />

                {/* CART */}
                <Route
                    path="/cart"
                    element={
                        <>
                            <Navbar />
                            <Cart />
                        </>
                    }
                />

                {/* CHECKOUT */}
                <Route
                    path="/checkout"
                    element={
                        <>
                            <Navbar />
                            <Checkout />
                        </>
                    }
                />

                {/* DELIVERY ADDRESSES */}
                <Route
                    path="account/addresses"
                    element={
                        <>
                            <Navbar />
                            <Addresses />
                        </>
                    }
                />

                {/* CUSTOMER ORDER HISTORY */}
                <Route
                    path="account/orders"
                    element={
                        <>
                            <Navbar />
                            <Orders />
                        </>
                    }
                />

                {/* COLLECTIONS */}
                <Route
                    path="/collections"
                    element={
                        <>
                            <Navbar />
                            <Collections />
                        </>
                    }
                />

                {/* EYEWEAR */}
                <Route
                    path="/eyewear"
                    element={
                        <>
                            <Navbar />
                            <Eyewear />
                        </>
                    }
                />

                {/* APPAREL */}
                <Route
                    path="/apparel"
                    element={
                        <>
                            <Navbar />
                            <Apparel />
                        </>
                    }
                />

                {/* ACCESSORIES */}
                <Route
                    path="/accessories"
                    element={
                        <>
                            <Navbar />
                            <Accessories />
                        </>
                    }
                />

                {/* PRODUCT DETAILS */}
                <Route
                    path="/products/:productId"
                    element={
                        <>
                            <Navbar />
                            <ProductDetails />
                        </>
                    }
                />

                {/* PRODUCTS */}
                <Route
                    path="/products"
                    element={
                        <>
                            <Navbar />
                            <Products />
                        </>
                    }
                />

                {/* AUTHENTICATION */}
                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* ADMIN */}
                <Route
                    path="/admin/orders"
                    element={<AdminOrders />}
                />

                <Route
                    path="/admin/orders/:orderId"
                    element={<AdminOrderDetails />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;