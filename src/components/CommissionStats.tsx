import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, TrendingUp, TrendingDown, Receipt } from 'lucide-react';

interface CommissionStat {
  id: string;
  stat_type: string;
  stat_name: string;
  stat_value: number;
  stat_trend: number | null;
  time_period: string;
  created_at: string;
  updated_at: string;
}

const CommissionStats: React.FC = () => {
  const [commissionData, setCommissionData] = useState<CommissionStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch commission stats from database
  const fetchCommissionStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('realtime_stats')
        .select('*')
        .eq('stat_type', 'commission')
        .eq('stat_name', 'total_commission')
        .maybeSingle();

      if (error) {
        console.error('Error fetching commission stats:', error);
      } else {
        setCommissionData(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh stats manually
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Call the Supabase function to refresh stats
      // @ts-ignore: Supabase RPC function type not properly defined
      const { error } = await supabase.rpc('refresh_realtime_stats');
      
      if (error) {
        console.error("Error refreshing stats:", error);
      } else {
        await fetchCommissionStats(); // Refetch stats after refresh
      }
    } catch (error) {
      console.error("Error refreshing stats:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Set up initial fetch and real-time subscription
  useEffect(() => {
    fetchCommissionStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('commission-stats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stats',
          filter: 'stat_name=eq.total_commission'
        },
        () => {
          fetchCommissionStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Commission Stats</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-full bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {commissionData ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Total Commission</h3>
                      <p className="text-2xl font-bold">
                        PKR {commissionData.stat_value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {commissionData.stat_trend !== null && (
                    <div 
                      className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                        ${commissionData.stat_trend >= 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'}`}
                    >
                      {commissionData.stat_trend >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {commissionData.stat_trend >= 0 ? '+' : ''}
                      {commissionData.stat_trend.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(commissionData.updated_at).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No commission data found</p>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Initialize Stats
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionStats;