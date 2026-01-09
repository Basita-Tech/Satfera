import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserX, Search, Loader2, AlertCircle } from 'lucide-react';
import { getBlockedUsers, unblockUserProfile } from '../api/auth';
import { toast } from 'react-hot-toast';
export function BlockedUsersList({
  open,
  onOpenChange,
  refreshToken
}) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unblockingId, setUnblockingId] = useState(null);
  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
    }
  }, [open, refreshToken]);
  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const response = await getBlockedUsers(false);
      if (response?.success) {
        const users = Array.isArray(response.data) ? response.data : [];
        setBlockedUsers(users);
      } else {
        console.warn('⚠️ API returned success=false:', response);
        setBlockedUsers([]);
        if (response?.message) {
          toast.error(response.message);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch blocked users:', error);
      toast.error('Failed to load blocked users');
      setBlockedUsers([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUnblock = async (customId, name) => {
    if (!customId) return;
    setUnblockingId(customId);
    try {
      const response = await unblockUserProfile(customId);
      if (response?.success) {
        toast.success(`${name || 'User'} has been unblocked`);
        setBlockedUsers(prev => prev.filter(user => user.customId !== customId));
      } else {
        toast.error(response?.message || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };
  const filteredUsers = blockedUsers.filter(user => {
    if (!searchQuery) return true;
    const fullName = `${user.name || ''}`.toLowerCase();
    const customId = (user.customId || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || customId.includes(query);
  });
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="sm:max-w-2xl max-w-[90vw] sm:my-12 my-6 sm:mx-4 mx-3 rounded-[16px] bg-white shadow-xl border border-border-subtle max-h-[80vh] overflow-hidden flex flex-col">
        <div className="bg-gold/20 px-4 sm:px-6 py-3 sm:py-4 rounded-t-[16px] border-b border-gold/30 relative">
          <DialogClose className="absolute right-3 top-3 z-50 w-8 h-8 rounded-full bg-white/70 hover:bg-white/80 text-gold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold/40">
            <span className="sr-only">Close</span>
            <span className="text-lg leading-none">×</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-gold" />
            Blocked Users List ({blockedUsers.length})
            </DialogTitle>
          </DialogHeader>
        </div>

        {}
        <div className="px-4 sm:px-6 pt-4">
          <div className="flex items-center h-12 rounded-[12px] border border-border-subtle bg-white">
            <Search className="ml-3 w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input type="text" placeholder="Search blocked users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 h-full bg-transparent outline-none text-sm px-3" />
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto space-y-3 px-4 sm:px-6 pt-4 pb-4">
          {isLoading ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading blocked users...</p>
            </div> : filteredUsers.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserX className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery ? 'No users found matching your search' : 'No blocked users yet'}
              </p>
            </div> : filteredUsers.map(user => <div key={user.customId} className="p-4 border border-border-subtle rounded-[12px] hover:bg-beige/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {user.name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      ID: {user.customId}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 rounded-[8px] bg-white border-2 border-gold text-gold hover:bg-beige hover:border-gold w-full sm:w-auto" onClick={() => handleUnblock(user.customId, user.name)} disabled={unblockingId === user.customId}>
                  {unblockingId === user.customId ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unblocking...
                    </> : 'Unblock'}
                </Button>
              </div>)}
        </div>

        {}
        {blockedUsers.length > 0 && <div className="mx-4 sm:mx-6 mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-[12px] text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-blue-800 text-xs m-0">
              Note: You can change block status for a profile once every 24 hours.
            </p>
          </div>}
      </DialogContent>
    </Dialog>;
}