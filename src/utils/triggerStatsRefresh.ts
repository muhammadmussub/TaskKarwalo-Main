import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger the refresh_realtime_stats function in Supabase
 * This function will recalculate all the real-time statistics
 */
export const triggerStatsRefresh = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Triggering stats refresh...");
    
    // Call the Supabase function to refresh stats
    const { data, error } = await supabase.rpc('refresh_realtime_stats');
    
    if (error) {
      console.error("Error triggering stats refresh:", error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
    
    console.log("Stats refresh triggered successfully", data);
    return {
      success: true,
      message: "Stats refreshed successfully!"
    };
  } catch (error) {
    console.error("Unexpected error triggering stats refresh:", error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Manually insert a test stat to verify real-time functionality
 */
export const insertTestStat = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Inserting test stat...");
    
    const testStat = {
      stat_type: 'test',
      stat_name: `test_stat_${Date.now()}`,
      stat_value: Math.floor(Math.random() * 1000),
      stat_trend: parseFloat((Math.random() * 20 - 10).toFixed(2)),
      time_period: 'current'
    };
    
    const { data, error } = await supabase
      .from('realtime_stats')
      .insert(testStat)
      .select();
    
    if (error) {
      console.error("Error inserting test stat:", error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
    
    console.log("Test stat inserted successfully", data);
    return {
      success: true,
      message: `Test stat inserted: ${data?.[0]?.stat_name || 'Unknown'}`
    };
  } catch (error) {
    console.error("Unexpected error inserting test stat:", error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Get current stats count
 */
export const getStatsCount = async (): Promise<{ count: number; message: string }> => {
  try {
    console.log("Fetching stats count...");
    
    const { count, error } = await supabase
      .from('realtime_stats')
      .select('*', { count: 'exact', head: true })
      .eq('time_period', 'current');
    
    if (error) {
      console.error("Error fetching stats count:", error);
      return {
        count: 0,
        message: `Error: ${error.message}`
      };
    }
    
    console.log("Stats count fetched:", count);
    return {
      count: count || 0,
      message: `Found ${count || 0} stats`
    };
  } catch (error) {
    console.error("Unexpected error fetching stats count:", error);
    return {
      count: 0,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};