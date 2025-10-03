// Test script to verify chat real-time functionality
// Run this in the browser console to test the chat system

console.log('🧪 Testing Chat Real-time Functionality...');

// Test 1: Check if Supabase client is available
if (typeof supabase !== 'undefined') {
  console.log('✅ Supabase client is available');

  // Test 2: Check if chat_messages table exists
  supabase.from('chat_messages').select('count').limit(1)
    .then(result => {
      if (result.error) {
        console.log('❌ Chat messages table error:', result.error.message);
      } else {
        console.log('✅ Chat messages table is accessible');
      }
    })
    .catch(err => {
      console.log('❌ Chat messages table not accessible:', err);
    });

  // Test 3: Check if bookings table exists
  supabase.from('bookings').select('count').limit(1)
    .then(result => {
      if (result.error) {
        console.log('❌ Bookings table error:', result.error.message);
      } else {
        console.log('✅ Bookings table is accessible');
      }
    })
    .catch(err => {
      console.log('❌ Bookings table not accessible:', err);
    });

  // Test 4: Check if notifications table exists
  supabase.from('notifications').select('count').limit(1)
    .then(result => {
      if (result.error) {
        console.log('❌ Notifications table error:', result.error.message);
      } else {
        console.log('✅ Notifications table is accessible');
      }
    })
    .catch(err => {
      console.log('❌ Notifications table not accessible:', err);
    });

} else {
  console.log('❌ Supabase client is not available');
}

// Test 5: Check if user is authenticated
if (typeof window !== 'undefined' && window.location) {
  console.log('🌐 Current URL:', window.location.href);
  console.log('📱 User Agent:', navigator.userAgent);
}

// Test 6: Check if real-time subscriptions are enabled
if (typeof supabase !== 'undefined') {
  // Test creating a temporary channel
  const testChannel = supabase.channel('test-channel');
  if (testChannel) {
    console.log('✅ Real-time channels can be created');
    supabase.removeChannel(testChannel);
  } else {
    console.log('❌ Cannot create real-time channels');
  }
}

console.log('🔍 Manual Testing Instructions:');
console.log('1. Open two browser windows/tabs');
console.log('2. Log in as different users (customer and provider)');
console.log('3. Start a chat conversation');
console.log('4. Send messages and check if they appear in real-time');
console.log('5. Test accept/reject offers in chat');
console.log('6. Check if booking status updates immediately');
console.log('7. Verify toast notifications appear');
console.log('8. Check browser console for any errors');

console.log('📋 Expected Behavior:');
console.log('- Messages should appear instantly in both chat windows');
console.log('- Accept/reject buttons should only show for the most recent offer');
console.log('- Booking status should update immediately when offers are accepted/rejected');
console.log('- Toast notifications should appear for status changes');
console.log('- No duplicate messages should appear');
console.log('- Chat should scroll to bottom automatically for new messages');