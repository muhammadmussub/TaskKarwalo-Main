import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const TestRealtimeStats: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('realtime_stats')
          .select('*')
          .eq('time_period', 'current');
        
        if (error) {
          console.error('Error fetching stats:', error);
        } else {
          setStats(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('test-realtime-stats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_stats',
        },
        (payload) => {
          console.log('New stat inserted:', payload);
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
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div>Loading real-time stats...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Real-time Stats Test</h2>
      {stats.length === 0 ? (
        <p>No stats found in the database.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.id} className="border p-4 rounded-lg">
              <h3 className="font-bold">{stat.stat_name}</h3>
              <p>Type: {stat.stat_type}</p>
              <p>Value: {stat.stat_value}</p>
              <p>Trend: {stat.stat_trend !== null ? stat.stat_trend.toFixed(2) : 'N/A'}</p>
              <p>Updated: {new Date(stat.updated_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestRealtimeStats;