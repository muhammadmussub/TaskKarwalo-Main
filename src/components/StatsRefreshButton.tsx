import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { triggerStatsRefresh, insertTestStat, getStatsCount } from '@/utils/triggerStatsRefresh';

interface StatsRefreshButtonProps {
  onStatsUpdate?: () => void;
}

const StatsRefreshButton: React.FC<StatsRefreshButtonProps> = ({ onStatsUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('Refreshing stats...');
    
    try {
      const result = await triggerStatsRefresh();
      setMessage(result.message);
      
      // Call the callback if provided
      if (onStatsUpdate) {
        onStatsUpdate();
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      setMessage(result.message);
      
      // Call the callback if provided
      if (onStatsUpdate) {
        onStatsUpdate();
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleGetCount = async () => {
    setLoading(true);
    setMessage('Fetching stats count...');
    
    try {
      const result = await getStatsCount();
      setMessage(result.message);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 p-4 border rounded-lg">
      <h3 className="font-semibold">Stats Management</h3>
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={handleRefresh} 
          disabled={loading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
        <Button 
          onClick={handleInsertTest} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Insert Test Stat
        </Button>
        <Button 
          onClick={handleGetCount} 
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          Get Count
        </Button>
      </div>
      {message && (
        <div className="mt-2 px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded">
          {message}
        </div>
      )}
    </div>
  );
};

export default StatsRefreshButton;