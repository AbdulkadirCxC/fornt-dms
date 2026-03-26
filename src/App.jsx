import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import { PermissionProvider } from './auth/PermissionContext';
import { ROUTE_PERMISSIONS } from './auth/permissionRules';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Dentists from './pages/Dentists';
import Patients from './pages/Patients';
import Treatments from './pages/Treatments';
import PatientTreatments from './pages/PatientTreatments';
import PatientRecalls from './pages/PatientRecalls';
import RecallNotifications from './pages/RecallNotifications';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import RolesPermissions from './pages/RolesPermissions';

function App() {
  return (
    <PermissionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="register" element={<PermissionRoute required={ROUTE_PERMISSIONS['/register']}><Register /></PermissionRoute>} />
            <Route path="dentists" element={<PermissionRoute required={ROUTE_PERMISSIONS['/dentists']}><Dentists /></PermissionRoute>} />
            <Route path="patients" element={<PermissionRoute required={ROUTE_PERMISSIONS['/patients']}><Patients /></PermissionRoute>} />
            <Route path="treatments" element={<PermissionRoute required={ROUTE_PERMISSIONS['/treatments']}><Treatments /></PermissionRoute>} />
            <Route path="patient-treatments" element={<PermissionRoute required={ROUTE_PERMISSIONS['/patient-treatments']}><PatientTreatments /></PermissionRoute>} />
            <Route path="patient-recalls" element={<PermissionRoute required={ROUTE_PERMISSIONS['/patient-recalls']}><PatientRecalls /></PermissionRoute>} />
            <Route path="recall-notifications" element={<PermissionRoute required={ROUTE_PERMISSIONS['/recall-notifications']}><RecallNotifications /></PermissionRoute>} />
            <Route path="invoices" element={<PermissionRoute required={ROUTE_PERMISSIONS['/invoices']}><Invoices /></PermissionRoute>} />
            <Route path="payments" element={<PermissionRoute required={ROUTE_PERMISSIONS['/payments']}><Payments /></PermissionRoute>} />
            <Route path="appointments" element={<PermissionRoute required={ROUTE_PERMISSIONS['/appointments']}><Appointments /></PermissionRoute>} />
            <Route path="reports" element={<PermissionRoute required={ROUTE_PERMISSIONS['/reports']}><Reports /></PermissionRoute>} />
            <Route path="roles-permissions" element={<PermissionRoute required={ROUTE_PERMISSIONS['/roles-permissions']}><RolesPermissions /></PermissionRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PermissionProvider>
  );
}

export default App;
