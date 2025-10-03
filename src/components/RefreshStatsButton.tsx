import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { refreshRealtimeStats, insertTestStat } from '@/utils/refreshStats';

const RefreshStatsButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('Refreshing stats...');
    
    try {
      const result = await refreshRealtimeStats();
      if (result.success) {
        setMessage('Stats refreshed successfully!');
      } else {
        setMessage(`Error: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleInsertTest = async () => {
    setLoading(true);
    setMessage('Inserting test stat...');
    
    try {
      const result = await insertTestStat();
      if (result.success) {
        setMessage('Test stat inserted successfully!');
      } else {
        setMessage(`Error: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-2">
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </Button>
        <Button onClick={handleInsertTest} disabled={loading} variant="outline">
          {loading ? 'Inserting...' : 'Insert Test Stat'}
        </Button>
      </div>
      {message && (
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md">
          {message}
        </div>
      )}
    </div>
  );
};

export default RefreshStatsButton;