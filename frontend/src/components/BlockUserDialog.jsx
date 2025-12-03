import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserX, Loader2, AlertCircle } from 'lucide-react';
import { blockUserProfile } from '../api/auth';
import { toast } from 'react-hot-toast';

export function BlockUserDialog({ open, onOpenChange, onBlockSuccess }) {
  const [customId, setCustomId] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!customId || !customId.trim()) {
      toast.error('Please enter a User ID');
      return;
    }

    setIsBlocking(true);
    try {
      const response = await blockUserProfile(customId.trim());
      
      if (response?.success) {
        toast.success(`User ${customId} has been blocked`);
        setCustomId('');
        onOpenChange(false);
        if (typeof onBlockSuccess === 'function') {
          onBlockSuccess();
        }
      } else {
        toast.error(response?.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setCustomId('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose={false} className="sm:max-w-md max-w-[82vw] sm:my-12 my-10 sm:mx-6 mx-6 rounded-[18px] bg-white shadow-2xl border border-border-subtle max-h-[80vh] overflow-hidden">
        <div className="bg-gold/20 px-4 sm:px-6 py-3 sm:py-4 rounded-t-[18px] border-b border-gold/30 relative">
          <DialogClose className="absolute right-3 top-3 z-50 w-8 h-8 rounded-full bg-white/70 hover:bg-white/80 text-gold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold/40">
            <span className="sr-only">Close</span>
            <span className="text-lg leading-none">×</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              Block User
            </DialogTitle>
            <DialogDescription>
              Enter the User ID of the profile you want to block. Blocked users will not be able to view your profile or send you requests.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-4 sm:px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="customId">User ID</Label>
            <Input
              id="customId"
              placeholder="Enter User ID (e.g., USR12345)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="rounded-[12px] border-border-subtle h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isBlocking) {
                  handleBlock();
                }
              }}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-[12px] text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-800 text-xs m-0">
              Note: You can change block status for a profile once every 24 hours.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 pb-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBlocking}
            className="flex-1 rounded-[12px] border-border-subtle h-11 sm:w-auto w-full"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleBlock}
            disabled={isBlocking || !customId.trim()}
            className="flex-1 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-[12px] h-11 sm:w-auto w-full"
          >
            {isBlocking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Blocking...
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-2" />
                Block User
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
