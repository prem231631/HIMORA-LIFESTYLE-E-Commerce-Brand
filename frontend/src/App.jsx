import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
import FeaturedProducts from "./components/layout/FeaturedProducts";
function App() {
    return (
        <>
            <Navbar />

            <main>
              <Hero/>
              <NewCollection />
              <EyewearSection />
              <FeaturedProducts />
            </main>
            
        </>
    );
}

export default App;