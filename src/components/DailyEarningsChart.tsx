import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';

interface DailyEarningsData {
  date: string;
  earnings: number;
  bookings: number;
}

interface DailyEarningsChartProps {
  data: DailyEarningsData[];
}

const DailyEarningsChart: React.FC<DailyEarningsChartProps> = ({ data }) => {
  // Format the data for display
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
    formattedEarnings: new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(item.earnings)
  }));

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
          <p className="text-blue-600 dark:text-blue-400">
            Earnings: <span className="font-semibold">{formatPrice(payload[0].value)}</span>
          </p>
          <p className="text-green-600 dark:text-green-400">
            Bookings: <span className="font-semibold">{payload[1].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)] shadow-md h-full">
      <CardHeader className="pb-2">
        <CardTitle>Daily Earnings</CardTitle>
        <CardDescription>
          Your earnings and bookings over the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                tickFormatter={(value) => `₨${value/1000}k`}
                tick={{ fontSize: 10 }}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="earnings"
                name="Earnings (₨)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyEarningsChart;