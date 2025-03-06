import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
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

// Novos componentes para melhorar a UX
import ConnectionWizard from './components/ConnectionWizard/ConnectionWizard';
import ConnectionStatusDashboard from './components/StatusDashboard/ConnectionStatusDashboard';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<ConnectionWizard />} />
            
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
                <Route path="/connection-status" element={<ConnectionStatusDashboard />} />
              </Route>
            </Route>
            
            {/* Redirecionamento para o login */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;