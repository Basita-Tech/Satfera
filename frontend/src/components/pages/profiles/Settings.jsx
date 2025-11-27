import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button'
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';
import { Badge } from '../../ui/badge';
import { ChangePasswordModal } from '../../ChangePasswordModal';
import { EditContactModal } from '../../EditContactModal';
import { BlockedUsersList } from '../../BlockedUsersList';
import { BlockUserDialog } from '../../BlockUserDialog';
import { getUserProfileDetails, getBlockedUsers, getNotificationSettings, updateNotificationSettings, getUserContactInfo } from '../../../api/auth';
import { AuthContextr } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import { 
  User, 
  Lock, 
  Shield, 
  Heart, 
  Bell, 
  Crown, 
  LogOut,
  Mail,
  Phone,
  Trash2,
  UserX,
  Monitor,
  CreditCard,
  HelpCircle,
  MessageCircle,
  FileText,
} from 'lucide-react';

export function Settings() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContextr);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [editContactModal, setEditContactModal] = useState({ open: false, type: null });
  const [blockedUsersModalOpen, setBlockedUsersModalOpen] = useState(false);
  const [blockUserDialogOpen, setBlockUserDialogOpen] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [contactInfo, setContactInfo] = useState({ email: '', phoneNumber: '' });
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
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
    heightRange: [160, 180],
  });

  useEffect(() => {
    fetchUserProfile();
    fetchBlockedCount();
    fetchNotificationSettings();
    fetchContactInfo();
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
      console.log('🔍 Blocked count API response:', response);
      
      // Backend returns: { success: true, data: [...] }
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

  const fetchNotificationSettings = async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await getNotificationSettings();
      console.log('🔍 Notification settings API response:', response);
      
      // Backend returns: { success: true, data: { emailNotifications, pushNotifications, smsNotifications } }
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
      console.log('📧 Contact info API response:', response);
      
      // Backend returns: { success: true, data: { email, phoneNumber } }
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
    
    // Optimistically update UI
    setNotificationSettings(prev => ({
      ...prev,
      [settingKey]: value
    }));
    
    setUpdatingNotification(settingKey);
    
    try {
      // Send only the changed field to the API
      const response = await updateNotificationSettings({ [settingKey]: value });
      
      if (response?.success) {
        toast.success('Notification setting updated');
        // Update with server response to ensure consistency
        if (response?.data) {
          setNotificationSettings(response.data);
        }
      } else {
        // Revert on failure
        setNotificationSettings(prev => ({
          ...prev,
          [settingKey]: previousValue
        }));
        toast.error(response?.message || 'Failed to update notification setting');
      }
    } catch (error) {
      // Revert on error
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

  const handleContactUpdate = (newValue) => {
    setUserProfile(prev => ({
      ...prev,
      [editContactModal.type === 'email' ? 'email' : 'phoneNumber']: newValue
    }));
    fetchUserProfile();
    fetchContactInfo(); // Refresh contact info after update
  };

  const recentDevices = [
    { device: 'Chrome on Windows', location: 'Mumbai, India', time: '2 hours ago', current: true },
    { device: 'Safari on iPhone', location: 'Mumbai, India', time: '1 day ago', current: false },
    { device: 'Chrome on Android', location: 'Delhi, India', time: '3 days ago', current: false },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="mb-6">
        <h2 className="mb-2 m-0">Settings</h2>
        <p className="text-muted-foreground m-0">Manage your account preferences and privacy settings</p>
      </div>

      <div className="space-y-6">
        
        {/* Account Settings */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Account Settings</h3>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => navigate('/dashboard/edit-profile')}
            >
              <User className="w-4 h-4 mr-3" />
              Edit Profile
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => setIsChangePasswordModalOpen(true)}
            >
              <Lock className="w-4 h-4 mr-3" />
              Change Password
            </Button>

            {/* Contact Details */}
            <div className="border border-border-subtle rounded-[12px] p-4">
              <h4 className="mb-3">Manage Contact Details</h4>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Email Address</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={isLoadingContact ? 'Loading...' : contactInfo?.email || 'Not provided'}
                      readOnly
                      className="rounded-[12px] border-border-subtle bg-beige"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-[12px] border-border-subtle whitespace-nowrap"
                      onClick={() => setEditContactModal({ open: true, type: 'email' })}
                      disabled={isLoadingContact}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Mobile Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={isLoadingContact ? 'Loading...' : contactInfo?.phoneNumber || 'Not provided'}
                      readOnly
                      className="rounded-[12px] border-border-subtle bg-beige"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-[12px] border-border-subtle whitespace-nowrap"
                      onClick={() => setEditContactModal({ open: true, type: 'phone' })}
                      disabled={isLoadingContact}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Deactivate / Delete */}
            <div className="pt-4 border-t border-border-subtle space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-red-accent/50 text-red-accent hover:bg-red-50 rounded-[12px] h-12"
                onClick={() => toast.error('Deactivate account confirmation would appear')}
              >
                <UserX className="w-4 h-4 mr-3" />
                Deactivate Account
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-red-accent text-red-accent hover:bg-red-accent hover:text-white rounded-[12px] h-12"
                onClick={() => toast.error('Delete account confirmation would appear')}
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy & Safety */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Privacy & Safety</h3>
          </div>

          <div className="space-y-6">
            
            {/* Block User Button */}
            <Button
              variant="outline"
              className="w-full justify-start border-red-accent/50 text-red-accent hover:bg-red-50 rounded-[12px] h-12"
              onClick={() => setBlockUserDialogOpen(true)}
            >
              <UserX className="w-4 h-4 mr-3" />
              Block a User
            </Button>

            {/* Blocked users */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => setBlockedUsersModalOpen(true)}
            >
              <UserX className="w-4 h-4 mr-3" />
              Blocked Users List ({blockedCount})
            </Button>

            {/* Report */}
            <Button
              variant="outline"
              className="w-full justify-start border-red-accent/50 text-red-accent hover:bg-red-50 rounded-[12px] h-12"
              onClick={() => toast.info('Report profile form would open')}
            >
              <Shield className="w-4 h-4 mr-3" />
              Report a Profile
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Notification Settings</h3>
          </div>

          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-2"></div>
                <p className="text-sm">Loading notification settings...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between p-4 bg-beige rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Get updates via email</div>
                </div>
                <Button
                  onClick={() => handleNotificationToggle('emailNotifications', !notificationSettings.emailNotifications)}
                  disabled={updatingNotification === 'emailNotifications'}
                  className={`min-w-[70px] h-9 rounded-[8px] font-medium transition-all ${
                    notificationSettings.emailNotifications 
                      ? 'bg-gold hover:bg-gold/90 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  variant="outline"
                >
                  {notificationSettings.emailNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>

              {/* Push */}
              <div className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">In-app / Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive notifications on this device</div>
                </div>
                <Button
                  onClick={() => handleNotificationToggle('pushNotifications', !notificationSettings.pushNotifications)}
                  disabled={updatingNotification === 'pushNotifications'}
                  className={`min-w-[70px] h-9 rounded-[8px] font-medium transition-all ${
                    notificationSettings.pushNotifications 
                      ? 'bg-gold hover:bg-gold/90 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  variant="outline"
                >
                  {notificationSettings.pushNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>

              {/* SMS */}
              <div className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px]">
                <div className="flex-1">
                  <div className="font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive text messages</div>
                </div>
                <Button
                  onClick={() => handleNotificationToggle('smsNotifications', !notificationSettings.smsNotifications)}
                  disabled={updatingNotification === 'smsNotifications'}
                  className={`min-w-[70px] h-9 rounded-[8px] font-medium transition-all ${
                    notificationSettings.smsNotifications 
                      ? 'bg-gold hover:bg-gold/90 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  variant="outline"
                >
                  {notificationSettings.smsNotifications ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>
          )}
        </div>

      

       
        {/* Help & Support */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Help & Support</h3>
          </div>

          <div className="space-y-3">
            {/* Contact Support */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle hover:bg-beige rounded-[12px] h-12"
              onClick={() => toast.info('Opening contact support...')}
            >
              <MessageCircle className="w-4 h-4 mr-3" />
              Contact Support
            </Button>

            {/* FAQs */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle hover:bg-beige rounded-[12px] h-12"
              onClick={() => toast.info('Opening FAQs...')}
            >
              <HelpCircle className="w-4 h-4 mr-3" />
              Frequently Asked Questions
            </Button>

            {/* Terms & Privacy */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle hover:bg-beige rounded-[12px] h-12"
              onClick={() => toast.info('Opening terms & privacy...')}
            >
              <FileText className="w-4 h-4 mr-3" />
              Terms & Privacy Policy
            </Button>

            {/* Logout Button */}
            <div className="pt-3 border-t border-border-subtle">
              <Button
                variant="outline"
                className="w-full justify-start border-red-accent/50 text-red-accent hover:bg-red-50 hover:border-red-accent rounded-[12px] h-12"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    try {
                      await logout();
                      toast.success('Logged out successfully');
                      navigate('/login');
                    } catch (error) {
                      console.error('Logout error:', error);
                      toast.error('Logout failed');
                    }
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={isChangePasswordModalOpen} 
        onOpenChange={setIsChangePasswordModalOpen} 
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        open={editContactModal.open}
        onOpenChange={(open) => setEditContactModal({ open, type: editContactModal.type })}
        contactType={editContactModal.type}
        currentValue={
          editContactModal.type === 'email' 
            ? userProfile?.email 
            : userProfile?.phoneNumber
        }
        onSave={handleContactUpdate}
      />

      {/* Blocked Users Modal */}
      <BlockedUsersList
        open={blockedUsersModalOpen}
        onOpenChange={(open) => {
          setBlockedUsersModalOpen(open);
          if (!open) fetchBlockedCount(); // Refresh count when modal closes
        }}
      />

      {/* Block User Dialog */}
      <BlockUserDialog
        open={blockUserDialogOpen}
        onOpenChange={setBlockUserDialogOpen}
        onBlockSuccess={fetchBlockedCount}
      />
    </div>
  );
}


