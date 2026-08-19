import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Devices from "./pages/Devices";
import ProductionProfiles from "./pages/ProductionProfiles";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import NewJob from "./pages/NewJob";
import Login from "./pages/Login";
import Users from "./pages/Users";
import FlowBuilder from "./pages/FlowBuilder";
import PublicKiosks from "./pages/PublicKiosks";
import PublicCapture from "./pages/PublicCapture";
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Unauthenticated kiosk screen — deliberately outside the Layout/auth
          wrapper below, reachable by anyone with the link. */}
      <Route path="/captura/:slug" element={<PublicCapture />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/organizaciones"
          element={
            <ProtectedRoute allow={["ADMIN", "OPERATOR"]}>
              <Organizations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispositivos"
          element={
            <ProtectedRoute allow={["ADMIN", "OPERATOR"]}>
              <Devices />
            </ProtectedRoute>
          }
        />
        <Route path="/perfiles" element={<ProductionProfiles />} />
        <Route
          path="/flujos"
          element={
            <ProtectedRoute allow={["ADMIN", "OPERATOR"]}>
              <FlowBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/captura"
          element={
            <ProtectedRoute allow={["ADMIN", "OPERATOR"]}>
              <PublicKiosks />
            </ProtectedRoute>
          }
        />
        <Route path="/trabajos" element={<Jobs />} />
        <Route path="/trabajos/:jobId" element={<JobDetail />} />
        <Route path="/nuevo-trabajo" element={<NewJob />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allow={["ADMIN"]}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
