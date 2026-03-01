const tabs = [
  { id: 'home', label: 'Today', icon: '🏠' },
  { id: 'camera', label: 'Snap', icon: '📷' },
  { id: 'history', label: 'History', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const

export type TabId = (typeof tabs)[number]['id']

interface Props {
  active: TabId
  onNavigate: (tab: TabId) => void
}

export default function Navigation({ active, onNavigate }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-gray-200/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              active === tab.id
                ? 'text-primary'
                : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
