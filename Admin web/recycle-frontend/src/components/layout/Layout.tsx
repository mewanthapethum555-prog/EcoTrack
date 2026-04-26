import { ReactNode, useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const sidebarOffsetClass = isSidebarCollapsed ? "ml-14" : "ml-64"
  const headerLeftClass = isSidebarCollapsed ? "left-14" : "left-64"
  const headerWidthClass = isSidebarCollapsed ? "w-[calc(100%-3.5rem)]" : "w-[calc(100%-16rem)]"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--forest)_/_0.15)] via-[hsl(var(--sage)_/_0.1)] to-[hsl(var(--ocean)_/_0.2)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[hsl(var(--forest)_/_0.25)] to-[hsl(var(--sage)_/_0.15)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-br from-[hsl(var(--ocean)_/_0.2)] to-[hsl(var(--forest-light)_/_0.15)] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-[hsl(var(--earth)_/_0.15)] to-[hsl(var(--sunset)_/_0.2)] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-20 w-64 h-64 bg-gradient-to-br from-[hsl(var(--sage)_/_0.2)] to-[hsl(var(--ocean-light)_/_0.15)] rounded-full blur-2xl"></div>
      </div>
      <div className="flex relative z-10">
        <Sidebar className="fixed top-0 left-0 h-screen z-20" onCollapsedChange={setIsSidebarCollapsed} />
        <div className={`flex-1 min-w-0 ${sidebarOffsetClass}`}>
          <div className={`fixed top-0 ${headerLeftClass} ${headerWidthClass} h-24 z-30`}>
            <Header />
          </div>
          <main className="p-6 pt-32 bg-background/50 backdrop-blur-md min-h-[calc(100vh-8rem)] relative">
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}