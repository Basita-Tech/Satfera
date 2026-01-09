import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Shield, Loader2, AlertCircle, X } from 'lucide-react';
import { reportProfile } from '../api/auth';
import { toast } from 'react-hot-toast';

export function ReportProfileDialog({ open, onOpenChange, onReportSuccess }) {
  const [customId, setCustomId] = useState('');
  const [reportType, setReportType] = useState('spam');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCustomId('');
    setReportType('spam');
    setReason('');
    setDescription('');
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!customId.trim()) {
      toast.error('Please enter a User ID');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please add a short reason');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await reportProfile(customId.trim(), reason.trim(), description.trim(), reportType);
      if (response?.success) {
        toast.success('Report submitted. Thank you for helping keep Satfera safe.');
        resetForm();
        onOpenChange(false);
        if (typeof onReportSuccess === 'function') {
          onReportSuccess();
        }
      } else {
        toast.error(response?.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error reporting profile:', error);
      toast.error('Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        className="sm:max-w-[420px] max-w-[90vw] h-[80vh] rounded-[20px] p-0 gap-0 bg-white border-2 border-gold/30 shadow-2xl overflow-hidden flex flex-col mt-12 sm:mt-16"
      >
        <div className="bg-gradient-to-br from-[#C8A227] via-[#D4A052] to-[#E4C48A] px-4 py-2 text-white relative overflow-hidden rounded-t-[18px] shrink-0 border-b-2 border-gold/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-semibold m-0">Report a Profile</h2>
              <p className="text-white/90 text-xs mt-0.5 m-0">Tell us what happened. Reports are reviewed by our safety team.</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-lg flex-shrink-0"
              onClick={() => handleOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-4 sm:px-6 py-3 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="report-custom-id">User ID</Label>
            <Input
              id="report-custom-id"
              placeholder="Enter User ID (e.g., USR12345)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="rounded-[12px] border-border-subtle h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="report-type">Category</Label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-12 rounded-[12px] border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="spam">Spam </option>
                <option value="abuse">Abuse</option>
                <option value="hate">Hate</option>
                <option value="other">Other </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-reason">Short reason</Label>
              <Input
                id="report-reason"
                placeholder="e.g., Suspicious messages"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-[12px] border-border-subtle h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">What happened?</Label>
            <Textarea
              id="report-description"
              placeholder="Describe the issue (6-500 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-[12px] border-border-subtle min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground m-0">Please avoid sharing private info. We only send what is needed to review.</p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-[12px] text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-blue-800 text-xs m-0">
              False reports may lead to action on your account. Serious issues? Contact support for faster review.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 pb-2 pt-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-[12px] border-border-subtle h-11 sm:w-auto w-full">
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit}
            disabled={isSubmitting || !customId.trim() || !reason.trim() || !description.trim()}
            className="flex-1 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-[12px] h-11 sm:w-auto w-full">
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
