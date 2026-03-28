import React, { useState } from 'react';
import { Settings, Sun, Moon, Type, Globe, Bell, Check, Trash2 } from 'lucide-react';
import { UserSettings, Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

const Header: React.FC<HeaderProps> = ({ settings, onUpdateSettings, notifications, onMarkRead, onClearAll }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const languages = ["English", "Spanish", "Chinese", "Tagalog", "Vietnamese", "Arabic", "French"];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-color bg-card-bg px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-color text-white">
            <Globe size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CivicLens</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 md:flex">
            <Globe size={18} className="text-muted" />
            <select 
              value={settings.language}
              onChange={(e) => onUpdateSettings({ language: e.target.value })}
              className="rounded-md border border-border-color bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-color"
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-color hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-border-color bg-card-bg shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-border-color bg-gray-50 px-4 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Notifications</h3>
                    <button 
                      onClick={onClearAll}
                      className="text-[10px] font-bold text-accent-color hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => onMarkRead(n.id)}
                          className={`cursor-pointer border-b border-border-color p-3 transition-colors hover:bg-gray-50 ${n.read ? 'opacity-60' : 'bg-accent-color/5'}`}
                        >
                          <div className="flex justify-between gap-2">
                            <h4 className="text-sm font-bold leading-tight">{n.title}</h4>
                            {!n.read && (
                              <div className="h-2 w-2 rounded-full bg-accent-color" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted leading-relaxed">{n.message}</p>
                          <span className="mt-2 block text-[10px] text-muted">{n.date}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-muted">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-color hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Toggle High Contrast"
          >
            {settings.highContrast ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={() => onUpdateSettings({ largeFont: !settings.largeFont })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-color hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Toggle Large Font"
          >
            <Type size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
