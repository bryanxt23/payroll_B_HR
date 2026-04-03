import { Routes, Route, Navigate } from "react-router-dom";

import Shell from "../components/layout/Shell";
import Topbar from "../components/layout/Topbar";
import LoginPage from "../features/auth/LoginPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import InventoryPage from "../features/inventory/InventoryPage";
import SalesPage from "../features/sales/SalesPage";
import SettingsPage from "../features/settings/SettingsPage";
import ReportsPage from "../features/reports/ReportsPage";
import SalaryPage from "../features/salary/SalaryPage";
import PeoplePage from "../features/people/PeoplePage";
import CalendarPage from "../features/calendar/CalendarPage";

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "null");
  } catch { return null; }
}

function RequireAuth({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "Admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const user = getUser();

  return (
    <div className="page">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — with shell + topbar */}
        <Route path="/*" element={
          <RequireAuth>
            <Shell>
              <Topbar />
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/sales"     element={<SalesPage />} />
                <Route path="/reports"   element={<ReportsPage />} />
                <Route path="/salary"   element={<SalaryPage />} />
                <Route path="/people"   element={<PeoplePage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings"  element={
                  <RequireAdmin><SettingsPage /></RequireAdmin>
                } />
                <Route path="/"  element={<Navigate to="/dashboard" replace />} />
                <Route path="*"  element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        } />

        {/* Root redirect */}
        <Route path="/" element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </div>
  );
}
