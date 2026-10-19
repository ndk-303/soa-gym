import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import MembersPage from './pages/MembersPage'
import PlansPage from './pages/PlansPage'
import ClassesPage from './pages/ClassesPage'
import SlotsPage from './pages/SlotsPage'
import BookingsPage from './pages/BookingsPage'
import AttendancePage from './pages/AttendancePage'
import InvoicesPage from './pages/InvoicesPage'
import PaymentsPage from './pages/PaymentsPage'

function MainLayout() {
  const { isAuthenticated, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const adminOnlyTabs = ['users', 'members', 'plans', 'payments']

  // If user is member and current tab is restricted, redirect to dashboard
  useEffect(() => {
    if (!isAdmin && adminOnlyTabs.includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }, [isAdmin, activeTab])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const handleTabChange = (tab) => {
    if (!isAdmin && adminOnlyTabs.includes(tab)) {
      return
    }
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={handleTabChange} />
      case 'users':
        return isAdmin ? <UsersPage /> : <Dashboard onTabChange={handleTabChange} />
      case 'members':
        return isAdmin ? <MembersPage /> : <Dashboard onTabChange={handleTabChange} />
      case 'plans':
        return isAdmin ? <PlansPage /> : <Dashboard onTabChange={handleTabChange} />
      case 'classes':
        return <ClassesPage />
      case 'slots':
        return <SlotsPage />
      case 'bookings':
        return <BookingsPage />
      case 'attendance':
        return <AttendancePage />
      case 'invoices':
        return <InvoicesPage />
      case 'payments':
        return isAdmin ? <PaymentsPage /> : <Dashboard onTabChange={handleTabChange} />
      default:
        return <Dashboard onTabChange={handleTabChange} />
    }
  }

  return (
    <div className="app-shell">
      <Navbar activeTab={activeTab} onMenuToggle={() => setSidebarOpen((open) => !open)} />

      <div className="app-body">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} isOpen={sidebarOpen} />
        {sidebarOpen && (
          <button
            className="sidebar-backdrop"
            aria-label="Đóng menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="app-main">
          <div className="app-content">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  )
}
