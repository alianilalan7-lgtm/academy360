'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface SidebarContextType {
  isOpen: boolean
  isCollapsed: boolean
  toggle: () => void
  close: () => void
  toggleCollapse: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  toggle: () => { },
  close: () => { },
  toggleCollapse: () => { },
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggleCollapse = useCallback(() => setIsCollapsed(prev => !prev), [])

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setIsCollapsed(true)
  }, [])

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggle, close, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
