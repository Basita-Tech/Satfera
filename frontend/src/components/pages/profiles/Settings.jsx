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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { getUserProfileDetails, getBlockedUsers, getNotificationSettings, updateNotificationSettings, getUserContactInfo, getSessions, logoutSession, logoutAllSessions } from '../../../api/auth';
import { AuthContextr } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Lock, Shield, Heart, Bell, Crown, LogOut, Mail, Phone, Trash2, UserX, Monitor, CreditCard, HelpCircle, MessageCircle, FileText } from 'lucide-react';
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
  }, []);
  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await getUserProfileDetails(false);
      if (response?.success && response?.data) {
        setUserProfile(response.data);
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
        <h2 className="mb-2 m-0">Settings</h2>
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
              <Button variant="outline" className="w-full justify-start border-red-accent/50 text-red-accent hover:!bg-red-50 hover:!text-red-600 active:!bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300 rounded-[12px] h-12 transition-all" onClick={() => toast.error('Deactivate account confirmation would appear')}>
                <UserX className="w-4 h-4 mr-3" />
                Deactivate Account
              </Button>

              <Button variant="outline" className="w-full justify-start border-red-accent text-red-accent hover:!bg-red-600 hover:!text-white hover:!border-red-600 active:!bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 rounded-[12px] h-12 transition-all" onClick={() => toast.error('Delete account confirmation would appear')}>
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
            {}
            <Button variant="outline" className="w-full justify-start border-border-subtle rounded-[12px] h-12 hover:!bg-[#C8A227]/10 hover:!border-[#C8A227] hover:!text-[#222222] active:!bg-[#C8A227]/30 focus-visible:ring-2 focus-visible:ring-[#C8A227]/50 transition-all" onClick={() => toast.info('Opening contact support...')}>
              <MessageCircle className="w-4 h-4 mr-3" />
              Contact Support
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
    </div>;
}