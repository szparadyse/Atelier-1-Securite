import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Liste from "./pages/Liste";

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Accueil</Link> | <Link to="/liste">Liste des offres</Link>
      </nav>

      <Routes>
        <Route path="/" element={<h1>Bienvenue sur la plateforme</h1>} />
        <Route path="/liste" element={<Liste />} />
      </Routes>
    </Router>
  );
}

export default App;
