import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CommissionStatsTester: React.FC = () => {
  const [commissionStats, setCommissionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionStats();
  }, []);

  const fetchCommissionStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('realtime_stats')
        .select('*')
        .eq('stat_type', 'commission')
        .eq('stat_name', 'total_commission')
        .single();

      if (error) throw error;
      setCommissionStats(data);
    } catch (error) {
      console.error('Error fetching commission stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerStatsRefresh = async () => {
    try {
      setLoading(true);
      // @ts-ignore: Supabase RPC function type not properly defined
      const { error } = await supabase.rpc('refresh_realtime_stats');
      if (error) throw error;
      fetchCommissionStats();
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission Stats Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Stats Tester</CardTitle>
      </CardHeader>
      <CardContent>
        {commissionStats ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Total Commission</h3>
              <p className="text-2xl font-bold text-primary">
                PKR {commissionStats.stat_value?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Trend: {commissionStats.stat_trend?.toFixed(2) || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm">
                Last updated: {new Date(commissionStats.updated_at).toLocaleString()}
              </p>
            </div>
            <Button onClick={triggerStatsRefresh} variant="outline">
              Refresh Stats
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground">No commission data found</p>
            <Button onClick={triggerStatsRefresh} variant="outline" className="mt-2">
              Initialize Stats
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionStatsTester;