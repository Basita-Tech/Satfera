import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, Clock, User, Heart, UserCheck } from "lucide-react";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../../api/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });
  useEffect(() => {
    fetchNotifications(pagination.page);
  }, [pagination.page]);
  const fetchNotifications = async page => {
    setLoading(true);
    const response = await getNotifications(page, pagination.limit);
    if (response?.success && response?.data) {
      setNotifications(response.data);
      setPagination(response.pagination || pagination);
    } else {
      console.error("❌ Failed to load notifications:", response);
    }
    setLoading(false);
  };
  const handleMarkAsRead = async notificationId => {
    const response = await markNotificationAsRead(notificationId);
    if (response?.success) {
      setNotifications(prev => prev.map(notif => notif._id === notificationId ? {
        ...notif,
        isRead: true
      } : notif));
    }
  };
  const handleMarkAllAsRead = async () => {
    const response = await markAllNotificationsAsRead();
    if (response?.success) {
      setNotifications(prev => prev.map(notif => ({
        ...notif,
        isRead: true
      })));
    }
  };
  const getNotificationIcon = type => {
    switch (type?.toLowerCase()) {
      case "connection_request":
        return <User className="w-5 h-5 text-blue-500" />;
      case "request_accepted":
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case "profile_liked":
      case "shortlisted":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "match":
        return <CheckCheck className="w-5 h-5 text-[#D4A052]" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };
  const formatDate = dateString => {
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
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  };
  const handlePageChange = newPage => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  return <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <Card className="border-[#D4A052]/30 shadow-lg">
        <CardHeader className="border-b border-[#D4A052]/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-[#800000] flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
            </CardTitle>
            {notifications.some(n => !n.isRead) && <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="text-[#D4A052] border-[#D4A052] hover:bg-[#D4A052] hover:text-white">
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A052]"></div>
            </div> : notifications.length === 0 ? <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-2">
                You'll see updates about connections, matches, and more here
              </p>
            </div> : <div className="divide-y divide-[#D4A052]/10">
              {notifications.map(notification => <div key={notification._id} className={`p-4 hover:bg-[#D4A052]/5 transition-colors cursor-pointer ${!notification.isRead ? "bg-blue-50/30" : ""}`} onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}>
                  <div className="flex gap-4">
                    {}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#800000] mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                      </div>

                      {}
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>}

          {}
          {notifications.length > 0 && <div className="flex items-center justify-between px-4 py-4 border-t border-[#D4A052]/20">
              <p className="text-sm text-gray-500">
                Showing {notifications.length} of {pagination.total} notifications
              </p>
              <div className="flex gap-2">
                <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} variant="outline" size="sm" className="border-[#D4A052]/30">
                  Previous
                </Button>
                <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasMore} variant="outline" size="sm" className="border-[#D4A052]/30">
                  Next
                </Button>
              </div>
            </div>}
        </CardContent>
      </Card>
    </div>;
}