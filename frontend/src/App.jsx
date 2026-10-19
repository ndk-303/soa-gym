import { useState } from 'react'
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} />
      case 'users':
        return <UsersPage />
      case 'members':
        return <MembersPage />
      case 'plans':
        return <PlansPage />
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
        return <PaymentsPage />
      default:
        return <Dashboard onTabChange={setActiveTab} />
    }
  }

  return (
    <div className="app-shell">
      <Navbar activeTab={activeTab} onMenuToggle={() => setSidebarOpen((open) => !open)} />

      <div className="app-body">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} isOpen={sidebarOpen} />
        {sidebarOpen && <button className="sidebar-backdrop" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}

        <main className="app-main">
          <div className="app-content">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
