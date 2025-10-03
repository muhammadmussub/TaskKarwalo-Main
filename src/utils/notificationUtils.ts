import { supabase } from "@/integrations/supabase/client";

export interface NotificationData {
  user_id: string;
  title: string;
  content: string;
  type: string;
  booking_id?: string;
}

export const createNotification = async (notificationData: NotificationData) => {
  try {
    console.log('Creating notification:', notificationData);

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.user_id,
        title: notificationData.title,
        content: notificationData.content,
        type: notificationData.type,
        booking_id: notificationData.booking_id,
        read_at: null
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    console.log('Notification created successfully');
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

// Specific notification creators for different events
export const createAccountApprovalNotification = async (userId: string, userType: string) => {
  await createNotification({
    user_id: userId,
    title: 'Account Approved!',
    content: `Your ${userType} account has been approved and is now active. You can start using all features.`,
    type: 'account_approval'
  });
};

export const createServiceApprovalNotification = async (userId: string, serviceTitle: string) => {
  await createNotification({
    user_id: userId,
    title: 'Service Approved',
    content: `Your service "${serviceTitle}" has been approved and is now visible to customers.`,
    type: 'service_approval'
  });
};

export const createServiceRejectionNotification = async (userId: string, serviceTitle: string, reason?: string) => {
  await createNotification({
    user_id: userId,
    title: 'Service Rejected',
    content: `Your service "${serviceTitle}" has been rejected${reason ? `. Reason: ${reason}` : '. You can create a new service if you wish to try again.'}`,
    type: 'service_rejection'
  });
};

export const createNewBookingNotification = async (userId: string, bookingTitle: string, customerName: string) => {
  await createNotification({
    user_id: userId,
    title: 'New Booking Request',
    content: `You have a new booking request for "${bookingTitle}" from ${customerName}.`,
    type: 'new_booking'
  });
};

export const createBookingCancellationNotification = async (userId: string, bookingTitle: string, reason?: string) => {
  await createNotification({
    user_id: userId,
    title: 'Booking Cancelled',
    content: `Your booking for "${bookingTitle}" has been cancelled${reason ? `. Reason: ${reason}` : '.'}`,
    type: 'booking_cancellation'
  });
};

export const createProBadgeApprovalNotification = async (userId: string) => {
  await createNotification({
    user_id: userId,
    title: 'Pro Badge Approved!',
    content: 'Congratulations! Your Pro badge request has been approved. You now have access to premium features.',
    type: 'pro_badge_approval'
  });
};

export const createProBadgeRejectionNotification = async (userId: string, reason?: string) => {
  await createNotification({
    user_id: userId,
    title: 'Pro Badge Request Update',
    content: `Your Pro badge request has been reviewed${reason ? `. ${reason}` : '. Please contact support for more details.'}`,
    type: 'pro_badge_rejection'
  });
};

export const createCommissionPaymentNotification = async (userId: string, amount: number, status: string) => {
  await createNotification({
    user_id: userId,
    title: 'Commission Payment Update',
    content: `Your commission payment of PKR ${amount.toLocaleString()} has been ${status}.`,
    type: 'commission_payment'
  });
};

export const createProviderRejectionNotification = async (userId: string, businessName: string, reason: string) => {
  await createNotification({
    user_id: userId,
    title: 'Provider Application Rejected',
    content: `Your provider application for "${businessName}" has been rejected. Reason: ${reason}. You can update your information and reapply.`,
    type: 'provider_rejection'
  });
};

export const createProviderApprovalNotification = async (userId: string, businessName: string) => {
  await createNotification({
    user_id: userId,
    title: 'Provider Application Approved!',
    content: `Congratulations! Your provider application for "${businessName}" has been approved. You can now start receiving bookings and providing services.`,
    type: 'provider_approval'
  });
};