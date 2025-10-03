import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, Receipt, Database, Activity } from 'lucide-react';

interface RealtimeStat {
  id: string;
  stat_type: string;
  stat_name: string;
  stat_value: number;
  stat_trend: number | null;
  time_period: string;
  created_at: string;
  updated_at: string;
}

interface StatDisplayProps {
  title: string;
  value: string | number;
  trend: number | null;
  icon: React.ReactNode;
  isLoading: boolean;
}

const StatDisplay: React.FC<StatDisplayProps> = ({ title, value, trend, icon, isLoading }) => (
  <div className="border rounded-lg p-4 bg-card">
    <div className="flex justify-between">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {isLoading ? (
          <div className="h-5 w-20 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold">{value}</p>
            {trend !== null && (
              <span className={`text-xs flex items-center font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/20">
        {icon}
      </div>
    </div>
  </div>
);

const RealTimeStats: React.FC = () => {
  const [stats, setStats] = useState<RealtimeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Organize stats by type
  const getStatByName = (name: string): RealtimeStat | undefined => {
    return stats.find(stat => stat.stat_name === name);
  };

  // Fetch stats from the database
  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('realtime_stats')
        .select('*')
        .eq('time_period', 'current')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching stats:', error);
      } else {
        setStats(data || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Unexpected error:', err);
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
        await fetchStats(); // Refetch stats after refresh
      }
    } catch (error) {
      console.error("Error refreshing stats:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Set up initial fetch and real-time subscription
  useEffect(() => {
    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-stats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stats',
        },
        () => {
          fetchStats();
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
        <CardTitle className="text-base font-semibold">Platform Statistics</CardTitle>
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
        <div className="space-y-4">
          {/* User Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatDisplay
              title="Active Users"
              value={getStatByName('active_users')?.stat_value.toLocaleString() || '0'}
              trend={getStatByName('active_users')?.stat_trend || null}
              icon={<Users className="h-5 w-5 text-primary" />}
              isLoading={loading}
            />
            <StatDisplay
              title="Total Users"
              value={getStatByName('total_users')?.stat_value.toLocaleString() || '0'}
              trend={getStatByName('total_users')?.stat_trend || null}
              icon={<Users className="h-5 w-5 text-primary" />}
              isLoading={loading}
            />
          </div>

          {/* Provider Stats */}
          <div className="grid grid-cols-1 gap-4">
            <StatDisplay
              title="Service Providers"
              value={getStatByName('total_providers')?.stat_value.toLocaleString() || '0'}
              trend={getStatByName('total_providers')?.stat_trend || null}
              icon={<Activity className="h-5 w-5 text-primary" />}
              isLoading={loading}
            />
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 gap-4">
            <StatDisplay
              title="Total Revenue"
              value={`PKR ${getStatByName('total_revenue')?.stat_value.toLocaleString() || '0'}`}
              trend={getStatByName('total_revenue')?.stat_trend || null}
              icon={<Receipt className="h-5 w-5 text-primary" />}
              isLoading={loading}
            />
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-muted-foreground text-right">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeStats;