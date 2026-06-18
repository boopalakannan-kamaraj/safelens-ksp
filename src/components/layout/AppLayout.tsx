import { Outlet } from 'react-router-dom'
import AskSafeLens from '../AskSafeLens'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex h-full bg-navy-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <AskSafeLens />
    </div>
  )
}
