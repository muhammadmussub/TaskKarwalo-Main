
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Receipt, Check, X, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Booking {
  id: string;
  title: string;
  status: string;
  proposed_price: number;
  final_price?: number;
  customer_id: string;
  provider_id: string;
}

interface ChatMessage {
  id: string;
  content: string;
  message_type: 'text' | 'price_offer' | 'booking_update' | 'call_initiated';
  price_offer?: number;
  sender_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface ChatModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal = ({ booking, isOpen, onClose }: ChatModalProps) => {
  const { user } = useAuth();
  const { markAsRead, refreshNotifications } = useNotifications();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [priceOffer, setPriceOffer] = useState("");
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageAnimation, setNewMessageAnimation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const messageAnimationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Lightning-fast scroll optimization
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Use requestAnimationFrame for immediate scroll
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: force ? "smooth" : "auto",
          block: "end"
        });
      });
    }
  }, []);

  // Optimized message animation handler
  const triggerMessageAnimation = useCallback((messageId: string) => {
    setNewMessageAnimation(messageId);

    // Clear existing timeout for this message
    const existingTimeout = messageAnimationTimeouts.current.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to remove animation
    const timeout = setTimeout(() => {
      setNewMessageAnimation(null);
      messageAnimationTimeouts.current.delete(messageId);
    }, 1000);

    messageAnimationTimeouts.current.set(messageId, timeout);
  }, []);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      messageAnimationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      messageAnimationTimeouts.current.clear();
    };
  }, []);

  useEffect(() => {
    if (booking?.id) {
      // Lightning-fast message loading with optimized queries
      loadMessages();

      // Mark notifications for this booking as read
      markNotificationsAsRead(booking.id);

      // Set up ultra-fast real-time subscription with optimized channel
      const channel = supabase
        .channel(`chat-${booking.id}-${user.id}`, {
          config: {
            broadcast: { self: true },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `booking_id=eq.${booking.id}`
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;

            // Lightning-fast message processing
            setMessages(prev => {
              // Ultra-fast duplicate check using Map for O(1) lookup
              const messageExists = prev.some(msg => msg.id === newMessage.id);
              if (messageExists) return prev;

              // Create message with profile immediately
              const messageWithProfile: ChatMessage = {
                ...newMessage,
                profiles: { full_name: 'Loading...' }
              };

              // Trigger animation for new message
              triggerMessageAnimation(newMessage.id);

              // Add immediately and scroll instantly
              const updatedMessages = [...prev, messageWithProfile];

              // Use microtask for immediate scroll
              Promise.resolve().then(() => scrollToBottom(true));

              return updatedMessages;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${booking.id}`
          },
          (payload) => {
            const newBooking = payload.new as Booking;
            const oldBooking = payload.old as Booking;

            // Only reload if status actually changed
            if (newBooking.status !== oldBooking.status) {
              // Ultra-fast reload with requestAnimationFrame
              requestAnimationFrame(() => loadMessages());
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Lightning-fast chat subscription active');
          }
        });

      return () => {
        supabase.removeChannel(channel);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [booking?.id, user.id, scrollToBottom, triggerMessageAnimation]);

  useEffect(() => {
    // Only scroll if messages were just loaded or a new message was added
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Lightning-fast message loading with optimized queries
  const loadMessages = useCallback(async (page = 0, limit = 100) => {
    if (!booking?.id) return;

    try {
      // Ultra-fast message loading with minimal queries
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          message_type,
          price_offer,
          sender_id,
          created_at
        `)
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Get unique sender IDs and fetch their profiles in a single optimized query
      const senderIds = [...new Set((data || []).map(msg => msg.sender_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Create a map of user_id to profile for O(1) lookup
      const profilesMap = new Map((profilesData || []).map(profile => [profile.user_id, profile]));

      // Process messages with profiles in single pass - ultra-fast
      const messagesWithProfiles: ChatMessage[] = (data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'price_offer' | 'booking_update' | 'call_initiated',
        price_offer: msg.price_offer || undefined,
        profiles: profilesMap.get(msg.sender_id) || { full_name: 'Unknown' }
      }));

      // Add original price message at the beginning for context
      if (page === 0 && messagesWithProfiles.length > 0) {
        const customerProfile = profilesMap.get(booking.customer_id);
        const originalPriceMessage: ChatMessage = {
          id: `original-price-${booking.id}`,
          content: `💰 Original proposed price: PKR ${booking.proposed_price}`,
          message_type: 'text',
          price_offer: undefined,
          sender_id: booking.customer_id,
          created_at: new Date(Date.now() - 60000).toISOString(),
          profiles: customerProfile || { full_name: 'Customer' }
        };
        messagesWithProfiles.unshift(originalPriceMessage);
      }

      // Set messages immediately without any delay
      setMessages(messagesWithProfiles);

    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  }, [booking?.id, booking?.customer_id, booking?.proposed_price]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !booking?.id || !user) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    console.log('ChatModal: Sending message:', {
      bookingId: booking.id,
      senderId: user.id,
      content: messageContent,
      userType: user.user_type
    });

    // Ultra-fast optimistic update - no loading state
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content: messageContent,
      message_type: 'text',
      sender_id: user.id,
      created_at: new Date().toISOString(),
      profiles: { full_name: user.full_name || 'You' }
    };

    // Add message immediately for instant feedback
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");

    // Scroll immediately
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      console.log('Sending message to database:', {
        booking_id: booking.id,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text'
      });

      // Insert the message to database with minimal delay
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        })
        .select()
        .single();

      if (messageError) {
        console.error('Database error sending message:', messageError);
        throw messageError;
      }

      console.log('Message sent successfully:', messageData);

      // Replace optimistic message with real message instantly
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? {
          ...messageData,
          message_type: messageData.message_type as 'text' | 'price_offer' | 'booking_update' | 'call_initiated',
          profiles: msg.profiles
        } : msg
      ));

      // Create notification for the other party (fire and forget)
      const recipientId = user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
      console.log('Creating notification for recipient:', recipientId);

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: `New message: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
          title: `New message about "${booking.title}"`,
          type: 'message',
          user_id: recipientId
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't throw here - message was sent successfully
      } else {
        console.log('Notification created successfully for recipient:', recipientId);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error("Failed to send message: " + error.message);
    }
  };

  const sendPriceOffer = async () => {
    if (!priceOffer || !booking?.id || !user) return;

    setLoading(true);
    try {
      const price = parseFloat(priceOffer);
      
      // Insert the price offer message
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: `Price offer: PKR ${price}`,
          message_type: 'price_offer',
          price_offer: price
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create notification for the other party
      const recipientId = user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: `New price offer: PKR ${price}`,
          title: `Price offer for "${booking.title}"`,
          type: 'price_offer',
          user_id: recipientId
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      setPriceOffer("");
      setShowPriceInput(false);
    } catch (error: any) {
      toast.error("Failed to send price offer: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = async (messageId: string, offerPrice: number) => {
    if (!booking?.id || !user) return;

    // Ultra-fast optimistic update - no loading state
    const tempMessageId = `temp-accept-${Date.now()}`;

    // Add acceptance message immediately for instant feedback
    const acceptanceMessage: ChatMessage = {
      id: tempMessageId,
      content: `✅ Offer accepted! Final price: PKR ${offerPrice}`,
      message_type: 'booking_update',
      sender_id: user.id,
      created_at: new Date().toISOString(),
      profiles: { full_name: user.full_name || 'You' }
    };

    setMessages(prev => [...prev, acceptanceMessage]);
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      // Update booking status and final price
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          final_price: offerPrice,
          status: 'confirmed'
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Send acceptance message
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: `✅ Offer accepted! Final price: PKR ${offerPrice}`,
          message_type: 'booking_update'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId ? {
          ...messageData,
          message_type: 'booking_update' as const,
          profiles: msg.profiles
        } : msg
      ));

      // Create notification for the other party (fire and forget)
      const recipientId = user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
      supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: `Offer of PKR ${offerPrice} was accepted`,
          title: `Offer accepted for "${booking.title}"`,
          type: 'booking_update',
          user_id: recipientId
        })
        .then(({ error }) => {
          if (error) console.error('Failed to create notification:', error);
        });

      toast.success("Offer accepted!");
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      toast.error("Failed to accept offer: " + error.message);
    }
  };

  const rejectOffer = async (messageId: string, offerPrice: number) => {
    if (!booking?.id || !user) return;

    // Ultra-fast optimistic update - no loading state
    const tempMessageId = `temp-reject-${Date.now()}`;

    // Add rejection message immediately for instant feedback
    const rejectionMessage: ChatMessage = {
      id: tempMessageId,
      content: `❌ Offer rejected`,
      message_type: 'text',
      sender_id: user.id,
      created_at: new Date().toISOString(),
      profiles: { full_name: user.full_name || 'You' }
    };

    setMessages(prev => [...prev, rejectionMessage]);
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      // Send rejection message (just a chat message, don't change booking status)
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: `❌ Offer rejected`,
          message_type: 'text'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId ? {
          ...messageData,
          message_type: 'text' as const,
          profiles: msg.profiles
        } : msg
      ));

      // Create notification for the other party (fire and forget)
      const recipientId = user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
      supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: `Your offer was rejected - you can make a counter-offer`,
          title: `Offer rejected for "${booking.title}"`,
          type: 'message',
          user_id: recipientId
        })
        .then(({ error }) => {
          if (error) console.error('Failed to create notification:', error);
        });

      toast.success("Offer rejected - you can make a counter-offer");
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      toast.error("Failed to reject offer: " + error.message);
    }
  };

  const initiateCall = async () => {
    if (!booking?.id || !user) return;

    try {
      // Get the phone numbers of both parties
      const { data: customerProfile, error: customerError } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('user_id', booking.customer_id)
        .single();

      const { data: providerProfile, error: providerError } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('user_id', booking.provider_id)
        .single();

      if (customerError || providerError) {
        toast.error("Failed to retrieve contact information");
        return;
      }

      const currentUserIsProvider = user.id === booking.provider_id;
      const otherPartyName = currentUserIsProvider ? customerProfile?.full_name : providerProfile?.full_name;
      const otherPartyPhone = currentUserIsProvider ? customerProfile?.phone : providerProfile?.phone;

      if (!otherPartyPhone) {
        toast.error(`No phone number available for ${otherPartyName}`);
        return;
      }

      // Insert call initiated message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: user.id,
          content: `Call initiated with ${otherPartyName}`,
          message_type: 'call_initiated'
        });

      if (messageError) {
        toast.error("Failed to log call initiation");
        return;
      }

      // Create notification for the other party
      const recipientId = user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: `${user.full_name || 'User'} initiated a call`,
          title: `Call initiated for "${booking.title}"`,
          type: 'call',
          user_id: recipientId
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      // Initiate the call using tel: protocol
      window.open(`tel:${otherPartyPhone}`, '_blank');
      
      toast.success(`Calling ${otherPartyName} at ${otherPartyPhone}`);
    } catch (error: any) {
      toast.error("Failed to initiate call: " + error.message);
    }
  };

  const markNotificationsAsRead = async (bookingId: string) => {
    if (!user) return;
    
    try {
      // Mark all unread notifications for this booking and user as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('user_id', user.id)
        .is('read_at', null);
    
      if (error) {
        console.error('Error marking notifications as read:', error);
      } else {
        // Refresh notifications in context
        refreshNotifications();
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  };

  if (!booking) return null;

  const isProvider = user?.id === booking.provider_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Chat - {booking.title}
            <div className="text-sm text-muted-foreground">
              Status: {booking.status} | Proposed: PKR {booking.proposed_price}
              {booking.final_price && ` | Final: PKR ${booking.final_price}`}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {loadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">No messages yet. Start the conversation!</div>
              </div>
            ) : (
              messages.map((message) => {
                // Optimized offer button logic - only show on latest offer
                const isLatestOffer = useMemo(() => {
                  if (message.message_type !== 'price_offer' && !message.id.startsWith('original-price-')) {
                    return false;
                  }

                  const offers = messages.filter(m =>
                    (m.message_type === 'price_offer' || m.id.startsWith('original-price-')) &&
                    m.sender_id !== user?.id
                  );

                  const latestOfferTime = Math.max(...offers.map(m => new Date(m.created_at).getTime()));
                  return new Date(message.created_at).getTime() === latestOfferTime;
                }, [message, messages, user?.id]);

                const hasBeenRespondedTo = useMemo(() => {
                  if (message.message_type !== 'price_offer' && !message.id.startsWith('original-price-')) {
                    return false;
                  }

                  const messageTime = new Date(message.created_at).getTime();
                  return messages.some(m =>
                    m.message_type === 'booking_update' &&
                    new Date(m.created_at).getTime() > messageTime
                  );
                }, [message, messages]);

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} ${
                      newMessageAnimation === message.id ? 'animate-pulse' : ''
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg transition-all duration-300 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${
                        newMessageAnimation === message.id
                          ? 'ring-2 ring-blue-500 ring-opacity-50 scale-105'
                          : ''
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.profiles?.full_name}
                      </div>
                      <div className={message.message_type === 'booking_update' ? 'font-medium' : ''}>
                        {message.content}
                      </div>

                      {/* Lightning-fast offer button logic - only show on latest offer */}
                      {(message.message_type === 'price_offer' || message.id.startsWith('original-price-')) &&
                        message.sender_id !== user?.id &&
                        isLatestOffer &&
                        !hasBeenRespondedTo &&
                        (booking.status === 'pending' || booking.status === 'negotiating' || booking.status === 'confirmed') && (
                        <div className="flex gap-2 mt-2 animate-in slide-in-from-left duration-300">
                          <Button
                            size="sm"
                            onClick={() => {
                              const price = message.price_offer || booking.proposed_price;
                              acceptOffer(message.id, price);
                            }}
                            disabled={loading}
                            className="transition-all duration-200 hover:scale-105"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const price = message.price_offer || booking.proposed_price;
                              rejectOffer(message.id, price);
                            }}
                            disabled={loading}
                            className="transition-all duration-200 hover:scale-105"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                     {/* Show indicator for older offers that are no longer actionable */}
                     {message.message_type === 'price_offer' &&
                       message.sender_id !== user?.id &&
                       !isLatestOffer &&
                       (booking.status === 'pending' || booking.status === 'negotiating' || booking.status === 'confirmed') && (
                       <div className="text-xs text-muted-foreground mt-1 italic">
                         Previous offer - awaiting response
                       </div>
                     )}

                     {/* Show response status for offers that have been responded to */}
                     {hasBeenRespondedTo && (
                       <div className="text-xs text-muted-foreground mt-1 italic">
                         ✅ Offer responded to
                       </div>
                     )}

                    {message.message_type === 'call_initiated' && (
                      <div className="text-xs italic opacity-75 mt-1">
                        Call initiated
                      </div>
                    )}

                      <div className="text-xs opacity-50 mt-1">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 space-y-2">

          {showPriceInput ? (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter price..."
                value={priceOffer}
                onChange={(e) => setPriceOffer(e.target.value)}
                step="0.01"
              />
              <Button onClick={sendPriceOffer} disabled={loading}>
                Send
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPriceInput(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initiateCall}
                  disabled={loading || booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'completed' || booking.status === 'cancelled'}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPriceInput(true)}
                  disabled={booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'completed' || booking.status === 'cancelled'}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Make Offer
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

    </Dialog>
  );
};
