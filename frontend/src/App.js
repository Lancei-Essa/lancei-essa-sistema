import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EpisodeList from './pages/EpisodeList';
import EpisodeForm from './pages/EpisodeForm';
import EpisodeDetails from './pages/EpisodeDetails';
import Publications from './pages/Publications';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NewsletterGenerator from './pages/NewsletterGenerator';
import NewsletterHistory from './pages/NewsletterHistory';
import Documentation from './pages/Documentation';
import SocialMedia from './pages/SocialMedia';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas protegidas com Layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/episodes" element={<EpisodeList />} />
              <Route path="/episodes/new" element={<EpisodeForm />} />
              <Route path="/episodes/:id" element={<EpisodeDetails />} />
              <Route path="/episodes/:id/edit" element={<EpisodeForm />} />
              <Route path="/publications" element={<Publications />} />
              <Route path="/social-media" element={<SocialMedia />} />
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/newsletters/generator" element={<NewsletterGenerator />} />
              <Route path="/newsletters/history" element={<NewsletterHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/documentation" element={<Documentation />} />
            </Route>
          </Route>
          
          {/* Redirecionamento para o login */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;