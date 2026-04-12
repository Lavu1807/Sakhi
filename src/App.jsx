import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AnimatedBackdrop from "./components/AnimatedBackdrop";
import Chatbot from "./pages/Chatbot";
import CycleTracker from "./pages/CycleTracker";
import Dashboard from "./pages/Dashboard";
import Education from "./pages/Education";
import Login from "./pages/Login";
import MoodTracker from "./pages/MoodTracker";
import Nutrition from "./pages/Nutrition";
import Signup from "./pages/Signup";
import Symptoms from "./pages/Symptoms";
import { getAuthToken } from "./utils/auth";

const AUTH_NAV_ITEMS = [
  { to: "/", label: "Login", end: true },
  { to: "/signup", label: "Signup" },
];

const ESSENTIAL_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cycle", label: "Cycle" },
  { to: "/nutrition", label: "Nutrition" },
  { to: "/chatbot", label: "Chatbot" },
];

const MORE_NAV_ITEMS = [
  { to: "/symptoms", label: "Symptoms" },
  { to: "/mood", label: "Mood" },
  { to: "/education", label: "Education" },
];

function AppLayout() {
  const location = useLocation();
  const navRef = useRef(null);
  const moreMenuRef = useRef(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isLoginRoute = location.pathname === "/";
  const isDashboardRoute = location.pathname === "/dashboard";
  const showBackdrop = !isLoginRoute && !isDashboardRoute;
  const isAuthRoute = location.pathname === "/" || location.pathname === "/signup";
  const navItems = isAuthRoute ? AUTH_NAV_ITEMS : ESSENTIAL_NAV_ITEMS;
  const getNavClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (!moreMenuRef.current || moreMenuRef.current.contains(event.target)) {
        return;
      }

      setIsMoreOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMoreOpen]);

  useEffect(() => {
    if (!navRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: -10, opacity: 0, scale: 0.99 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" },
      );
    }, navRef.current);

    return () => ctx.revert();
  }, [isLoginRoute]);

  return (
    <div className={`app-layout ${isLoginRoute ? "login-view" : ""}`}>
      {showBackdrop && <AnimatedBackdrop />}

      <div className="app-content">
        {!isLoginRoute && (
          <motion.header
            className="top-nav-wrap"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav ref={navRef} className="top-nav page-shell" aria-label="Main navigation">
              <div className="nav-left">
                <p className="nav-brand">SAKHI</p>
              </div>

              <div className="nav-links">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={getNavClass}>
                    {item.label}
                  </NavLink>
                ))}

                {!isAuthRoute && (
                  <div className={`nav-dropdown ${isMoreOpen ? "open" : ""}`} ref={moreMenuRef}>
                    <button
                      type="button"
                      className="nav-dropdown-toggle"
                      onClick={() => setIsMoreOpen((prev) => !prev)}
                      aria-haspopup="menu"
                      aria-expanded={isMoreOpen}
                    >
                      More
                    </button>

                    {isMoreOpen && (
                      <div className="nav-dropdown-menu" role="menu" aria-label="More pages">
                        {MORE_NAV_ITEMS.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={getNavClass}
                            role="menuitem"
                            onClick={() => setIsMoreOpen(false)}
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </motion.header>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className={`route-stage ${isLoginRoute ? "login-route-stage" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function RedirectIfAuthenticated({ children }) {
  const token = getAuthToken();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Shared layout keeps navigation and page frame consistent across routes. */}
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthenticated>
                <Signup />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/cycle"
            element={
              <RequireAuth>
                <CycleTracker />
              </RequireAuth>
            }
          />
          <Route
            path="/nutrition"
            element={
              <RequireAuth>
                <Nutrition />
              </RequireAuth>
            }
          />
          <Route
            path="/symptoms"
            element={
              <RequireAuth>
                <Symptoms />
              </RequireAuth>
            }
          />
          <Route
            path="/education"
            element={
              <RequireAuth>
                <Education />
              </RequireAuth>
            }
          />
          <Route
            path="/mood"
            element={
              <RequireAuth>
                <MoodTracker />
              </RequireAuth>
            }
          />
          <Route
            path="/chatbot"
            element={
              <RequireAuth>
                <Chatbot />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
