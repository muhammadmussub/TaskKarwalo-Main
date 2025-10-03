import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceAnalytics {
  category: string;
  count: number;
  averagePrice: number;
  providers: number;
  completionRate: number;
}

const ServiceAnalyticsTable: React.FC = () => {
  const [services, setServices] = useState<ServiceAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadServiceAnalytics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('service-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        () => {
          console.log('Services changed, refreshing analytics...');
          loadServiceAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Bookings changed, refreshing analytics...');
          loadServiceAnalytics();
        }
      )
      .subscribe();
      
    // Set up auto-refresh interval (every 3 minutes)
    const interval = setInterval(() => {
      loadServiceAnalytics();
    }, 180000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadServiceAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get all services grouped by category
      const { data: categoryCounts, error: categoryError } = await supabase
        .from('services')
        .select('category, base_price')
        .eq('is_active', true);
        
      if (categoryError) throw categoryError;
      
      // Get all distinct provider IDs grouped by service category
      const { data: providerCounts, error: providerError } = await supabase
        .from('services')
        .select('category, provider_id')
        .eq('is_active', true);
        
      if (providerError) throw providerError;
      
      // Get all bookings to calculate completion rate
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('service_id, status');
        
      if (bookingsError) throw bookingsError;
      
      // Get all services to map service_id to category
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('id, category');
        
      if (servicesError) throw servicesError;
        
      // Create a map of service_id to category
      const serviceIdToCategoryMap = allServices?.reduce((acc: {[key: string]: string}, service) => {
        acc[service.id] = service.category;
        return acc;
      }, {}) || {};
      
      // Process data to get analytics by category
      const categoryMap: {[key: string]: any} = {};
      
      // Count services by category and calculate average price
      categoryCounts?.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = {
            category: item.category,
            count: 0,
            totalPrice: 0,
            providers: new Set(),
            completed: 0,
            total: 0
          };
        }
        
        categoryMap[item.category].count += 1;
        categoryMap[item.category].totalPrice += item.base_price || 0;
      });
      
      // Count unique providers by category
      providerCounts?.forEach(item => {
        if (categoryMap[item.category]) {
          categoryMap[item.category].providers.add(item.provider_id);
        }
      });
      
      // Calculate completion rate by category
      bookings?.forEach(booking => {
        const category = serviceIdToCategoryMap[booking.service_id];
        if (category && categoryMap[category]) {
          categoryMap[category].total += 1;
          if (booking.status === 'completed') {
            categoryMap[category].completed += 1;
          }
        }
      });
      
      // Convert to final format
      const analyticsData = Object.values(categoryMap).map((item: any) => ({
        category: item.category,
        count: item.count,
        averagePrice: item.count > 0 ? Math.round(item.totalPrice / item.count) : 0,
        providers: item.providers.size,
        completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
      }));
      
      // Sort by service count (descending)
      analyticsData.sort((a, b) => b.count - a.count);
      
      setServices(analyticsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading service analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeVariant = (rate: number) => {
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'just now';
    } else if (seconds < 120) {
      return '1 minute ago';
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes ago`;
    } else if (seconds < 7200) {
      return '1 hour ago';
    } else {
      return `${Math.floor(seconds / 3600)} hours ago`;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Category Analytics</CardTitle>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Last updated: {formatTimeAgo(lastUpdated)}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadServiceAnalytics}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={services} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === "averagePrice") {
                      return [`PKR ${value.toLocaleString()}`, "Average Price"];
                    }
                    return [value, name === "count" ? "Services" : "Providers"];
                  }} />
                  <Bar yAxisId="left" dataKey="count" name="Services" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="providers" name="Providers" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {services.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-muted-foreground">No service categories available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Category</TableHead>
                    <TableHead className="text-right">Services Count</TableHead>
                    <TableHead className="text-right">Avg. Price (PKR)</TableHead>
                    <TableHead className="text-right">Providers</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.category}>
                      <TableCell className="font-medium">{service.category}</TableCell>
                      <TableCell className="text-right">{service.count}</TableCell>
                      <TableCell className="text-right">PKR {service.averagePrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{service.providers}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getBadgeVariant(service.completionRate)}>
                          {service.completionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceAnalyticsTable;