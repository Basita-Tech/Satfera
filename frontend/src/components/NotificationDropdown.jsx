import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Clock, User, Heart, UserCheck, X, Eye } from "lucide-react";
import { 
  getNotifications, 
  getUnreadNotificationsCount,
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../api/auth";

export default function NotificationDropdown({ onViewAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count on mount and set interval
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    const response = await getUnreadNotificationsCount();
    console.log("🔔 NotificationDropdown - Unread Count Response:", response);
    if (response?.success && typeof response?.count === 'number') {
      setUnreadCount(response.count);
      console.log("✅ Unread count set to:", response.count);
    } else {
      console.error("❌ Failed to get unread count:", response);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const response = await getNotifications(1, 5); // Get latest 5 notifications
    console.log("🔔 NotificationDropdown - Notifications Response:", response);
    if (response?.success && response?.data) {
      setNotifications(response.data);
      console.log("✅ Loaded", response.data.length, "notifications in dropdown");
    } else {
      console.error("❌ Failed to load notifications:", response);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    const response = await markNotificationAsRead(notificationId);
    if (response?.success) {
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true } 
            : notif
        )
      );
      fetchUnreadCount(); // Refresh count
    }
  };

  const handleMarkAllAsRead = async () => {
    const response = await markAllNotificationsAsRead();
    if (response?.success) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "profile_viewed":
        return <Eye className="w-4 h-4 text-purple-500" />;
      case "connection_request":
        return <User className="w-4 h-4 text-blue-500" />;
      case "request_accepted":
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case "request_rejected":
        return <X className="w-4 h-4 text-red-500" />;
      case "profile_liked":
      case "shortlisted":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "match":
        return <CheckCheck className="w-4 h-4 text-[#D4A052]" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric"
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#D4A052]/10 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Notifications"
        type="button"
      >
        <Bell className="w-6 h-6 text-[#800000]" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[380px] sm:w-80 md:w-96 bg-white rounded-lg shadow-xl border border-[#D4A052]/20 z-[9999] max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4A052]/20 bg-gradient-to-r from-[#800000]/5 to-[#D4A052]/5">
            <h3 className="font-semibold text-[#800000] flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#D4A052] hover:text-[#800000] transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[350px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4A052]"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 hover:bg-[#D4A052]/5 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    !notification.isRead ? "bg-blue-50/30" : ""
                  }`}
                  onClick={(e) => !notification.isRead && handleMarkAsRead(notification._id, e)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-[#800000] line-clamp-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-[#D4A052]/20 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll?.();
                }}
                className="w-full text-center text-sm text-[#D4A052] hover:text-[#800000] font-medium transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
