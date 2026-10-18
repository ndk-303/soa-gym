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
    <div className="d-flex flex-column vh-100 bg-light">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-grow-1 overflow-auto p-4">
          <div className="container-fluid" style={{ maxWidth: '1400px' }}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
