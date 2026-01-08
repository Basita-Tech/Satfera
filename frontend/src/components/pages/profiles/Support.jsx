import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { createSupportTicket, getSupportTickets, getSupportTicketDetails, addTicketMessage } from '../../../api/auth';
import toast from 'react-hot-toast';
import { MessageCircle, Ticket, RefreshCw, Send, Shield, User, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export function Support() {
  const navigate = useNavigate();
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketMessage, setTicketMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const fetchSupportTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const response = await getSupportTickets();
      if (response?.success && Array.isArray(response?.data)) {
        setSupportTickets(response.data);
      } else {
        setSupportTickets([]);
      }
    } catch (error) {
      console.error('Failed to fetch support tickets:', error);
      setSupportTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim() || !ticketCategory.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const response = await createSupportTicket(ticketSubject, ticketMessage, ticketCategory);
      if (response?.success) {
        toast.success('Support ticket created successfully');
        setTicketSubject('');
        setTicketMessage('');
        setTicketCategory('general');
        await fetchSupportTickets();
      } else {
        toast.error(response?.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Create ticket error:', error);
      toast.error('Failed to create ticket. Please try again.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    try {
      const response = await getSupportTicketDetails(ticket._id || ticket.id);
      if (response?.success && response?.data) {
        setSelectedTicket(response.data);
      } else {
        setSelectedTicket(ticket);
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      setSelectedTicket(ticket);
    }
  };

  const refreshCurrentTicket = async () => {
    if (!selectedTicket) return;
    try {
      const response = await getSupportTicketDetails(selectedTicket._id || selectedTicket.id);
      if (response?.success && response?.data) {
        setSelectedTicket(response.data);
        toast.success('Messages refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh ticket:', error);
      toast.error('Failed to refresh messages');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setIsSendingReply(true);
    try {
      const response = await addTicketMessage(selectedTicket._id || selectedTicket.id, replyMessage);
      if (response?.success) {
        toast.success('Message sent successfully');
        setReplyMessage('');
        await handleSelectTicket(selectedTicket);
        await fetchSupportTickets();
      } else {
        toast.error(response?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send reply error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'Open' },
      'in-progress': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Closed' }
    };
    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border px-2 py-0.5 text-xs font-medium`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Support Center</p>
          <h1 className="text-2xl font-semibold text-[#3a2f00] m-0">Help & Support</h1>
        </div>
        <Button variant="outline" className="rounded-[10px] border-[#c8a227] text-[#3a2f00]" onClick={() => navigate('/dashboard/settings')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>
      </div>

      <div className="mt-6 bg-white rounded-[18px] shadow-sm border border-gold/20 overflow-hidden">
        {!selectedTicket ? (
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 p-4 md:p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-base">Create New Ticket</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Subject"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="rounded-[10px] border-gray-300 h-10 text-sm focus:border-gold"
                    disabled={isCreatingTicket}
                  />
                  <Select value={ticketCategory} onValueChange={setTicketCategory} disabled={isCreatingTicket}>
                    <SelectTrigger className="rounded-[10px] border-gray-300 h-10 text-sm focus:border-gold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Describe your issue..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="rounded-[10px] border-gray-300 min-h-[80px] resize-none text-sm focus:border-gold"
                  disabled={isCreatingTicket}
                />
                <Button
                  onClick={handleCreateTicket}
                  disabled={isCreatingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                  className="w-full bg-gold hover:bg-gold/90 text-white rounded-[10px] h-10 font-medium text-sm"
                >
                  {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </div>

            <div className="p-4 md:p-5 min-h-[320px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-base m-0">Your Tickets</h3>
                <Button size="sm" className="text-sm bg-gold hover:bg-gold/90 text-white" onClick={fetchSupportTickets} disabled={isLoadingTickets}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
              {isLoadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-gold"></div>
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Ticket className="w-14 h-14 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No support tickets yet</p>
                  <p className="text-sm mt-1">Create your first ticket on the left</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {supportTickets.map((ticket) => (
                    <button
                      type="button"
                      key={ticket._id || ticket.id}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-[12px] hover:border-gold hover:shadow-md transition-all bg-white"
                      onClick={() => handleSelectTicket(ticket)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-semibold text-gray-800 flex-1 pr-2 text-base m-0">{ticket.subject}</h4>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description || ticket.message}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="capitalize px-2 py-1 bg-gray-100 rounded">{ticket.category}</span>
                        <span>•</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.messages && ticket.messages.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium">{ticket.messages.length} messages</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Viewing ticket</p>
                <h3 className="font-semibold text-gray-900 text-lg m-0 truncate">{selectedTicket.subject}</h3>
                <p className="text-xs text-gray-500 capitalize mt-1">Category: {selectedTicket.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-sm" onClick={refreshCurrentTicket}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="text-sm" onClick={() => setSelectedTicket(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  All Tickets
                </Button>
                {getStatusBadge(selectedTicket.status)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{selectedTicket.description || selectedTicket.message}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">You • {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'admin' ? 'bg-blue-100' : 'bg-gold/20'}`}>
                    {msg.sender === 'admin' ? (
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`rounded-lg p-3 border shadow-sm ${msg.sender === 'admin' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.text || msg.message}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'admin' ? 'text-right' : ''}`}>
                      {msg.sender === 'admin' ? 'Support Team' : 'You'} • {new Date(msg.createdAt || msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket.status === 'closed' ? (
              <div className="p-4 border-t border-gray-200 bg-white text-center">
                <p className="text-sm text-gray-600 m-0">This ticket is closed and cannot receive replies.</p>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 text-sm border-gray-300 focus:border-gold focus:ring-gold min-h-[50px] max-h-[120px] resize-none"
                    disabled={isSendingReply}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={isSendingReply || !replyMessage.trim()}
                    className="bg-gold hover:bg-gold/90 text-white h-[50px] w-12 p-0 shrink-0 rounded-[10px]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Press Enter to send, Shift+Enter for new line</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Support;
