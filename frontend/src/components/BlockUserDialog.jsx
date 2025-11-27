import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
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
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-500" />
            Block User
          </DialogTitle>
          <DialogDescription>
            Enter the User ID of the profile you want to block. Blocked users will not be able to view your profile or send you requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customId">User ID</Label>
            <Input
              id="customId"
              placeholder="Enter User ID (e.g., USR12345)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="rounded-[12px] border-border-subtle"
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

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBlocking}
            className="flex-1 rounded-[12px] border-border-subtle"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleBlock}
            disabled={isBlocking || !customId.trim()}
            className="flex-1 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-[12px]"
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
