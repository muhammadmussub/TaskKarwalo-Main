import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from "@/integrations/supabase/client";
import { testRealtimeStats } from '@/utils/testRealtimeStats';
import StatsRefreshButton from '@/components/StatsRefreshButton';

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

const RealtimeStatsTester: React.FC = () => {
  const [stats, setStats] = useState<RealtimeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch initial stats and set up real-time subscription
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('realtime_stats')
          .select('*')
          .eq('time_period', 'current')
          .order('updated_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error('Error fetching stats:', error);
          setMessage('Error fetching stats: ' + error.message);
        } else {
          setStats(data || []);
          setMessage(`Loaded ${data?.length || 0} stats`);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setMessage('Unexpected error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-stats-tester')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_stats',
        },
        (payload) => {
          console.log('New stat inserted:', payload);
          setMessage('New stat inserted: ' + payload.new.stat_name);
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'realtime_stats',
        },
        (payload) => {
          console.log('Stat updated:', payload);
          setMessage('Stat updated: ' + payload.new.stat_name);
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'realtime_stats',
        },
        (payload) => {
          console.log('Stat deleted:', payload);
          setMessage('Stat deleted: ' + payload.old.stat_name);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setMessage('Running tests...');
    
    try {
      await testRealtimeStats();
      setMessage('Tests completed successfully!');
    } catch (error) {
      setMessage('Test error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('realtime_stats')
        .select('*')
        .eq('time_period', 'current')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        setMessage('Error refreshing stats: ' + error.message);
      } else {
        setStats(data || []);
        setMessage(`Refreshed ${data?.length || 0} stats`);
      }
    } catch (err) {
      setMessage('Refresh error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Stats Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <StatsRefreshButton onStatsUpdate={() => {
            // Refresh the stats display
            const fetchStats = async () => {
              try {
                const { data, error } = await supabase
                  .from('realtime_stats')
                  .select('*')
                  .eq('time_period', 'current')
                  .order('updated_at', { ascending: false })
                  .limit(20);
                
                if (error) {
                  console.error('Error fetching stats:', error);
                  setMessage('Error fetching stats: ' + error.message);
                } else {
                  setStats(data || []);
                  setMessage(`Loaded ${data?.length || 0} stats`);
                }
              } catch (err) {
                console.error('Unexpected error:', err);
                setMessage('Unexpected error: ' + (err instanceof Error ? err.message : 'Unknown error'));
              } finally {
                setLoading(false);
              }
            };
            
            fetchStats();
          }} />
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Run Tests'}
            </Button>
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              {loading ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </div>
          
          {message && (
            <div className="p-2 bg-blue-100 text-blue-800 rounded">
              {message}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-4">Loading stats...</div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold">Current Stats ({stats.length} items)</h3>
              {stats.length === 0 ? (
                <p className="text-muted-foreground">No stats found</p>
              ) : (
                <div className="max-h-96 overflow-y-auto border rounded p-2">
                  {stats.map((stat) => (
                    <div key={stat.id} className="border-b py-2 last:border-b-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{stat.stat_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat.stat_type}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Value: {stat.stat_value.toFixed(2)}</span>
                        <span>
                          Trend: {stat.stat_trend !== null ? stat.stat_trend.toFixed(2) : 'N/A'}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date(stat.updated_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeStatsTester;