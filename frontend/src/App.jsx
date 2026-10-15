
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
import FeaturedProducts from "./components/layout/FeaturedProducts";

import ProtectedRoute from "./pages/auth/ProtectedRoute";

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
import OrderDetails from "./pages/public/OrderDetails";
import Account from "./pages/public/Account";

import EsewaSuccess from "./pages/public/EsewaSuccess";
import EsewaFailure from "./pages/public/EsewaFailure";

import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminUsers from "./pages/admin/AdminUsers";

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

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC STOREFRONT */}
        <Route path="/" element={<HomePage />} />

        <Route
          path="/search"
          element={
            <PublicLayout>
              <Search />
            </PublicLayout>
          }
        />

        <Route
          path="/collections"
          element={
            <PublicLayout>
              <Collections />
            </PublicLayout>
          }
        />

        <Route
          path="/eyewear"
          element={
            <PublicLayout>
              <Eyewear />
            </PublicLayout>
          }
        />

        <Route
          path="/apparel"
          element={
            <PublicLayout>
              <Apparel />
            </PublicLayout>
          }
        />

        <Route
          path="/accessories"
          element={
            <PublicLayout>
              <Accessories />
            </PublicLayout>
          }
        />

        <Route
          path="/products"
          element={
            <PublicLayout>
              <Products />
            </PublicLayout>
          }
        />

        <Route
          path="/products/:productId"
          element={
            <PublicLayout>
              <ProductDetails />
            </PublicLayout>
          }
        />

        {/* ESewa PAYMENT CALLBACKS */}
        <Route
          path="/payment/esewa/success"
          element={<EsewaSuccess />}
        />

        <Route
          path="/payment/esewa/failure"
          element={<EsewaFailure />}
        />

        {/* AUTHENTICATION */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* CUSTOMER ROUTES — LOGIN REQUIRED */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/cart"
            element={
              <PublicLayout>
                <Cart />
              </PublicLayout>
            }
          />

          <Route
            path="/checkout"
            element={
              <PublicLayout>
                <Checkout />
              </PublicLayout>
            }
          />

          <Route
            path="/account"
            element={
              <PublicLayout>
                <Account />
              </PublicLayout>
            }
          />

          <Route
            path="/account/addresses"
            element={
              <PublicLayout>
                <Addresses />
              </PublicLayout>
            }
          />

          <Route
            path="/account/orders"
            element={
              <PublicLayout>
                <Orders />
              </PublicLayout>
            }
          />

          <Route
            path="/account/orders/:orderId"
            element={
              <PublicLayout>
                <OrderDetails />
              </PublicLayout>
            }
          />
        </Route>

        {/* ADMIN ROUTES — ADMIN ROLE REQUIRED */}
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/orders"
            element={<AdminOrders />}
          />

          <Route
            path="/admin/orders/:orderId"
            element={<AdminOrderDetail />}
          />

          <Route
            path="/admin/products"
            element={<AdminProducts />}
          />

          <Route
            path="/admin/categories"
            element={<AdminCategories />}
          />

          <Route
            path="/admin/inventory"
            element={<AdminInventory />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsers />}
          />
        </Route>

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <PublicLayout>
              <main className="himora-not-found">
                <h1>Page not found</h1>
                <p>
                  The page you're looking for doesn't exist.
                </p>
              </main>
            </PublicLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
