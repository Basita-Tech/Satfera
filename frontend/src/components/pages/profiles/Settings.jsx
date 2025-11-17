import { useState } from 'react';
import { Button } from '../../ui/button'
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';

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
} from 'lucide-react';

import { toast } from 'sonner';

export function Settings() {
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

  const handleSave = () => {
    toast.success('Settings saved successfully');
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
              onClick={() => toast.info('Edit Profile page would open')}
            >
              <User className="w-4 h-4 mr-3" />
              Edit Profile
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => toast.info('Change Password modal would open')}
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
                      value="rajesh.kumar@email.com"
                      readOnly
                      className="rounded-[12px] border-border-subtle bg-beige"
                    />
                    <Button variant="outline" className="rounded-[12px] border-border-subtle">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Mobile Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value="+91 98765 43210"
                      readOnly
                      className="rounded-[12px] border-border-subtle bg-beige"
                    />
                    <Button variant="outline" className="rounded-[12px] border-border-subtle">
                      <Phone className="w-4 h-4" />
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
            
            {/* Profile visibility */}
            <div>
              <Label className="mb-3 block">Who can see my profile</Label>
              <Select
                value={settings.profileVisibility}
                onValueChange={(value) => setSettings({ ...settings, profileVisibility: value })}
              >
                <SelectTrigger className="rounded-[12px] border-border-subtle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="verified">Only Verified Users</SelectItem>
                  <SelectItem value="accepted">Only Profiles I Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hide search */}
            <div className="flex items-center justify-between p-4 bg-beige rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Hide my profile from public search</div>
                <div className="text-sm text-muted-foreground">Only people with direct link can view</div>
              </div>
              <Switch
                checked={settings.hideFromSearch}
                onCheckedChange={(checked) => setSettings({ ...settings, hideFromSearch: checked })}
              />
            </div>

            {/* Blocked users */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => toast.info('Blocked users list would open')}
            >
              <UserX className="w-4 h-4 mr-3" />
              Blocked Users List (0)
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

        {/* Match Preferences */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Match Preferences</h3>
          </div>

          <div className="space-y-6">
            
            {/* Age Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Age Range</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.ageRange[0]} - {settings.ageRange[1]} years
                </span>
              </div>
              <Slider
                min={18}
                max={60}
                step={1}
                value={settings.ageRange}
                onValueChange={(value) => setSettings({ ...settings, ageRange: value })}
                className="py-2"
              />
            </div>

            {/* Height Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Height Range</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.heightRange[0]} - {settings.heightRange[1]} cm
                </span>
              </div>
              <Slider
                min={140}
                max={210}
                step={1}
                value={settings.heightRange}
                onValueChange={(value) => setSettings({ ...settings, heightRange: value })}
                className="py-2"
              />
            </div>

            {/* Religion */}
            <div>
              <Label className="mb-3 block">Religion</Label>
              <Select>
                <SelectTrigger className="rounded-[12px] border-border-subtle">
                  <SelectValue placeholder="Select preferred religion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="hindu">Hindu</SelectItem>
                  <SelectItem value="muslim">Muslim</SelectItem>
                  <SelectItem value="christian">Christian</SelectItem>
                  <SelectItem value="sikh">Sikh</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label className="mb-3 block">Location</Label>
              <Input 
                placeholder="Enter preferred city or country"
                className="rounded-[12px] border-border-subtle"
              />
            </div>

            {/* Verified Filter */}
            <div className="flex items-center justify-between p-4 bg-beige rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Show only verified profiles</div>
                <div className="text-sm text-muted-foreground">Filter out unverified accounts</div>
              </div>
              <Switch
                checked={settings.showVerifiedOnly}
                onCheckedChange={(checked) => setSettings({ ...settings, showVerifiedOnly: checked })}
              />
            </div>

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

          <div className="space-y-4">
            {/* Push */}
            <div className="flex items-center justify-between p-4 bg-beige rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive notifications on this device</div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-muted-foreground">Get updates via email</div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">SMS Alerts</div>
                <div className="text-sm text-muted-foreground">Receive text messages</div>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
              />
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-gradient-to-br from-gold/10 via-gold/5 to-transparent rounded-[20px] p-6 border border-gold/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h3 className="m-0">Subscription & Premium</h3>
          </div>

          <div className="space-y-4">
            {/* Current Plan */}
            <div className="bg-white rounded-[16px] p-4 border border-gold/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Plan</span>
                <Badge className="bg-beige text-[#222222] border-border-subtle">Basic</Badge>
              </div>
              <p className="text-sm text-muted-foreground m-0">
                Upgrade to unlock premium features
              </p>
            </div>

            <Button
              className="w-full bg-gold hover:bg-gold/90 text-white rounded-[12px] h-12 flex items-center justify-center gap-2"
              onClick={() => toast.info('Premium upgrade page would open')}
            >
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </Button>

            {/* Billing history */}
            <Button
              variant="outline"
              className="w-full justify-start border-border-subtle rounded-[12px] h-12"
              onClick={() => toast.info('Billing history would open')}
            >
              <CreditCard className="w-4 h-4 mr-3" />
              Billing History
            </Button>

            {/* Auto Renew */}
            <div className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Auto-renew Subscription</div>
                <div className="text-sm text-muted-foreground">
                  Automatically renew when plan expires
                </div>
              </div>
              <Switch
                checked={settings.autoRenew}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRenew: checked })}
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-[20px] p-6 satfera-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gold" />
            </div>
            <h3 className="m-0">Security</h3>
          </div>

          <div className="space-y-6">
            
            {/* 2FA */}
            <div className="flex items-center justify-between p-4 bg-beige rounded-[12px]">
              <div className="flex-1">
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">Add extra layer of security</div>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => {
                  setSettings({ ...settings, twoFactorAuth: checked });
                  toast.success(checked ? '2FA enabled' : '2FA disabled');
                }}
              />
            </div>

            {/* Devices */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="m-0">Recent Login Activity</h4>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[8px] border-red-accent text-red-accent hover:bg-red-accent hover:text-white"
                  onClick={() => toast.success('Logged out from all other devices')}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout All
                </Button>
              </div>

              <div className="space-y-3">
                {recentDevices.map((device, idx) => (
                  <div key={idx} className="flex items-start justify-between p-4 border border-border-subtle rounded-[12px]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-beige flex items-center justify-center mt-1">
                        <Monitor className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {device.device}
                          {device.current && (
                            <Badge className="bg-gold/10 text-gold border-gold/20 text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{device.location}</div>
                        <div className="text-xs text-muted-foreground">{device.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex gap-3 sticky bottom-4 bg-white rounded-[16px] p-4 satfera-shadow">
          <Button
            onClick={handleSave}
            className="flex-1 bg-gold hover:bg-gold/90 text-white rounded-[12px] h-12"
          >
            Save Settings
          </Button>

          <Button
            variant="outline"
            className="flex-1 border-border-subtle rounded-[12px] h-12"
            onClick={() => toast.info('Settings reset to default')}
          >
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 ${className}`}>
      {children}
    </span>
  );
}
