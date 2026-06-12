import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/FirebaseProvider';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Flights } from './components/Flights';
import { Hotels } from './components/Hotels';
import { Cruises } from './components/Cruises';
import { DigitalConcierge } from './components/DigitalConcierge';
import { SearchPage } from './components/SearchPage';
import { DestinationsPage } from './components/DestinationsPage';
import { ConciergePage } from './components/ConciergePage';
import { AuthPage } from './components/AuthPage';
import { BudgetEstimator } from './components/BudgetEstimator';
import { MapExplorer } from './components/MapExplorer';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center font-headline font-bold text-secondary text-2xl animate-pulse">Voyago</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
};

import { ConciergeProvider } from './components/ConciergeContext';
import { ToastProvider } from './components/ToastContext';
import { CurrencyProvider } from './components/CurrencyContext';

export default function App() {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <AuthProvider>
          <ConciergeProvider>
            <Router>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/flights" element={<Flights />} />
                    <Route path="/hotels" element={<Hotels />} />
                    <Route path="/cruises" element={<Cruises />} />
                    <Route path="/concierge" element={<ConciergePage />} />
                    <Route path="/budget" element={<BudgetEstimator />} />
                    <Route path="/map" element={<MapExplorer />} />
                    <Route path="/destinations" element={<DestinationsPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  </Routes>
                </div>
                <Footer />
                <DigitalConcierge />
              </div>
            </Router>
          </ConciergeProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}
