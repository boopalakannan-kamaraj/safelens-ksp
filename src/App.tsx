import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CrimeMap from './pages/CrimeMap'
import Dashboard from './pages/Dashboard'
import NetworkAnalysis from './pages/NetworkAnalysis'
import RiskScoring from './pages/RiskScoring'
import Trends from './pages/Trends'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<CrimeMap />} />
          <Route path="trends" element={<Trends />} />
          <Route path="network" element={<NetworkAnalysis />} />
          <Route path="risk" element={<RiskScoring />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
