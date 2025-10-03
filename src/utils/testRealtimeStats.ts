import { supabase } from "@/integrations/supabase/client";

// Test function to verify real-time stats functionality
export const testRealtimeStats = async () => {
  console.log("Testing real-time stats functionality...");
  
  try {
    // 1. Test fetching stats
    console.log("1. Fetching current stats...");
    const { data: stats, error: fetchError } = await supabase
      .from('realtime_stats')
      .select('*')
      .eq('time_period', 'current')
      .limit(10);
    
    if (fetchError) {
      console.error("Error fetching stats:", fetchError);
      return;
    }
    
    console.log("Found", stats?.length || 0, "stats");
    if (stats && stats.length > 0) {
      console.log("Sample stats:", stats.slice(0, 3));
    }
    
    // 2. Test inserting a test stat
    console.log("2. Inserting test stat...");
    const testStat = {
      stat_type: 'test',
      stat_name: 'test_metric_' + Date.now(),
      stat_value: Math.random() * 100,
      stat_trend: Math.random() * 10 - 5,
      time_period: 'current'
    };
    
    const { data: insertedStat, error: insertError } = await supabase
      .from('realtime_stats')
      .insert(testStat)
      .select();
    
    if (insertError) {
      console.error("Error inserting test stat:", insertError);
      return;
    }
    
    console.log("Test stat inserted:", insertedStat?.[0]);
    
    // 3. Test updating the test stat
    console.log("3. Updating test stat...");
    if (insertedStat && insertedStat[0]) {
      const { data: updatedStat, error: updateError } = await supabase
        .from('realtime_stats')
        .update({
          stat_value: Math.random() * 100,
          stat_trend: Math.random() * 10 - 5,
          updated_at: new Date().toISOString()
        })
        .eq('id', insertedStat[0].id)
        .select();
      
      if (updateError) {
        console.error("Error updating test stat:", updateError);
        return;
      }
      
      console.log("Test stat updated:", updatedStat?.[0]);
    }
    
    // 4. Test deleting the test stat
    console.log("4. Deleting test stat...");
    if (insertedStat && insertedStat[0]) {
      const { error: deleteError } = await supabase
        .from('realtime_stats')
        .delete()
        .eq('id', insertedStat[0].id);
      
      if (deleteError) {
        console.error("Error deleting test stat:", deleteError);
        return;
      }
      
      console.log("Test stat deleted successfully");
    }
    
    console.log("All tests completed successfully!");
    
  } catch (error) {
    console.error("Unexpected error during testing:", error);
  }
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // This would run in a Node.js environment
  testRealtimeStats();
}