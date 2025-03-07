import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import { CircularProgress, Box } from '@mui/material';
import YouTubeAnalytics from './pages/YouTubeAnalytics';

// Lazy loaded components
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EpisodeList = lazy(() => import('./pages/EpisodeList'));
const EpisodeForm = lazy(() => import('./pages/EpisodeForm'));
const EpisodeDetails = lazy(() => import('./pages/EpisodeDetails'));
const Publications = lazy(() => import('./pages/Publications'));
const Metrics = lazy(() => import('./pages/Metrics'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const NewsletterGenerator = lazy(() => import('./pages/NewsletterGenerator'));
const NewsletterHistory = lazy(() => import('./pages/NewsletterHistory'));
const Documentation = lazy(() => import('./pages/Documentation'));
const ConnectionWizard = lazy(() => import('./components/ConnectionWizard/ConnectionWizard'));

// Loading component for Suspense
const Loading = () => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    height: '100vh'
  }}>
    <CircularProgress />
  </Box>
);

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
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={<ConnectionWizard />} />
              
              {/* YouTube Analytics como rota independente */}
              <Route path="/youtube-analytics" element={
                <PrivateRoute>
                  <Layout>
                    <YouTubeAnalytics />
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Rotas protegidas com Layout */}
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/episodes" element={<EpisodeList />} />
                  <Route path="/episodes/new" element={<EpisodeForm />} />
                  <Route path="/episodes/:id" element={<EpisodeDetails />} />
                  <Route path="/episodes/:id/edit" element={<EpisodeForm />} />
                  <Route path="/publications" element={<Publications />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/newsletters/generator" element={<NewsletterGenerator />} />
                  <Route path="/newsletters/history" element={<NewsletterHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/documentation" element={<Documentation />} />
                  
                  {/* Redirecionamento para páginas consolidadas na área de configurações */}
                  <Route path="/social-media" element={<Navigate to="/settings" />} />
                  <Route path="/connection-status" element={<Navigate to="/settings" />} />
                </Route>
              </Route>
              
              {/* Redirecionamento para o login */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;