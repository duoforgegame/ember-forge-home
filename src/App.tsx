import { Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { LoadingScreen } from "./components/LoadingScreen";

const Imprint = lazy(() => import("./pages/Imprint"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Admin = lazy(() => import("./pages/Admin"));
const PressKit = lazy(() => import("./pages/PressKit"));
const GamePage = lazy(() => import("./pages/GamePage"));

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
      {!isAdmin && <AnnouncementBanner />}
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/imprint" element={<Imprint />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/press/:slug" element={<PressKit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
