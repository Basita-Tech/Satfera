import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserX, Search, Loader2, AlertCircle } from 'lucide-react';
import { getBlockedUsers, unblockUserProfile } from '../api/auth';
import { toast } from 'react-hot-toast';

export function BlockedUsersList({ open, onOpenChange }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    if (open) {
      fetchBlockedUsers();
    }
  }, [open]);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const response = await getBlockedUsers(false); // Don't use cache for fresh data
      console.log('🔍 Blocked users API response:', response);
      
      // Backend returns: { success: true, data: [...] }
      // getBlockedUsers returns response.data, so we get { success: true, data: [...] }
      // We need to access response.data to get the array
      if (response?.success) {
        const users = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Setting blocked users:', users);
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
        // Remove from local list
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-gold" />
            Blocked Users List ({blockedUsers.length})
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search blocked users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-[12px] border-border-subtle"
          />
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading blocked users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserX className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery 
                  ? 'No users found matching your search'
                  : 'No blocked users yet'
                }
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.customId}
                className="flex items-center justify-between p-4 border border-border-subtle rounded-[12px] hover:bg-beige/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
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

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[8px] bg-white border-2 border-gold text-gold hover:bg-beige hover:border-gold whitespace-nowrap ml-3"
                  onClick={() => handleUnblock(user.customId, user.name)}
                  disabled={unblockingId === user.customId}
                >
                  {unblockingId === user.customId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unblocking...
                    </>
                  ) : (
                    'Unblock'
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Info Note */}
        {blockedUsers.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-[12px] text-sm">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-blue-800 text-xs m-0">
              Note: You can change block status for a profile once every 24 hours.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
