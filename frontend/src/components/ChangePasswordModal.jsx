import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { changePassword } from '../api/auth';
export function ChangePasswordModal({
  open,
  onOpenChange
}) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      setShowRequirements(false);
      setShowPasswords({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
      });
    }
  }, [open]);
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
  const handleSubmit = async e => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      try {
        const response = await changePassword(formData.oldPassword, formData.newPassword, formData.confirmPassword);
        if (response.success) {
          toast.success(response.message || 'Password changed successfully');
          setFormData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          onOpenChange(false);
        } else {
          toast.error(response.message || 'Failed to change password');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
        toast.error(errorMessage);
        if (errorMessage.toLowerCase().includes('old password') || errorMessage.toLowerCase().includes('incorrect password')) {
          setErrors({
            oldPassword: errorMessage
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    // Show requirements when typing in new password field
    if (field === 'newPassword') {
      setShowRequirements(value.length > 0);
    }
  };
  const togglePasswordVisibility = field => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  const hasMinLength = formData.newPassword.length >= 8;
  const isDifferentFromOld = !!(formData.oldPassword && formData.newPassword && formData.oldPassword !== formData.newPassword);
  const hasLetter = /[A-Za-z]/.test(formData.newPassword);
  const hasNumber = /\d/.test(formData.newPassword);
  const hasSymbol = /[@$!%*?&#_]/.test(formData.newPassword);
  const hasMix = hasLetter && hasNumber && hasSymbol;
    return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="sm:max-w-[420px] max-w-[90vw] rounded-[20px] p-0 sm:max-h-[90vh] max-h-[95vh] mx-auto my-6 sm:my-10 overflow-hidden bg-white gap-0 shadow-2xl border-2 border-border-subtle flex flex-col">
        {}
        <div className="bg-gradient-to-br from-gold via-gold/90 to-gold/80 px-4 sm:px-5 py-4 sm:py-5 text-center text-white relative overflow-hidden rounded-t-[18px] border-b border-gold/20 flex-shrink-0">
          <DialogClose className="absolute left-3 top-3 z-50 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50">
            <span className="sr-only">Close</span>
            <span className="text-lg leading-none">×</span>
          </DialogClose>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-white text-lg">Change Password</DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-xs mt-1">
              Keep your account secure
            </p>
          </div>
        </div>

        {}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4 space-y-3 bg-white flex-1 overflow-y-auto">
          {}
          <div className="space-y-1.5">
            <Label htmlFor="oldPassword" className="text-xs font-medium">
              Old Password
            </Label>
            <div className="relative bg-white rounded-[12px] border border-border-subtle">
              <Input id="oldPassword" type={showPasswords.oldPassword ? 'text' : 'password'} value={formData.oldPassword} onChange={e => handleChange('oldPassword', e.target.value)} placeholder="Enter your old password" className={`rounded-[12px] pr-12 bg-transparent border-transparent text-foreground placeholder:text-muted-foreground h-10 ${errors.oldPassword ? 'border-red-accent' : ''}`} />
              <button type="button" onClick={() => togglePasswordVisibility('oldPassword')} className="absolute w-11 right-0 top-0 bottom-0 flex justify-center items-center text-gold hover:text-gold/90 transition-colors bg-transparent border-0 p-0" tabIndex={-1}>
                {showPasswords.oldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.oldPassword && <p className="text-xs text-red-accent">{errors.oldPassword}</p>}
          </div>

          {}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative bg-white rounded-[12px] border border-border-subtle">
              <Input 
                id="newPassword" 
                type={showPasswords.newPassword ? 'text' : 'password'} 
                value={formData.newPassword} 
                onChange={e => handleChange('newPassword', e.target.value)} 
                onFocus={() => setShowRequirements(true)}
                onBlur={() => setShowRequirements(false)}
                placeholder="Enter your new password" 
                className={`rounded-[12px] pr-12 bg-transparent border-transparent text-foreground placeholder:text-muted-foreground h-10 ${errors.newPassword ? 'border-red-accent' : ''}`} 
              />
              <button type="button" onClick={() => togglePasswordVisibility('newPassword')} className="absolute w-11 right-0 top-0 bottom-0 flex justify-center items-center text-gold hover:text-gold/90 transition-colors bg-transparent border-0 p-0" tabIndex={-1}>
                {showPasswords.newPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-accent">{errors.newPassword}</p>}
            
            {}
            {showRequirements && (
              <div className="bg-beige rounded-[10px] p-2.5 mt-1.5">
                <p className="text-[10px] font-medium mb-1">Password Requirements:</p>
                <ul className="text-[10px] space-y-0.5">
                  <li className={hasMinLength ? 'text-green-600' : 'text-red-500'}>• At least 8 characters long</li>
                  <li className={isDifferentFromOld ? 'text-green-600' : 'text-red-500'}>• Must be different from old password</li>
                  <li className={hasMix ? 'text-green-600' : 'text-red-500'}>• Use a mix of letters, numbers, and symbols</li>
                </ul>
              </div>
            )}
          </div>

          {}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <div className="relative bg-white rounded-[12px] border border-border-subtle">
              <Input id="confirmPassword" type={showPasswords.confirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={e => handleChange('confirmPassword', e.target.value)} placeholder="Confirm your new password" className={`rounded-[12px] pr-12 bg-transparent border-transparent text-foreground placeholder:text-muted-foreground h-10 ${errors.confirmPassword ? 'border-red-accent' : ''}`} />
              <button type="button" onClick={() => togglePasswordVisibility('confirmPassword')} className="absolute w-11 right-0 top-0 bottom-0 flex justify-center items-center text-gold hover:text-gold/90 transition-colors bg-transparent border-0 p-0" tabIndex={-1}>
                {showPasswords.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>

          {}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1 rounded-[12px] border-border-subtle h-10 sm:w-auto w-full text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-gold hover:bg-gold/90 text-white rounded-[12px] h-10 sm:w-auto w-full text-sm">
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
}