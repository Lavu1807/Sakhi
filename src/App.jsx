import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Chatbot from "./pages/Chatbot";
import CycleTracker from "./pages/CycleTracker";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/Education";
import Login from "./pages/Login";
import Nutrition from "./pages/Nutrition";
import Signup from "./pages/Signup";
import Symptoms from "./pages/Symptoms";

function AppLayout() {
  const location = useLocation();
  const getNavClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  const pageTitles = {
    "/": "Login",
    "/signup": "Signup",
    "/dashboard": "Dashboard",
    "/cycle": "Cycle Tracker",
    "/nutrition": "Nutrition",
    "/symptoms": "Symptoms Checker",
    "/education": "Myths vs Facts",
    "/chatbot": "Chatbot",
  };

  const currentPageTitle = pageTitles[location.pathname] || "SAKHI";

  return (
    <div className="app-layout">
      <header className="top-nav-wrap">
        <nav className="top-nav page-shell" aria-label="Main navigation">
          <div className="nav-left">
            <p className="nav-brand">SAKHI</p>
            <span className="page-chip" aria-live="polite">
              {currentPageTitle}
            </span>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={getNavClass}>
              Login
            </NavLink>
            <NavLink to="/signup" className={getNavClass}>
              Signup
            </NavLink>
            <NavLink to="/dashboard" className={getNavClass}>
              Dashboard
            </NavLink>
            <NavLink to="/cycle" className={getNavClass}>
              Cycle Tracker
            </NavLink>
            <NavLink to="/nutrition" className={getNavClass}>
              Nutrition
            </NavLink>
            <NavLink to="/symptoms" className={getNavClass}>
              Symptoms
            </NavLink>
            <NavLink to="/education" className={getNavClass}>
              Education
            </NavLink>
            <NavLink to="/chatbot" className={getNavClass}>
              Chatbot
            </NavLink>
          </div>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Shared layout keeps navigation and page frame consistent across routes. */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cycle" element={<CycleTracker />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/symptoms" element={<Symptoms />} />
          <Route path="/education" element={<Education />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
