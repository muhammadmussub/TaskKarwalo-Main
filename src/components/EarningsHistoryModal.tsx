import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";

interface EarningsHistoryData {
  date: string;
  earnings: number;
  bookings: number;
  commission: number;
}

interface EarningsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
}

const EarningsHistoryModal: React.FC<EarningsHistoryModalProps> = ({
  isOpen,
  onClose,
  providerId
}) => {
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsHistoryData[]>([]);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('3months');

  useEffect(() => {
    if (isOpen && providerId) {
      loadEarningsHistory();
    }
  }, [isOpen, providerId, timeRange]);

  const loadEarningsHistory = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected time range
      const endDate = new Date();
      const startDate = timeRange === '3months' ? subMonths(endDate, 3) :
                       timeRange === '6months' ? subMonths(endDate, 6) :
                       subMonths(endDate, 12);

      // Get all bookings for the provider within the date range
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerId)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Generate daily data for the entire period
      const dailyData: { [key: string]: EarningsHistoryData } = {};

      // Initialize all days in the range with zero values
      const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
      daysInRange.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        dailyData[dateKey] = {
          date: dateKey,
          earnings: 0,
          bookings: 0,
          commission: 0
        };
      });

      // Aggregate booking data by day
      bookings?.forEach(booking => {
        if (booking.completed_at && booking.status === 'completed') {
          const dateKey = format(new Date(booking.completed_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            const earnings = booking.final_price || booking.proposed_price;
            dailyData[dateKey].earnings += earnings;
            dailyData[dateKey].bookings += 1;
            dailyData[dateKey].commission += earnings * 0.05; // 5% commission
          }
        }
      });

      // Convert to array and sort by date
      const formattedData = Object.values(dailyData)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
          ...item,
          date: format(new Date(item.date), 'MMM dd'),
          formattedEarnings: new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
          }).format(item.earnings)
        }));

      setEarningsData(formattedData);
    } catch (error) {
      console.error('Error loading earnings history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">
                {entry.dataKey === 'earnings' || entry.dataKey === 'commission'
                  ? formatPrice(entry.value)
                  : entry.value
                }
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalEarnings = earningsData.reduce((sum, day) => sum + day.earnings, 0);
  const totalBookings = earningsData.reduce((sum, day) => sum + day.bookings, 0);
  const totalCommission = earningsData.reduce((sum, day) => sum + day.commission, 0);
  const averageDaily = earningsData.length > 0 ? totalEarnings / earningsData.length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(0,0%,95%)]">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Earnings History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Earnings</p>
                    <p className="text-lg font-bold text-white">{formatPrice(totalEarnings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Bookings</p>
                    <p className="text-lg font-bold text-white">{totalBookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Avg Daily</p>
                    <p className="text-lg font-bold text-white">{formatPrice(averageDaily)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-sm text-gray-400">Commission</p>
                    <p className="text-lg font-bold text-white">{formatPrice(totalCommission)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {timeRange === '3months' ? 'Last 3 Months' :
                 timeRange === '6months' ? 'Last 6 Months' : 'Last Year'}
              </Badge>
              <div className="flex gap-1">
                {(['3months', '6months', '1year'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={timeRange === range ? "bg-blue-600 text-white" : ""}
                  >
                    {range === '3months' ? '3M' : range === '6months' ? '6M' : '1Y'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'chart' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('chart')}
                className={viewMode === 'chart' ? "bg-blue-600 text-white" : ""}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? "bg-blue-600 text-white" : ""}
              >
                <Activity className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
          </div>

          {/* Chart/Table Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6">
              {viewMode === 'chart' ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={earningsData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(value) => `₨${value/1000}k`}
                        tick={{ fontSize: 10 }}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="earnings"
                        name="Earnings (₨)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="commission"
                        name="Commission (₨)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-2 text-gray-400">Date</th>
                        <th className="text-right p-2 text-gray-400">Earnings</th>
                        <th className="text-right p-2 text-gray-400">Bookings</th>
                        <th className="text-right p-2 text-gray-400">Commission</th>
                        <th className="text-right p-2 text-gray-400">Avg per Job</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.map((day, index) => (
                        <tr key={index} className="border-b border-gray-700/50">
                          <td className="p-2 text-white">{day.date}</td>
                          <td className="p-2 text-right text-green-400">{formatPrice(day.earnings)}</td>
                          <td className="p-2 text-right text-blue-400">{day.bookings}</td>
                          <td className="p-2 text-right text-red-400">{formatPrice(day.commission)}</td>
                          <td className="p-2 text-right text-purple-400">
                            {day.bookings > 0 ? formatPrice(day.earnings / day.bookings) : formatPrice(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EarningsHistoryModal;