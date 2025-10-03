import { supabase } from "@/integrations/supabase/client";

export const refreshRealtimeStats = async () => {
  try {
    // Call the refresh function directly
    const { data, error } = await supabase.rpc('refresh_realtime_stats');
    
    if (error) {
      console.error('Error refreshing stats:', error);
      return { success: false, error };
    }
    
    console.log('Stats refreshed successfully');
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: err };
  }
};

export const insertTestStat = async () => {
  try {
    const { data, error } = await supabase
      .from('realtime_stats')
      .insert({
        stat_type: 'test',
        stat_name: 'test_stat',
        stat_value: Math.floor(Math.random() * 100),
        stat_trend: Math.random() * 10 - 5,
        time_period: 'current'
      })
      .select();
    
    if (error) {
      console.error('Error inserting test stat:', error);
      return { success: false, error };
    }
    
    console.log('Test stat inserted:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: err };
  }
};