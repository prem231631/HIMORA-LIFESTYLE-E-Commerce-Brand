import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
import EyewearSection from "./components/layout/EyewearSection";
function App() {
    return (
        <>
            <Navbar />

            <main>
              <Hero/>
              <NewCollection />
              <EyewearSection />
            </main>
            
        </>
    );
}

export default App;