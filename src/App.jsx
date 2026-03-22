import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Dentists from './pages/Dentists';
import Patients from './pages/Patients';
import Treatments from './pages/Treatments';
import PatientTreatments from './pages/PatientTreatments';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dentists" element={<Dentists />} />
          <Route path="patients" element={<Patients />} />
          <Route path="treatments" element={<Treatments />} />
          <Route path="patient-treatments" element={<PatientTreatments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<Payments />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
