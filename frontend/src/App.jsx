import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import NewCollection from "./components/layout/NewCollection";
function App() {
    return (
        <>
            <Navbar />

            <main>
              <Hero/>
              <NewCollection />
            </main>
            
        </>
    );
}

export default App;