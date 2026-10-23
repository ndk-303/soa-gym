import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import LoadingSpinner from './components/LoadingSpinner'
import { resolveCurrentMember } from './utils/memberSession'

// Lazy-loaded Admin and Auth Pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const MembersPage = lazy(() => import('./pages/MembersPage'))
const PlansPage = lazy(() => import('./pages/PlansPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const SlotsPage = lazy(() => import('./pages/SlotsPage'))
const BookingsPage = lazy(() => import('./pages/BookingsPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))

// Lazy-loaded Member Portal Pages
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'))
const MemberPlansPage = lazy(() => import('./pages/member/MemberPlansPage'))
const MemberClassesPage = lazy(() => import('./pages/member/MemberClassesPage'))
const MemberHistoryPage = lazy(() => import('./pages/member/MemberHistoryPage'))

// Lazy-loaded Trainer Portal Pages
const TrainerDashboard = lazy(() => import('./pages/trainer/TrainerDashboard'))
const TrainerSchedulePage = lazy(() => import('./pages/trainer/TrainerSchedulePage'))
const TrainerClassesPage = lazy(() => import('./pages/trainer/TrainerClassesPage'))
const TrainerTraineesPage = lazy(() => import('./pages/trainer/TrainerTraineesPage'))
const TrainerAttendancePage = lazy(() => import('./pages/trainer/TrainerAttendancePage'))

const MEMBER_TABS = ['dashboard', 'plans', 'classes', 'history']
const TRAINER_TABS = ['dashboard', 'schedule', 'classes', 'trainees', 'attendance']

function MainLayout() {
  const { isAuthenticated, isAdmin, isTrainer, user } = useAuth()
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
    if (isAuthenticated && !isAdmin && !isTrainer) {
      loadCurrentMember()
    }
  }, [isAuthenticated, isAdmin, isTrainer, loadCurrentMember])

  // Redirect to dashboard if activeTab is not valid for current role
  useEffect(() => {
    if (isTrainer && !TRAINER_TABS.includes(activeTab)) {
      setActiveTab('dashboard')
    } else if (!isAdmin && !isTrainer && !MEMBER_TABS.includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }, [isAdmin, isTrainer, activeTab])

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner message="Đang tải trang đăng nhập..." />}>
        <LoginPage />
      </Suspense>
    )
  }

  const handleTabChange = (tab) => {
    if (isTrainer && !TRAINER_TABS.includes(tab)) return
    if (!isAdmin && !isTrainer && !MEMBER_TABS.includes(tab)) return
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const renderContent = () => {
    // Trainer Portal rendering
    if (isTrainer) {
      switch (activeTab) {
        case 'dashboard':
          return <TrainerDashboard onTabChange={handleTabChange} />
        case 'schedule':
          return <TrainerSchedulePage />
        case 'classes':
          return <TrainerClassesPage />
        case 'trainees':
          return <TrainerTraineesPage />
        case 'attendance':
          return <TrainerAttendancePage />
        default:
          return <TrainerDashboard onTabChange={handleTabChange} />
      }
    }

    // Member Portal rendering
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
          <div className="app-content">
            <Suspense fallback={<LoadingSpinner message="Đang tải dữ liệu phân hệ..." />}>
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  )
}
