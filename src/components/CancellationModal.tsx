import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, UserX } from "lucide-react";

interface CancellationModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onCancellationConfirmed: () => void; // Changed to not require a reason parameter
  userType: 'customer' | 'provider';
}

const CancellationModal = ({ booking, isOpen, onClose, onCancellationConfirmed, userType }: CancellationModalProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userDidNotShowUp, setUserDidNotShowUp] = useState(false);
  const [isNoShowCancellation, setIsNoShowCancellation] = useState(false);
  const [isAlreadyCancelled, setIsAlreadyCancelled] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setUserDidNotShowUp(false);
      setSubmitting(false);

      // Check if this is a no-show cancellation (customer cancelling during "coming" status)
      if (userType === 'customer' && booking?.status === 'coming') {
        setIsNoShowCancellation(true);
        setIsAlreadyCancelled(false);
      } else if (userType === 'provider' && booking?.status === 'cancelled') {
        setIsNoShowCancellation(false);
        setIsAlreadyCancelled(true);
        // Pre-fill reason for already cancelled bookings
        setReason(booking?.cancellation_reason || "Booking was cancelled by customer");
      } else {
        setIsNoShowCancellation(false);
        setIsAlreadyCancelled(false);
      }
    }
  }, [isOpen, userType, booking?.status, booking?.cancellation_reason]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setSubmitting(true);

    try {
      // Update booking status to cancelled with cancellation details
       const updateData: any = {
         status: 'cancelled'
       };

       // Add cancellation details if columns exist (they might not exist in older databases)
       try {
         updateData.cancellation_reason = reason;
         updateData.cancelled_at = new Date().toISOString();
         updateData.cancelled_by = userType;
       } catch (error) {
         // If columns don't exist, just update the status
         console.warn('Cancellation columns might not exist, updating status only');
       }

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (bookingUpdateError) {
        console.error('Error updating booking status:', bookingUpdateError);
        toast.error("Failed to update booking status: " + bookingUpdateError.message);
        return;
      }

      // Handle no-show strike recording for providers
      if (userType === 'provider' && userDidNotShowUp) {
        try {
          const { error: strikeError } = await supabase
            .from('no_show_strikes')
            .insert({
              user_id: booking.customer_id,
              booking_id: booking.id,
              provider_id: booking.provider_id,
              reason: isAlreadyCancelled
                ? `Customer did not show up - marked as no-show by provider after customer cancelled during "coming" status`
                : reason,
              strike_date: new Date().toISOString()
            });

          if (strikeError) {
            console.error('Error recording no-show strike:', strikeError);
            toast.error("Failed to record no-show strike: " + strikeError.message);
          } else {
            // Get updated strike count for notification
            const { data: profileData } = await supabase
              .from('profiles')
              .select('no_show_strikes_count')
              .eq('user_id', booking.customer_id)
              .single();

            const strikeCount = (profileData?.no_show_strikes_count || 0) + 1;

            // Update the user's strike count
            await supabase
              .from('profiles')
              .update({ no_show_strikes_count: strikeCount })
              .eq('user_id', booking.customer_id);

            // Create notification for the user about the strike
            const { error: strikeNotificationError } = await supabase
              .from('notifications')
              .insert({
                booking_id: booking.id,
                content: `You've triggered a no-show booking. You now have ${strikeCount} of 3 strikes this week. After 3 strikes, your account will be disabled for 48 hours.`,
                title: 'No-Show Strike Recorded',
                type: 'strike_warning',
                user_id: booking.customer_id
              });

            if (strikeNotificationError) {
              console.error('Failed to create strike notification:', strikeNotificationError);
            }

            toast.success(`No-show strike recorded. Customer now has ${strikeCount} of 3 strikes this week.`);
          }
        } catch (strikeError) {
          console.error('Error handling no-show strike:', strikeError);
          // Don't fail the entire operation for strike recording errors
        }
      }

      // Note: No-show strikes are now handled manually by providers through the no-show button
      // This ensures strikes are only applied when providers confirm the customer didn't show up

      // Create notification for the other party
      const otherUserType = userType === 'customer' ? 'provider' : 'customer';
      const otherUserId = booking[`${otherUserType}_id`];
      const messageType = userType === 'customer' ? 'customer' : 'provider';
      const notificationContent = userType === 'customer'
        ? `Your booking "${booking.title}" has been cancelled by the customer. Reason: ${reason}`
        : `Your booking "${booking.title}" has been cancelled by the provider. Reason: ${reason}${userDidNotShowUp ? ' (User did not show up)' : ''}`;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          booking_id: booking.id,
          content: notificationContent,
          title: `Booking Cancelled: ${booking.title}`,
          type: 'booking_update',
          user_id: otherUserId
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the cancellation for notification errors
      }

      // Create a chat message about the cancellation
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          booking_id: booking.id,
          sender_id: booking[`${userType}_id`],
          content: `Booking has been cancelled by the ${messageType}. Reason: ${reason}${userDidNotShowUp ? ' (User did not show up)' : ''}`,
          message_type: 'booking_update'
        });

      if (messageError) {
        console.error('Error creating chat message:', messageError);
        // Don't fail the cancellation for chat message errors
      }

      toast.success("Booking cancelled successfully");
      onCancellationConfirmed();
      onClose();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error("Failed to cancel booking: " + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Service: {booking?.title}</Label>
            <p className="text-sm text-muted-foreground">Are you sure you want to cancel this booking?</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              rows={4}
              required
            />
          </div>

          {userType === 'provider' && isAlreadyCancelled && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This booking was cancelled by the customer. You can mark it as no-show if the customer didn't show up for the scheduled service.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noShow"
                  checked={userDidNotShowUp}
                  onCheckedChange={(checked) => setUserDidNotShowUp(checked as boolean)}
                />
                <Label htmlFor="noShow" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Customer did not show up (Record no-show strike)
                </Label>
              </div>
              {userDidNotShowUp && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will record a no-show strike against the customer. After 3 strikes in 7 days, their account will be suspended for 48 hours.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {userType === 'customer' && isNoShowCancellation && (
            <div className="space-y-2">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Notice:</strong> The service provider is already en route to your location. Please consider keeping the booking or contact the provider directly if you need to make changes.
                </AlertDescription>
              </Alert>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <UserX className="h-4 w-4" />
                  <span className="font-semibold text-sm">Provider Impact</span>
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Provider has already started traveling to your location</p>
                  <p>• Consider contacting the provider before cancelling</p>
                  <p>• Late cancellations may affect your provider relationships</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Keep Booking
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmit} 
              disabled={submitting || !reason.trim()}
            >
              {submitting ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationModal;