import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { requestEmailChange, verifyEmailChange, requestPhoneChange, verifyPhoneChange } from '../api/auth';
export function EditContactModal({
  open,
  onOpenChange,
  contactType,
  currentValue,
  onSave
}) {
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setValue(currentValue || '');
      setOtp('');
      setIsOtpSent(false);
      setError('');
      setCountdown(0);
    }
  }, [open, currentValue]);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  const validateInput = () => {
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setError('Please enter a valid email address');
        return false;
      }
    } else if (contactType === 'phone') {
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        setError('Please enter a valid phone number');
        return false;
      }
    }
    setError('');
    return true;
  };
  const handleSendOtp = async () => {
    if (!validateInput()) return;
    setIsLoading(true);
    try {
      let response;
      if (contactType === 'email') {
        response = await requestEmailChange(value);
      } else if (contactType === 'phone') {
        response = await requestPhoneChange(value);
      }
      if (response?.success) {
        setIsOtpSent(true);
        setCountdown(300);
        toast.success(response.message || `OTP sent to ${contactType === 'email' ? 'email' : 'phone number'}`);
      } else {
        setError(response?.message || 'Failed to send OTP');
        toast.error(response?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyAndSave = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      let response;
      if (contactType === 'email') {
        response = await verifyEmailChange(value, otp);
      } else if (contactType === 'phone') {
        response = await verifyPhoneChange(value);
      }
      if (response?.success) {
        toast.success(response.message || `${contactType === 'email' ? 'Email' : 'Phone number'} updated successfully`);
        onSave(value);
        onOpenChange(false);
      } else {
        setError(response?.message || 'Verification failed');
        toast.error(response?.message || 'Invalid OTP or verification failed');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Verification failed. Please try again.');
      toast.error('Invalid OTP or verification failed');
    } finally {
      setIsLoading(false);
    }
  };
  const isEmail = contactType === 'email';
  const Icon = isEmail ? Mail : Phone;
  const title = isEmail ? 'Update Email Address' : 'Update Mobile Number';
  const placeholder = isEmail ? 'Enter new email address' : 'Enter new mobile number';
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="sm:max-w-[420px] max-w-[90vw] rounded-[20px] p-0 sm:max-h-[80vh] max-h-[80vh] mx-auto overflow-y-auto bg-white gap-0 shadow-2xl border-2 border-border-subtle overscroll-contain">
        {}
        <div className="bg-gradient-to-br from-gold via-gold/90 to-gold/80 pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 sm:py-5 text-center text-white relative overflow-hidden rounded-t-[18px] border-b border-gold/20">
          <DialogClose className="absolute left-3 top-3 z-50 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50">
            <span className="sr-only">Close</span>
            {}
            <span className="text-lg leading-none">×</span>
          </DialogClose>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-white text-xl">{title}</DialogTitle>
            </DialogHeader>
            <p className="text-white/90 text-sm mt-1">
              Verify your new {isEmail ? 'email' : 'number'} with OTP
            </p>
          </div>
        </div>

        {}
        <div className="pl-4 pr-4 sm:pl-5 sm:pr-5 py-4 space-y-5 pb-[env(safe-area-inset-bottom)] bg-white">
          {}
          <div className="space-y-2">
            <Label htmlFor="contactValue" className="text-sm font-medium">
              {isEmail ? 'New Email Address' : 'New Mobile Number'}
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input id="contactValue" type={isEmail ? 'email' : 'tel'} value={value} onChange={e => {
              setValue(e.target.value);
              setError('');
            }} placeholder={placeholder} disabled={isOtpSent} className={`rounded-[12px] border-border-subtle flex-1 ${error ? 'border-red-accent' : ''}`} />
              {!isOtpSent && <Button type="button" onClick={handleSendOtp} disabled={isLoading || !value} className="bg-gold hover:bg-gold/90 text-white rounded-[12px] whitespace-nowrap sm:w-auto w-full">
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </Button>}
            </div>
            {error && !isOtpSent && <p className="text-xs text-red-accent">{error}</p>}
          </div>

          {}
          {isOtpSent && <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium">
                Enter OTP
              </Label>
              <Input id="otp" type="text" value={otp} onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setOtp(val);
            setError('');
          }} placeholder="Enter 6-digit OTP" maxLength={6} className={`rounded-[12px] border-border-subtle text-center text-lg tracking-widest ${error ? 'border-red-accent' : ''}`} />
              {error && <p className="text-xs text-red-accent">{error}</p>}
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>OTP sent to {isEmail ? 'email' : 'number'}</span>
                {countdown > 0 ? <span>Resend in {countdown}s</span> : <button type="button" onClick={handleSendOtp} disabled={isLoading} className="text-gold hover:underline">
                    Resend OTP
                  </button>}
              </div>
            </div>}

          {}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1 rounded-[12px] border-border-subtle h-11 sm:w-auto w-full">
              Cancel
            </Button>
            {isOtpSent ? <Button type="button" onClick={handleVerifyAndSave} disabled={isLoading || !otp || otp.length !== 6} className="flex-1 bg-gold hover:bg-gold/90 text-white rounded-[12px] h-11 sm:w-auto w-full">
                {isLoading ? 'Verifying...' : 'Verify & Save'}
              </Button> : <Button type="button" onClick={handleSendOtp} disabled={isLoading || !value} className="flex-1 bg-gold hover:bg-gold/90 text-white rounded-[12px] h-11 sm:w-auto w-full">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}