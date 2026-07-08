import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const Imprint = lazy(() => import("./pages/Imprint"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Admin = lazy(() => import("./pages/Admin"));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/imprint" element={<Imprint />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
