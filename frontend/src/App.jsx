import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import ClientsList from './pages/ClientsList';
import ClientDetails from './pages/ClientDetails';
import OffersList from './pages/OffersList';
import OfferBuilder from './pages/OfferBuilder';
import GPSMonitoring from './pages/GPSMonitoring';
import CampaignsList from './pages/CampaignsList';
import ScenariosConfig from './pages/ScenariosConfig';
import BlackList from './pages/BlackList';
import VehiclesList from './pages/VehiclesList';
import VehicleDetails from './pages/VehicleDetails';
import Nomenclatures from './pages/Nomenclatures';
import AlertsList from './pages/AlertsList';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/:id" element={<ClientDetails />} />
          <Route path="offers" element={<OffersList />} />
          <Route path="offers/new" element={<OfferBuilder />} />
          <Route path="offers/edit/:id" element={<OfferBuilder />} />
          <Route path="campaigns" element={<CampaignsList />} />
          <Route path="gps" element={<GPSMonitoring />} />
          <Route path="alerts" element={<AlertsList />} />
          <Route path="vehicles" element={<VehiclesList />} />
          <Route path="vehicles/:id" element={<VehicleDetails />} />
          <Route path="scenarios" element={<ScenariosConfig />} />
          <Route path="blacklist" element={<BlackList />} />
          <Route path="nomenclatures" element={<Nomenclatures />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<TermsOfService />} />
          <Route path="cookies" element={<CookiePolicy />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
