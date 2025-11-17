export function TabsComponent({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 border-b border-border-subtle">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`relative flex items-center gap-2 pb-2 border-b-2 transition-colors bg-transparent ${
            activeTab === tab.key
              ? "text-gold border-gold"
              : "text-gray-500 border-transparent hover:text-gold"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`text-xs px-2 py-[1px] rounded-full bg-transparent ${
                activeTab === tab.key
                  ? "text-gold"
                  : "text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
