import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
import FeaturedProducts from "./components/layout/FeaturedProducts";
import Collections from "./pages/public/Collections";


import ProductDetails from "./pages/public/ProductDetails";

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
                
                {/* COLLECTIONS */}
                <Route path="/collections" element={
                    <>
                        <Navbar />
                        <Collections />
                    </>
                } />

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

                {/* AUTH */}
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