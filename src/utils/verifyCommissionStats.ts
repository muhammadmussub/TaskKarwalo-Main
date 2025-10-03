import { supabase } from "@/integrations/supabase/client";

export const verifyCommissionStats = async () => {
  try {
    // Fetch commission stats from the database
    const { data, error } = await supabase
      .from('realtime_stats')
      .select('*')
      .eq('stat_type', 'commission')
      .eq('stat_name', 'total_commission')
      .single();

    if (error) {
      console.error('Error fetching commission stats:', error);
      return null;
    }

    console.log('Commission stats:', data);
    return data;
  } catch (error) {
    console.error('Error in verifyCommissionStats:', error);
    return null;
  }
};

// Test the function
if (typeof window !== 'undefined') {
  verifyCommissionStats();
}