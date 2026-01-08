import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';
import { Badge } from '../../ui/badge';
import { ChangePasswordModal } from '../../ChangePasswordModal';
import { EditContactModal } from '../../EditContactModal';
import { BlockedUsersList } from '../../BlockedUsersList';
import { BlockUserDialog } from '../../BlockUserDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../ui/dialog';
import { Textarea } from '../../ui/textarea';
import { getUserProfileDetails, getBlockedUsers, getNotificationSettings, updateNotificationSettings, getUserContactInfo, getSessions, logoutSession, logoutAllSessions, deactivateAccount, activateAccount, getAccountStatus, deleteUserAccount, createSupportTicket, getSupportTickets, getSupportTicketDetails, addTicketMessage } from '../../../api/auth';
import { AuthContextr } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Lock, Shield, Heart, Bell, Crown, LogOut, Mail, Phone, Trash2, UserX, Monitor, CreditCard, HelpCircle, MessageCircle, FileText, Send, Ticket, Clock, CheckCircle, XCircle, X, RefreshCw } from 'lucide-react';
export function Settings() {
  const navigate = useNavigate();
  const {
    logout
  } = useContext(AuthContextr);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [editContactModal, setEditContactModal] = useState({
    open: false,
    type: null
  });
  const [blockedUsersModalOpen, setBlockedUsersModalOpen] = useState(false);
  const [blockUserDialogOpen, setBlockUserDialogOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [accountStatus, setAccountStatus] = useState('active');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [yourTicketsDialogOpen, setYourTicketsDialogOpen] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketMessage, setTicketMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phoneNumber: ''
  });
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false
  });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [updatingNotification, setUpdatingNotification] = useState(null);
  const [settings, setSettings] = useState({
    profileVisibility: 'everyone',
    hideFromSearch: false,
    showVerifiedOnly: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    twoFactorAuth: false,
    autoRenew: true,
    ageRange: [24, 32],
    heightRange: [160, 180]
  });
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [loggingOutSessionId, setLoggingOutSessionId] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  useEffect(() => {
    fetchUserProfile();
    fetchBlockedCount();
    fetchNotificationSettings();
    fetchContactInfo();
    fetchSessions();
    fetchSupportTickets();
  }, []);
  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await getUserProfileDetails(false);
      if (response?.success && response?.data) {
        console.log('User Profile Data:', response.data);
        setUserProfile(response.data);
      }
      
      // Fetch account status separately
      const statusResponse = await getAccountStatus();
      console.log('Account Status Response:', statusResponse);
      if (statusResponse?.success && statusResponse?.data) {
        const isActive = statusResponse.data.isActive;
        const status = isActive ? 'active' : 'deactivated';
        setAccountStatus(status);
        console.log('Account Status:', status, '(isActive:', isActive, ')');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };
  const fetchBlockedCount = async () => {
    try {
      const response = await getBlockedUsers(true);
      if (response?.success && Array.isArray(response?.data)) {
        setBlockedCount(response.data.length);
      } else {
        setBlockedCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch blocked count:', error);
      setBlockedCount(0);
    }
  };
  const handleBlockSuccess = () => {
    fetchBlockedCount();
  };
  const fetchNotificationSettings = async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await getNotificationSettings();
      if (response?.success && response?.data) {
        setNotificationSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoadingNotifications(false);
    }
  };
  const fetchContactInfo = async () => {
    setIsLoadingContact(true);
    try {
      const response = await getUserContactInfo();
      if (response?.success && response?.data) {
        setContactInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch contact info:', error);
      toast.error('Failed to load contact information');
    } finally {
      setIsLoadingContact(false);
    }
  };
  const handleNotificationToggle = async (settingKey, value) => {
    const previousValue = notificationSettings[settingKey];
    setNotificationSettings(prev => ({
      ...prev,
      [settingKey]: value
    }));
    setUpdatingNotification(settingKey);
    try {
      const response = await updateNotificationSettings({
        [settingKey]: value
      });
      if (response?.success) {
        toast.success('Notification setting updated');
        if (response?.data) {
          setNotificationSettings(response.data);
        }
      } else {
        setNotificationSettings(prev => ({
          ...prev,
          [settingKey]: previousValue
        }));
        toast.error(response?.message || 'Failed to update notification setting');
      }
    } catch (error) {
      setNotificationSettings(prev => ({
        ...prev,
        [settingKey]: previousValue
      }));
      console.error('Failed to update notification setting:', error);
      toast.error('Failed to update notification setting');
    } finally {
      setUpdatingNotification(null);
    }
  };
  const handleSave = () => {
    toast.success('Settings saved successfully');
  };
  const handleContactUpdate = newValue => {
    setUserProfile(prev => ({
      ...prev,
      [editContactModal.type === 'email' ? 'email' : 'phoneNumber']: newValue
    }));
    fetchUserProfile();
    fetchContactInfo();
  };
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await getSessions();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.sessions) ? res.data.sessions : [];
      setSessions(list);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      toast.error('Failed to load sessions');
      setSessionsError(err?.message || 'Failed to load sessions');
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };
  const handleLogoutSession = async sessionId => {
    if (!sessionId) return;
    setLoggingOutSessionId(sessionId);
    try {
      const res = await logoutSession(sessionId);
      if (res?.success) {
        toast.success('Session logged out');
        await fetchSessions();
      } else {
        toast.error(res?.message || 'Failed to logout session');
      }
    } catch (err) {
      console.error('Logout session error:', err);
      toast.error('Failed to logout session');
    } finally {
      setLoggingOutSessionId(null);
    }
  };
  const handleLogoutAllSessions = async () => {
    if (!window.confirm('Logout all other sessions?')) return;
    try {
      setIsLoggingOutAll(true);
      const res = await logoutAllSessions();
      if (res?.success) {
        toast.success('Logged out all other sessions');
        await fetchSessions();
      } else {
        toast.error(res?.message || 'Failed to logout all sessions');
      }
    } catch (err) {
      console.error('Logout all sessions error:', err);
      toast.error('Failed to logout all sessions');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleReactivateAccount = async () => {
    setIsReactivating(true);
    try {
      const response = await activateAccount();
      
      if (response?.success) {
        toast.success('Account reactivated successfully!');
        await fetchUserProfile();
      } else {
        toast.error(response?.message || 'Failed to reactivate account');
      }
    } catch (error) {
      console.error('Reactivate account error:', error);
      toast.error('Failed to reactivate account. Please try again.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!deactivateReason.trim()) {
      toast.error('Please provide a reason for deactivation');
      return;
    }

    setIsDeactivating(true);
    try {
      const response = await deactivateAccount(deactivateReason);
      
      if (response?.success) {
        toast.success('Account deactivated successfully');
        setDeactivateDialogOpen(false);
        setDeactivateReason('');
        
    
        setTimeout(async () => {
          await logout();
          navigate('/login');
        }, 1500);
      } else {
        toast.error(response?.message || 'Failed to deactivate account');
      }
    } catch (error) {
      console.error('Deactivate account error:', error);
      toast.error('Failed to deactivate account. Please try again.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteUserAccount(deleteReason);
      
      if (response?.success) {
        toast.success('Account deleted successfully');
        setDeleteDialogOpen(false);
        setDeleteReason('');
        
      
        setTimeout(async () => {
          await logout();
          navigate('/login');
        }, 1500);
      } else {
        toast.error(response?.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSupportTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const response = await getSupportTickets();
      if (response?.success && Array.isArray(response?.data)) {
        setSupportTickets(response.data);
      } else {
        setSupportTickets([]);
      }
    } catch (error) {
      console.error('Failed to fetch support tickets:', error);
      setSupportTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim() || !ticketCategory.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingTicket(true);
    try {
      console.log('Creating ticket:', { ticketSubject, ticketMessage, ticketCategory });
      const response = await createSupportTicket(ticketSubject, ticketMessage, ticketCategory);
      
      if (response?.success) {
        toast.success('Support ticket created successfully');
        setTicketSubject('');
        setTicketMessage('');
        setTicketCategory('general');
        await fetchSupportTickets();
      } else {
        toast.error(response?.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      toast.error('Failed to create ticket. Please try again.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    try {
      const response = await getSupportTicketDetails(ticket._id || ticket.id);
      if (response?.success && response?.data) {
        setSelectedTicket(response.data);
      } else {
        setSelectedTicket(ticket);
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      setSelectedTicket(ticket);
    }
  };

  const refreshCurrentTicket = async () => {
    if (!selectedTicket) return;
    try {
      const response = await getSupportTicketDetails(selectedTicket._id || selectedTicket.id);
      if (response?.success && response?.data) {
        setSelectedTicket(response.data);
        toast.success('Messages refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh ticket:', error);
      toast.error('Failed to refresh messages');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setIsSendingReply(true);
    try {
      const response = await addTicketMessage(selectedTicket._id || selectedTicket.id, replyMessage);
      
      if (response?.success) {
        toast.success('Message sent successfully');
        setReplyMessage('');

        await handleSelectTicket(selectedTicket);
        await fetchSupportTickets();
      } else {
        toast.error(response?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send reply error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'Open' },
      'in-progress': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Closed' },
    };
    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border px-2 py-0.5 text-xs font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const recentDevices = [{
    device: 'Chrome on Windows',
    location: 'Mumbai, India',
    time: '2 hours ago',
    current: true
  }, {
    device: 'Safari on iPhone',
    location: 'Mumbai, India',
    time: '1 day ago',
    current: false
  }, {
    device: 'Chrome on Android',
    location: 'Delhi, India',
    time: '3 days ago',
    current: false
  }];
  return <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="mb-6">
        <h2 className="m-0 mb-2 text-2xl font-semibold text-[#3a2f00]">Settings</h2>
        <p className="text-muted-foreground m-0">Manage your account preferences and privacy settings</p>
      </div>

      <div className="space-y-6">
        
        {}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Account Settings</h3>
          </div>

          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => navigate('/dashboard/edit-profile')}>
              <User className="w-4 h-4 mr-3" />
              Edit Profile
            </Button>

            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => setIsChangePasswordModalOpen(true)}>
              <Lock className="w-4 h-4 mr-3" />
              Change Password
            </Button>

            {}
            <div className="border border-border-subtle rounded-[12px] p-4">
              <h4 className="mb-3">Manage Contact Details</h4>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Email Address</Label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Input value={isLoadingContact ? 'Loading...' : contactInfo?.email || 'Not provided'} readOnly className="rounded-[12px] border-border-subtle bg-beige flex-1" />
                    <Button variant="outline" className="rounded-[12px] border-border-subtle whitespace-nowrap hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all sm:w-auto w-full" onClick={() => setEditContactModal({
                    open: true,
                    type: 'email'
                  })} disabled={isLoadingContact}>
                      <Mail className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Mobile Number</Label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Input value={isLoadingContact ? 'Loading...' : contactInfo?.phoneNumber || 'Not provided'} readOnly className="rounded-[12px] border-border-subtle bg-beige flex-1" />
                    <Button variant="outline" className="rounded-[12px] border-border-subtle whitespace-nowrap hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all sm:w-auto w-full" onClick={() => setEditContactModal({
                    open: true,
                    type: 'phone'
                  })} disabled={isLoadingContact}>
                      <Phone className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="pt-4 border-t border-border-subtle space-y-3">
              {accountStatus === 'deactivated' ? (
                <Button variant="outline" className="w-full justify-start border-gold/50 text-gold hover:!bg-gold/10 hover:!text-gold active:!bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold/50 rounded-[12px] h-12 transition-all" onClick={handleReactivateAccount} disabled={isReactivating}>
                  <UserX className="w-4 h-4 mr-3" />
                  {isReactivating ? 'Activating...' : 'Activate Account'}
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 rounded-[12px] h-12 transition-all" onClick={() => setDeactivateDialogOpen(true)}>
                  <UserX className="w-4 h-4 mr-3" />
                  Deactivate Account
                </Button>
              )}

              <Button variant="outline" className="w-full justify-start border-red-accent text-red-accent hover:!bg-red-600 hover:!text-white hover:!border-red-600 active:!bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 rounded-[12px] h-12 transition-all" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-3" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Security</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="m-0">Recent Login Activity</h4>
                <Button variant="outline" size="sm" className="rounded-[8px] border-red-accent text-red-accent hover:!bg-red-600 hover:!text-white hover:!border-red-600 active:!bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 transition-all" onClick={handleLogoutAllSessions} disabled={isLoggingOutAll || isLoadingSessions}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOutAll ? 'Logging out...' : 'Logout All'}
                </Button>
              </div>

              {sessionsError && <div className="p-3 mb-3 rounded-[8px] border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
                  <span className="text-sm">{sessionsError}</span>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={fetchSessions}>
                    Retry
                  </Button>
                </div>}

              {isLoadingSessions ? <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-2"></div>
                    <p className="text-sm">Loading sessions...</p>
                  </div>
                </div> : <div className="space-y-3">
                  {sessions.length === 0 ? <div className="p-4 bg-beige rounded-[12px] text-sm text-muted-foreground">No active sessions found.</div> : sessions.map((s, idx) => <div key={s.sessionId || idx} className="flex items-start justify-between p-4 border border-border-subtle rounded-[12px]">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-beige flex items-center justify-center mt-1">
                            <Monitor className="w-5 h-5 text-gold" />
                          </div>

                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {typeof s.device === 'string' ? s.device : s?.device?.display || s?.device?.name || s?.userAgent?.display || 'Unknown Device'}
                              {s.isCurrent && <Badge className="bg-gold/10 text-gold border-gold/20 text-xs">Current</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              IP {s.ipAddress || '—'} • Logged in: {s.loginTime ? new Date(s.loginTime).toLocaleString() : '—'} • Last active: {s.lastActive ? new Date(s.lastActive).toLocaleString() : '—'}
                            </div>
                          </div>
                        </div>

                        {!s.isCurrent && <Button variant="outline" size="sm" className="rounded-[8px] border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 transition-all" onClick={() => handleLogoutSession(s.sessionId)} disabled={loggingOutSessionId === s.sessionId}>
                            {loggingOutSessionId === s.sessionId ? 'Logging out...' : 'Logout'}
                          </Button>}
                      </div>)}
                </div>}
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Privacy & Safety</h3>
          </div>

          <div className="space-y-6">
            
            {}
            <Button variant="outline" className="w-full justify-start border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 rounded-[12px] h-12 transition-all" onClick={() => setBlockUserDialogOpen(true)}>
              <UserX className="w-4 h-4 mr-3" />
              Block a User
            </Button>

            {}
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => setBlockedUsersModalOpen(true)}>
              <UserX className="w-4 h-4 mr-3" />
              Blocked Users List ({blockedCount})
            </Button>

            {}
            <Button variant="outline" className="w-full justify-start border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 rounded-[12px] h-12 transition-all" onClick={() => toast.info('Report profile form would open')}>
              <Shield className="w-4 h-4 mr-3" />
              Report a Profile
            </Button>
          </div>
        </div>

        {}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Notification Settings</h3>
          </div>

          {isLoadingNotifications ? <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-2"></div>
                <p className="text-sm">Loading notification settings...</p>
              </div>
            </div> : <div className="space-y-4">
              {}
              <div className="flex items-center justify-between gap-4 p-4 bg-beige rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Get updates via email</div>
                </div>
                <Button onClick={() => handleNotificationToggle('emailNotifications', !notificationSettings.emailNotifications)} disabled={updatingNotification === 'emailNotifications'} className={`min-w-[70px] h-9 rounded-full font-medium transition-colors ml-3 active:scale-[0.98] ${notificationSettings.emailNotifications ? 'bg-gold hover:bg-gold/90 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`} variant="outline">
                  {notificationSettings.emailNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>

              {}
              <div className="flex items-center justify-between gap-4 p-4 border border-border-subtle rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">In-app / Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive notifications on this device</div>
                </div>
                <Button onClick={() => handleNotificationToggle('pushNotifications', !notificationSettings.pushNotifications)} disabled={updatingNotification === 'pushNotifications'} className={`min-w-[70px] h-9 rounded-full font-medium transition-colors ml-3 active:scale-[0.98] ${notificationSettings.pushNotifications ? 'bg-gold hover:bg-gold/90 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`} variant="outline">
                  {notificationSettings.pushNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>

              {}
              <div className="flex items-center justify-between gap-4 p-4 border border-border-subtle rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive text messages</div>
                </div>
                <Button onClick={() => handleNotificationToggle('smsNotifications', !notificationSettings.smsNotifications)} disabled={updatingNotification === 'smsNotifications'} className={`min-w-[70px] h-9 rounded-full font-medium transition-colors ml-3 active:scale-[0.98] ${notificationSettings.smsNotifications ? 'bg-gold hover:bg-gold/90 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`} variant="outline">
                  {notificationSettings.smsNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>}
        </div>

        {}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Help & Support</h3>
          </div>

          <div className="space-y-3">
            
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => navigate('/dashboard/support')}>
              <Ticket className="w-4 h-4 mr-3" />
              Your Tickets
              {supportTickets.length > 0 && <Badge className="ml-auto bg-gold text-white">{supportTickets.length}</Badge>}
            </Button>

            {}
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => navigate('/dashboard/support')}>
              <MessageCircle className="w-4 h-4 mr-3" />
              Contact Support
              {supportTickets.length > 0 && <Badge className="ml-auto bg-gold text-white">{supportTickets.length}</Badge>}
            </Button>

            {}
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => toast.info('Opening FAQs...')}>
              <HelpCircle className="w-4 h-4 mr-3" />
              Frequently Asked Questions
            </Button>

            {}
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => toast.info('Opening terms & privacy...')}>
              <FileText className="w-4 h-4 mr-3" />
              Terms & Privacy Policy
            </Button>

            {}
            <div className="pt-3 border-t border-border-subtle">
              <Button variant="outline" className="w-full justify-start border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!border-red-accent hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 rounded-[12px] h-12 transition-all" onClick={() => setLogoutConfirmOpen(true)}>
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        
      </div>

      {}
      <ChangePasswordModal open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen} />

      {}
      <EditContactModal open={editContactModal.open} onOpenChange={open => setEditContactModal({
      open,
      type: editContactModal.type
    })} contactType={editContactModal.type} currentValue={editContactModal.type === 'email' ? userProfile?.email : userProfile?.phoneNumber} onSave={handleContactUpdate} />

      {}
      <BlockedUsersList open={blockedUsersModalOpen} onOpenChange={open => {
      setBlockedUsersModalOpen(open);
      if (!open) fetchBlockedCount();
    }} />

      {}
      <BlockUserDialog open={blockUserDialogOpen} onOpenChange={setBlockUserDialogOpen} onBlockSuccess={handleBlockSuccess} />

      {}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-[22px] p-0 gap-0 bg-white">
          <DialogHeader className="bg-gradient-to-br from-[#C8A227] via-[#D4A052] to-[#E4C48A] px-6 py-5 text-center text-white relative overflow-hidden rounded-t-[22px]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-white text-xl">Confirm Logout</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-6 bg-white">
            <DialogDescription className="text-center text-base mb-6 text-gray-700">
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </DialogDescription>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)} className="w-full sm:w-1/2 rounded-[12px] border-gray-300 hover:bg-gray-50">
                Cancel
              </Button>
              <Button onClick={async () => {
              setLogoutConfirmOpen(false);
              try {
                await logout();
                navigate('/login');
              } catch (error) {
                console.error('Logout error:', error);
              }
            }} className="w-full sm:w-1/2 bg-[#C8A227] hover:bg-[#D4A052] text-white rounded-[12px]">
                Yes, Logout
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent showClose={false} className="sm:max-w-[420px] max-w-[90vw] rounded-[20px] p-0 gap-0 bg-white border-2 border-red-200 shadow-2xl overflow-hidden mx-auto">
          <DialogHeader className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 text-center text-white relative overflow-hidden rounded-t-[18px]">
            <DialogClose className="absolute left-3 top-3 z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50">
              <span className="sr-only">Close</span>
              <span className="text-lg leading-none">×</span>
            </DialogClose>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                <UserX className="w-7 h-7 text-white" />
              </div>
              <DialogTitle className="text-white text-lg font-semibold">Deactivate Account</DialogTitle>
            </div>
          </DialogHeader>
          <div className="pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 bg-white max-h-[80vh] overflow-y-auto">
            <DialogDescription className="text-center text-sm mb-3 text-gray-600">
              Your account will be temporarily deactivated. You can reactivate it anytime by logging back in.
            </DialogDescription>
            
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Please tell us why</Label>
              <Textarea
                placeholder="Enter your reason..."
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="mt-1 rounded-[10px] border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 min-h-[80px] resize-none w-full text-sm"
                disabled={isDeactivating}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeactivateDialogOpen(false);
                  setDeactivateReason('');
                }} 
                className="w-full sm:w-1/2 rounded-[10px] border-2 border-gray-300 hover:bg-gray-50 h-10 text-sm"
                disabled={isDeactivating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeactivateAccount}
                disabled={isDeactivating || !deactivateReason.trim()}
                className="w-full sm:w-1/2 bg-transparent border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed h-10 text-sm"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showClose={false} className="sm:max-w-[420px] max-w-[90vw] rounded-[20px] p-0 gap-0 bg-white border-2 border-red-600 shadow-2xl overflow-hidden mx-auto">
          <DialogHeader className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 text-center text-white relative overflow-hidden rounded-t-[18px]">
            <DialogClose className="absolute left-3 top-3 z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50">
              <span className="sr-only">Close</span>
              <span className="text-lg leading-none">×</span>
            </DialogClose>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-7 h-7 text-white" />
              </div>
              <DialogTitle className="text-white text-lg font-semibold">Delete Account</DialogTitle>
            </div>
          </DialogHeader>
          <div className="pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 bg-white max-h-[80vh] overflow-y-auto">
            <DialogDescription className="text-center text-sm mb-3 text-gray-600">
              <span className="font-semibold text-red-600">Warning:</span> This action is permanent and cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
            
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Please tell us why</Label>
              <Textarea
                placeholder="Enter your reason..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 rounded-[10px] border-2 border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-200 min-h-[80px] resize-none w-full text-sm"
                disabled={isDeleting}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteReason('');
                }} 
                className="w-full sm:w-1/2 rounded-[10px] border-2 border-gray-300 hover:bg-gray-50 h-10 text-sm"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deleteReason.trim()}
                className="w-full sm:w-1/2 bg-red-600 hover:bg-red-700 text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed h-10 text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Ticket Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={(open) => {
        setSupportDialogOpen(open);
        if (!open) {
          setSelectedTicket(null);
          setTicketSubject('');
          setTicketMessage('');
          setTicketCategory('general');
          setReplyMessage('');
        }
      }}>
        <DialogContent 
          className={`${selectedTicket ? 'sm:max-w-[480px]' : 'sm:max-w-[850px]'} max-w-[90vw] ${selectedTicket ? 'h-[80vh]' : 'h-[85vh]'} rounded-[20px] p-0 gap-0 bg-white border-2 border-gold/30 shadow-2xl overflow-hidden flex flex-col`}
          showClose={false}
        >
          <DialogHeader className="bg-gradient-to-br from-[#C8A227] via-[#D4A052] to-[#E4C48A] px-4 py-3 text-white relative overflow-hidden rounded-t-[18px] shrink-0 border-b-2 border-gold/40">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <DialogTitle className="text-white text-base font-semibold m-0">
                  {selectedTicket ? 'Support Chat' : 'Help & Support'}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedTicket && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20 h-8 px-2.5 rounded-lg text-sm"
                    onClick={() => setSelectedTicket(null)}
                  >
                    ← Back
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-lg"
                  onClick={() => setSupportDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex bg-white min-h-0">
            {!selectedTicket ? (
              // Ticket List View
              <div className="flex-1 flex flex-col min-h-0 w-full">
                {/* Create New Ticket Form */}
                <div className="p-3 border-b border-gray-200 bg-gray-50 shrink-0">
                  <h4 className="font-semibold mb-2 text-gray-800 text-sm">Create New Ticket</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Subject"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="rounded-[8px] border border-gray-300 h-9 text-sm focus:border-gold"
                        disabled={isCreatingTicket}
                      />
                      <Select value={ticketCategory} onValueChange={setTicketCategory} disabled={isCreatingTicket}>
                        <SelectTrigger className="rounded-[8px] border border-gray-300 h-9 text-sm focus:border-gold">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Describe your issue..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="rounded-[8px] border border-gray-300 min-h-[60px] resize-none text-sm focus:border-gold"
                      disabled={isCreatingTicket}
                    />
                    <Button 
                      onClick={handleCreateTicket}
                      disabled={isCreatingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                      className="w-full bg-gold hover:bg-gold/90 text-white rounded-[8px] h-9 font-medium text-sm"
                    >
                      {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                  <h4 className="font-semibold mb-2.5 text-gray-800 text-sm">Your Tickets</h4>
                  {isLoadingTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-gold"></div>
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Ticket className="w-16 h-16 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No support tickets yet</p>
                      <p className="text-sm mt-1">Create your first ticket above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supportTickets.map((ticket) => (
                        <div
                          key={ticket._id || ticket.id}
                          className="p-4 border-2 border-gray-200 rounded-[12px] hover:border-gold hover:shadow-md cursor-pointer transition-all bg-white"
                          onClick={() => handleSelectTicket(ticket)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-800 flex-1 pr-2 text-base">{ticket.subject}</h5>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description || ticket.message}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="capitalize px-2 py-1 bg-gray-100 rounded">{ticket.category}</span>
                            <span>•</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            {ticket.messages && ticket.messages.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{ticket.messages.length} messages</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Chat View */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Ticket Info */}
                <div className="p-3 bg-gray-50 border-b border-gray-200 shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{selectedTicket.subject}</h3>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">Category: {selectedTicket.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-gold/30 hover:bg-gold/10"
                        onClick={refreshCurrentTicket}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </Button>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2.5">
                  {/* Initial Message */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{selectedTicket.description || selectedTicket.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You • {new Date(selectedTicket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.sender === 'admin' ? 'bg-blue-100' : 'bg-gold/20'
                      }`}>
                        {msg.sender === 'admin' ? (
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`rounded-lg p-2.5 border shadow-sm ${
                          msg.sender === 'admin' 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-gray-200'
                        }`}>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.text || msg.message}</p>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'admin' ? 'text-right' : ''}`}>
                          {msg.sender === 'admin' ? 'Support Team' : 'You'} • {new Date(msg.createdAt || msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                {selectedTicket.status === 'closed' ? (
                  <div className="p-3 border-t border-gray-200 bg-gray-50 text-center shrink-0">
                    <p className="text-sm text-gray-600">This ticket is closed and cannot receive replies</p>
                  </div>
                ) : (
                  <div className="p-3 border-t border-gray-200 bg-white shrink-0">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 text-sm border-gray-300 focus:border-gold focus:ring-gold min-h-[50px] max-h-[90px] resize-none"
                        disabled={isSendingReply}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyMessage.trim()}
                        className="bg-gold hover:bg-gold/90 text-white h-[50px] w-11 p-0 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">Press Enter to send, Shift+Enter for new line</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Your Tickets Dialog - Conversation Only */}
      <Dialog open={yourTicketsDialogOpen} onOpenChange={(open) => {
        setYourTicketsDialogOpen(open);
        if (!open) {
          setSelectedTicket(null);
          setReplyMessage('');
        }
      }}>
        <DialogContent 
          className={`${selectedTicket ? 'sm:max-w-[480px]' : 'sm:max-w-[650px]'} max-w-[90vw] h-[80vh] rounded-[20px] p-0 gap-0 bg-white border-2 border-gold/30 shadow-2xl overflow-hidden flex flex-col`}
          showClose={false}
        >
          <DialogHeader className="bg-gradient-to-br from-[#C8A227] via-[#D4A052] to-[#E4C48A] px-4 py-3 text-white relative overflow-hidden rounded-t-[18px] shrink-0 border-b-2 border-gold/40">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <DialogTitle className="text-white text-base font-semibold m-0">
                  {selectedTicket ? 'Ticket Conversation' : 'Your Tickets'}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedTicket && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20 h-8 px-2.5 rounded-lg text-sm"
                    onClick={() => setSelectedTicket(null)}
                  >
                    ← Back
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-lg"
                  onClick={() => setYourTicketsDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex bg-white min-h-0">
            {!selectedTicket ? (
              // Ticket List View Only
              <div className="flex-1 flex flex-col min-h-0 w-full">
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-800 text-base m-0">All Support Tickets</h4>
                    <Button 
                      size="sm"
                      className="bg-gold hover:bg-gold/90 text-white rounded-lg h-9"
                      onClick={() => {
                        setYourTicketsDialogOpen(false);
                        setSupportDialogOpen(true);
                      }}
                    >
                      Create New Ticket
                    </Button>
                  </div>
                  
                  {isLoadingTickets ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-gold"></div>
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Ticket className="w-20 h-20 mx-auto mb-4 opacity-20" />
                      <p className="font-medium text-lg mb-2">No Support Tickets</p>
                      <p className="text-sm mb-4">You haven't created any support tickets yet</p>
                      <Button 
                        className="bg-gold hover:bg-gold/90 text-white rounded-lg"
                        onClick={() => {
                          setYourTicketsDialogOpen(false);
                          setSupportDialogOpen(true);
                        }}
                      >
                        Create Your First Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supportTickets.map((ticket) => (
                        <div
                          key={ticket._id || ticket.id}
                          className="p-4 border-2 border-gray-200 rounded-[12px] hover:border-gold hover:shadow-md cursor-pointer transition-all bg-white"
                          onClick={() => handleSelectTicket(ticket)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-800 flex-1 pr-2 text-base">{ticket.subject}</h5>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description || ticket.message}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="capitalize px-2 py-1 bg-gray-100 rounded">{ticket.category}</span>
                            <span>•</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            {ticket.messages && ticket.messages.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-medium">{ticket.messages.length} messages</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Chat View - Same as Support Dialog */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Ticket Info */}
                <div className="p-3 bg-gray-50 border-b border-gray-200 shrink-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{selectedTicket.subject}</h3>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">Category: {selectedTicket.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-gold/30 hover:bg-gold/10"
                        onClick={refreshCurrentTicket}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </Button>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2.5">
                  {/* Initial Message */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{selectedTicket.description || selectedTicket.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You • {new Date(selectedTicket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.sender === 'admin' ? 'bg-blue-100' : 'bg-gold/20'
                      }`}>
                        {msg.sender === 'admin' ? (
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`rounded-lg p-2.5 border shadow-sm ${
                          msg.sender === 'admin' 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-gray-200'
                        }`}>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.text || msg.message}</p>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'admin' ? 'text-right' : ''}`}>
                          {msg.sender === 'admin' ? 'Support Team' : 'You'} • {new Date(msg.createdAt || msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                {selectedTicket.status === 'closed' ? (
                  <div className="p-3 border-t border-gray-200 bg-gray-50 text-center shrink-0">
                    <p className="text-sm text-gray-600">This ticket is closed and cannot receive replies</p>
                  </div>
                ) : (
                  <div className="p-3 border-t border-gray-200 bg-white shrink-0">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 text-sm border-gray-300 focus:border-gold focus:ring-gold min-h-[50px] max-h-[90px] resize-none"
                        disabled={isSendingReply}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyMessage.trim()}
                        className="bg-gold hover:bg-gold/90 text-white h-[50px] w-11 p-0 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">Press Enter to send, Shift+Enter for new line</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}