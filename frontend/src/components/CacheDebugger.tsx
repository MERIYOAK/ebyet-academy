import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CacheManager } from '../utils/cacheManager';
import { cachePersister } from '../lib/queryClient';

const CacheDebugger: React.FC = () => {
  const queryClient = useQueryClient();
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [localStorageInfo, setLocalStorageInfo] = useState<any>(null);

  const refreshCacheInfo = () => {
    try {
      // Get React Query cache info
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const reactQueryInfo = {
        totalQueries: queries.length,
        queries: queries.map(query => ({
          queryKey: query.queryKey,
          status: query.state.status,
          dataUpdatedAt: query.state.dataUpdatedAt,
          isStale: query.state.isStale,
          hasData: !!query.state.data,
          dataSize: query.state.data ? JSON.stringify(query.state.data).length : 0
        }))
      };

      // Get localStorage cache info
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('qendiel-cache') || key.startsWith('kandel-academy-cache')
      );
      
      const localStorageData = localStorageKeys.map(key => {
        const value = localStorage.getItem(key);
        let parsedValue = null;
        try {
          parsedValue = value ? JSON.parse(value) : null;
        } catch (e) {
          parsedValue = { error: 'Failed to parse' };
        }
        
        return {
          key,
          size: value ? value.length : 0,
          data: parsedValue,
          timestamp: parsedValue?.timestamp ? new Date(parsedValue.timestamp).toLocaleString() : 'N/A'
        };
      });

      // Get cache manager stats
      const cacheStats = CacheManager.getCacheStats();

      setCacheInfo({
        reactQuery: reactQueryInfo,
        cacheStats,
        localStorage: localStorageData
      });

    } catch (error) {
      console.error('Error getting cache info:', error);
      setCacheInfo({ error: error.message });
    }
  };

  useEffect(() => {
    refreshCacheInfo();
    const interval = setInterval(refreshCacheInfo, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const clearAllCache = () => {
    CacheManager.clearAllCache();
    refreshCacheInfo();
  };

  const clearOldCache = () => {
    const oldKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('kandel-academy-cache')
    );
    oldKeys.forEach(key => localStorage.removeItem(key));
    refreshCacheInfo();
  };

  if (!cacheInfo) {
    return <div>Loading cache debugger...</div>;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px', 
      borderRadius: '5px',
      maxWidth: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Cache Debugger</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={refreshCacheInfo} style={{ marginRight: '5px', fontSize: '11px' }}>
          Refresh
        </button>
        <button onClick={clearAllCache} style={{ marginRight: '5px', fontSize: '11px' }}>
          Clear All
        </button>
        <button onClick={clearOldCache} style={{ fontSize: '11px' }}>
          Clear Old
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>React Query Cache:</strong>
        <div>Total Queries: {cacheInfo.reactQuery?.totalQueries || 0}</div>
        {cacheInfo.reactQuery?.queries?.map((query: any, index: number) => (
          <div key={index} style={{ 
            marginLeft: '10px', 
            fontSize: '11px',
            border: '1px solid #eee',
            padding: '5px',
            margin: '5px 0'
          }}>
            <div><strong>Key:</strong> {JSON.stringify(query.queryKey)}</div>
            <div><strong>Status:</strong> {query.status}</div>
            <div><strong>Has Data:</strong> {query.hasData ? 'Yes' : 'No'}</div>
            <div><strong>Data Size:</strong> {query.dataSize} bytes</div>
            <div><strong>Is Stale:</strong> {query.isStale ? 'Yes' : 'No'}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>localStorage Cache:</strong>
        {cacheInfo.localStorage?.map((item: any, index: number) => (
          <div key={index} style={{ 
            marginLeft: '10px', 
            fontSize: '11px',
            border: '1px solid #eee',
            padding: '5px',
            margin: '5px 0'
          }}>
            <div><strong>Key:</strong> {item.key}</div>
            <div><strong>Size:</strong> {item.size} bytes</div>
            <div><strong>Timestamp:</strong> {item.timestamp}</div>
            <div><strong>Has Data:</strong> {item.data?.data ? 'Yes' : 'No'}</div>
          </div>
        ))}
      </div>

      <div>
        <strong>Cache Stats:</strong>
        <div>Memory Cache Size: {cacheInfo.cacheStats?.memoryCache?.size || 0}</div>
        <div>Persistent Cache Size: {cacheInfo.cacheStats?.persistentCache?.size || 0}</div>
      </div>
    </div>
  );
};

export default CacheDebugger;
