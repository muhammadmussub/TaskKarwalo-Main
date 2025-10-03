# Real-time Stats Implementation

## Overview

This document explains how the real-time statistics functionality works in the TaskKarwalo application. The system automatically tracks and displays key metrics in real-time using Supabase as the backend.

## Database Structure

### `realtime_stats` Table

The core of the real-time stats functionality is the `realtime_stats` table in Supabase:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique identifier |
| stat_type | TEXT | Category of the statistic (e.g., 'users', 'revenue') |
| stat_name | TEXT | Name of the specific metric (e.g., 'active_users') |
| stat_value | DOUBLE PRECISION | Current value of the metric |
| stat_trend | DOUBLE PRECISION | Percentage change trend |
| time_period | TEXT | Time period identifier (typically 'current') |
| created_at | TIMESTAMPTZ | Timestamp when record was created |
| updated_at | TIMESTAMPTZ | Timestamp when record was last updated |

## How It Works

### 1. Automatic Data Collection

The system uses PostgreSQL functions and triggers to automatically collect and update statistics:

1. **`refresh_realtime_stats()`** - A PostgreSQL function that calculates all metrics
2. **Triggers** - Automatically call the refresh function when relevant data changes:
   - When profiles are inserted/updated/deleted
   - When provider profiles are inserted/updated/deleted
   - When bookings are inserted/updated/deleted
   - When services are inserted/updated/deleted

### 2. Real-time Updates

The frontend uses Supabase's real-time subscriptions to receive immediate updates when statistics change:

```typescript
const channel = supabase
  .channel('realtime-stats')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'realtime_stats',
    },
    (payload) => {
      // Handle new stats
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
      // Handle updated stats
    }
  )
  .subscribe();
```

### 3. Trend Calculation

The system automatically calculates trends by comparing current values with previous values:

- For each metric, it stores the previous value
- When updating, it calculates the percentage change
- Trends are displayed as positive or negative percentages

## Available Metrics

### User Metrics
- **Active Users**: Users active in the last 5 minutes
- **Total Users**: All registered users

### Provider Metrics
- **Total Providers**: All service providers
- **Task Completion Rate**: Percentage of completed bookings

### Business Metrics
- **Total Revenue**: Sum of all commission amounts
- **Service Categories**: Count of unique service categories

## Manual Refresh

Administrators can manually trigger a stats refresh using the "Refresh Stats" button in the admin dashboard. This is useful for:

- Forcing an update after manual data changes
- Testing the system
- Troubleshooting display issues

## Testing

The system includes built-in testing components:

1. **RealtimeStatsTester** - A component in the admin dashboard for testing
2. **Test Functions** - Utility functions for inserting test data
3. **Verification Tools** - Buttons to verify functionality

## Troubleshooting

### Common Issues

1. **Stats not updating**
   - Check if the Supabase triggers are working
   - Verify the `refresh_realtime_stats()` function
   - Ensure real-time subscriptions are active

2. **Permission errors**
   - Verify RLS policies on the `realtime_stats` table
   - Ensure the admin user has proper permissions

3. **Performance issues**
   - The refresh function runs automatically on data changes
   - For high-traffic systems, consider optimizing queries

### Manual Testing

1. Navigate to the Admin Dashboard → Analytics tab
2. Use the "Insert Test Stat" button to add a test metric
3. Verify the stat appears in the tester component
4. Use "Refresh Stats" to manually trigger an update
5. Check that trends are calculated correctly

## Future Enhancements

1. **Historical Data**: Store time-series data for charting
2. **Custom Metrics**: Allow admins to define custom metrics
3. **Alerts**: Notify admins when metrics exceed thresholds
4. **Export**: Allow exporting stats data to CSV/Excel