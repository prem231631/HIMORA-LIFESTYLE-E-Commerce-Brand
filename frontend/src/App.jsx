import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
import FeaturedProducts from "./components/layout/FeaturedProducts";

import ProductDetails from "./pages/public/ProductDetails";
import AdminOrders from "./pages/admin/AdminOrders";
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

                <Route
                    path="/"
                    element={<HomePage />}
                />

                <Route
                    path="/products/:productId"
                    element={
                        <>
                            <Navbar />
                            <ProductDetails />
                        </>
                    }
                />

                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                
            </Routes>
        </BrowserRouter>
    );
}


export default App;