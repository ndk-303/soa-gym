import { useState, useEffect, useCallback } from 'react'
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

// Member Portal Components
import MemberDashboard from './pages/member/MemberDashboard'
import MemberPlansPage from './pages/member/MemberPlansPage'
import MemberClassesPage from './pages/member/MemberClassesPage'
import MemberHistoryPage from './pages/member/MemberHistoryPage'
import { resolveCurrentMember } from './utils/memberSession'

const MEMBER_TABS = ['dashboard', 'plans', 'classes', 'history']

function MainLayout() {
  const { isAuthenticated, isAdmin, user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentMember, setCurrentMember] = useState(null)
  const [memberLoading, setMemberLoading] = useState(false)

  const loadCurrentMember = useCallback(async () => {
    if (!user) return
    setMemberLoading(true)
    try {
      const member = await resolveCurrentMember(user)
      setCurrentMember(member)
    } finally {
      setMemberLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      loadCurrentMember()
    }
  }, [isAuthenticated, isAdmin, loadCurrentMember])

  // If user is member and current tab is not a valid member tab, redirect to dashboard
  useEffect(() => {
    if (!isAdmin && !MEMBER_TABS.includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }, [isAdmin, activeTab])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const handleTabChange = (tab) => {
    if (!isAdmin && !MEMBER_TABS.includes(tab)) {
      return
    }
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const renderContent = () => {
    if (!isAdmin) {
      switch (activeTab) {
        case 'dashboard':
          return (
            <MemberDashboard
              onTabChange={handleTabChange}
              currentMember={currentMember}
              memberLoading={memberLoading}
              onMemberRefresh={loadCurrentMember}
            />
          )
        case 'plans':
          return (
            <MemberPlansPage
              currentMember={currentMember}
              onMemberRefresh={loadCurrentMember}
              onTabChange={handleTabChange}
            />
          )
        case 'classes':
          return <MemberClassesPage currentMember={currentMember} />
        case 'history':
          return <MemberHistoryPage currentMember={currentMember} />
        default:
          return (
            <MemberDashboard
              onTabChange={handleTabChange}
              currentMember={currentMember}
              memberLoading={memberLoading}
              onMemberRefresh={loadCurrentMember}
            />
          )
      }
    }

    // Admin rendering
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={handleTabChange} />
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
