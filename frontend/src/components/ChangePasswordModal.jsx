import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { changePassword } from '../api/auth';

export function ChangePasswordModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Old password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.oldPassword && formData.newPassword && formData.oldPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from old password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      
      try {
        const response = await changePassword(
          formData.oldPassword,
          formData.newPassword,
          formData.confirmPassword
        );
        
        if (response.success) {
          toast.success(response.message || 'Password changed successfully');
          
          // Reset form
          setFormData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          
          // Close modal
          onOpenChange(false);
        } else {
          toast.error(response.message || 'Failed to change password');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
        toast.error(errorMessage);
        
        // If old password is wrong, set error for that field
        if (errorMessage.toLowerCase().includes('old password') || 
            errorMessage.toLowerCase().includes('incorrect password')) {
          setErrors({ oldPassword: errorMessage });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[20px] p-0 max-h-[80vh] !top-[52%] my-12 mx-4 overflow-y-auto bg-white gap-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-gold via-gold/90 to-gold/80 px-8 py-6 text-center text-white relative overflow-hidden rounded-t-[20px] border-b border-gold/20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Change Password</DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-sm mt-1">
              Keep your account secure with a strong password
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Old Password */}
          <div className="space-y-2">
            <Label htmlFor="oldPassword" className="text-sm font-medium">
              Old Password
            </Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showPasswords.oldPassword ? 'text' : 'password'}
                value={formData.oldPassword}
                onChange={(e) => handleChange('oldPassword', e.target.value)}
                placeholder="Enter your old password"
                className={`rounded-[12px] border-border-subtle pr-10 ${
                  errors.oldPassword ? 'border-red-accent' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('oldPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.oldPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="text-xs text-red-accent">{errors.oldPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.newPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                placeholder="Enter your new password"
                className={`rounded-[12px] border-border-subtle pr-10 ${
                  errors.newPassword ? 'border-red-accent' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('newPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.newPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-accent">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Confirm your new password"
                className={`rounded-[12px] border-border-subtle pr-10 ${
                  errors.confirmPassword ? 'border-red-accent' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.confirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-accent">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-beige rounded-[12px] p-4">
            <p className="text-xs font-medium mb-2">Password Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Must be different from old password</li>
              <li>• Use a mix of letters, numbers, and symbols</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 rounded-[12px] border-border-subtle h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gold hover:bg-gold/90 text-white rounded-[12px] h-11"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
