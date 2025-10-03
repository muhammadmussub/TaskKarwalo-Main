import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter, UserX, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface UserStrikeData {
  user_id: string;
  phone: string;
  phone_verified: boolean;
  full_name: string;
  email: string;
  no_show_strikes_count: number;
  last_strike_date: string | null;
  is_suspended: boolean;
  suspension_end_time: string | null;
  recent_strikes: Array<{
    id: string;
    strike_date: string;
    reason: string;
    provider_name: string;
  }>;
}

const UserReliabilityMonitor = () => {
  const [users, setUsers] = useState<UserStrikeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStrikes, setFilterStrikes] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscriptions for strikes and suspensions
    const strikesChannel = supabase
      .channel('admin-strikes-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_strikes'
        },
        (payload) => {
          console.log('Strike change detected:', payload);
          fetchUsers(); // Refresh the data
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_suspensions'
        },
        (payload) => {
          console.log('Suspension change detected:', payload);
          fetchUsers(); // Refresh the data
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(strikesChannel);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users for reliability monitor...');

      // First, let's try to get users with the old system (no_show_strikes table)
      // This will work if the old system is still in place
      const { data: oldSystemData, error: oldSystemError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          phone,
          phone_verified,
          full_name,
          email,
          no_show_strikes_count,
          last_strike_date,
          is_suspended,
          suspension_end_time
        `)
        .gt('no_show_strikes_count', 0)
        .order('last_strike_date', { ascending: false });

      if (!oldSystemError && oldSystemData && oldSystemData.length > 0) {
        console.log('Found users with old strike system:', oldSystemData.length);

        // Get recent strikes for old system
        const usersWithStrikes = await Promise.all(
          (oldSystemData || []).map(async (user) => {
            const { data: strikesData } = await supabase
              .from('no_show_strikes')
              .select(`
                id,
                strike_date,
                reason,
                provider_id,
                provider_profiles!no_show_strikes_provider_id_fkey(business_name)
              `)
              .eq('user_id', user.user_id)
              .order('strike_date', { ascending: false })
              .limit(5);

            return {
              ...user,
              recent_strikes: strikesData?.map(strike => ({
                id: strike.id,
                strike_date: strike.strike_date,
                reason: strike.reason,
                provider_name: (strike as any).provider_profiles?.business_name || 'Unknown Provider'
              })) || []
            };
          })
        );

        setUsers(usersWithStrikes);
        return;
      }

      // If old system doesn't have data, try the new system
      console.log('Old system empty, trying new strike system...');

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          phone,
          phone_verified,
          full_name,
          email
        `)
        .limit(1000); // Get recent users

      if (usersError) {
        console.error('Error fetching profiles:', usersError);
        throw usersError;
      }

      console.log('Found profiles:', usersData?.length || 0);

      // For each user, get their strike and suspension data using database functions
      const usersWithStrikeData = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            console.log('Processing user:', user.user_id);

            // Get active strikes count using database function
            const { data: strikesCountData, error: strikesError } = await (supabase as any)
              .rpc('get_user_active_strikes', { user_id_param: user.user_id });

            if (strikesError) {
              console.log('RPC function not available, using fallback method');
              return null; // Skip users for now if RPC not available
            }

            // Get suspension status using database function
            const { data: suspensionData, error: suspensionError } = await (supabase as any)
              .rpc('get_user_suspension_status', { user_id_param: user.user_id });

            if (suspensionError) {
              console.log('Suspension RPC not available');
            }

            // Get recent strikes from user_strikes table
            const { data: strikesData, error: strikesQueryError } = await (supabase as any)
              .from('user_strikes')
              .select('*')
              .eq('user_id', user.user_id)
              .eq('is_no_show', true)
              .order('created_at', { ascending: false })
              .limit(5);

            if (strikesQueryError) {
              console.log('user_strikes table not available');
            }

            const strikesCount = strikesCountData || 0;

            // Determine suspension status
            // Priority: Database suspension status > Strike count logic
            let isSuspended = false;
            let suspensionEnd = null;
            let suspensionReason = null;

            if (suspensionData?.[0]) {
              // Use database suspension data if available
              isSuspended = suspensionData[0].is_suspended;
              suspensionEnd = suspensionData[0].suspension_end;
              suspensionReason = suspensionData[0].suspension_reason;
              console.log('Using database suspension data:', suspensionData[0]);
            } else if (strikesCount >= 3) {
              // Fallback: If no database suspension but user has 3+ strikes, they should be suspended
              isSuspended = true;
              suspensionEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours from now
              suspensionReason = 'Automated suspension: 3+ no-show strikes (database record missing)';
              console.log('Using strike count fallback for suspension');
            }

            const suspension = {
              is_suspended: isSuspended,
              suspension_end: suspensionEnd,
              suspension_reason: suspensionReason,
              strikes_count: strikesCount
            };

            console.log('Final suspension status:', {
              userId: user.user_id,
              strikesCount,
              hasDBSuspension: !!suspensionData?.[0],
              isSuspended,
              reason: suspensionReason
            });

            // Only include users with strikes or suspensions
            if (strikesCount > 0 || suspension.is_suspended) {
              return {
                ...user,
                no_show_strikes_count: strikesCount,
                last_strike_date: (strikesData as any)?.[0]?.created_at || null,
                is_suspended: suspension.is_suspended,
                suspension_end_time: suspension.suspension_end,
                recent_strikes: (strikesData as any)?.map((strike: any) => ({
                  id: strike.id,
                  strike_date: strike.created_at,
                  reason: strike.strike_reason,
                  provider_name: 'Provider'
                })) || []
              };
            }

            return null;
          } catch (error) {
            console.error('Error processing user:', user.user_id, error);
            return null;
          }
        })
      );

      // Filter out null values
      const validUsers = usersWithStrikeData.filter(user => user !== null);
      console.log('Valid users with strikes/suspensions:', validUsers.length);
      setUsers(validUsers);

    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load user data: " + error.message);
      setUsers([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (userId: string, action: 'reenable' | 'extend' | 'cancel_suspension') => {
    try {
      if (action === 'reenable') {
        // Remove active suspensions
        const { error: suspensionError } = await supabase
          .from('user_suspensions')
          .update({
            is_active: false,
            lifted_at: new Date().toISOString(),
            lifted_by: (await supabase.auth.getUser()).data.user?.id,
            lift_reason: 'Manually re-enabled by admin'
          })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (suspensionError) throw suspensionError;

        toast.success("User account re-enabled successfully");
      } else if (action === 'extend') {
        // Extend suspension by 24 hours
        const { error: extendError } = await supabase
          .from('user_suspensions')
          .insert({
            user_id: userId,
            suspension_reason: 'Manual extension by admin',
            suspension_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (extendError) throw extendError;

        toast.success("User suspension extended by 24 hours");
      } else if (action === 'cancel_suspension') {
        // Use the database function to reset strikes and cancel suspension
        const { data: resetResult, error: resetError } = await (supabase as any)
          .rpc('admin_reset_user_strikes', {
            target_user_id: userId,
            admin_user_id: (await supabase.auth.getUser()).data.user?.id || null
          });

        if (resetError) {
          console.error('Error calling admin_reset_user_strikes:', resetError);
          throw resetError;
        }

        if (resetResult) {
          toast.success("Suspension cancelled and strikes reset to 0");
        } else {
          toast.info("No active strikes found to reset");
        }
      }

      fetchUsers(); // Refresh the data
    } catch (error: any) {
      console.error('Error with manual override:', error);
      toast.error("Failed to update user status: " + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStrikes = filterStrikes === "all" ||
      (filterStrikes === "high" && user.no_show_strikes_count >= 3) ||
      (filterStrikes === "medium" && user.no_show_strikes_count === 2) ||
      (filterStrikes === "low" && user.no_show_strikes_count === 1);

    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "suspended" && user.is_suspended) ||
      (filterStatus === "active" && !user.is_suspended);

    return matchesSearch && matchesStrikes && matchesStatus;
  });

  const getSuspensionTimeRemaining = (endTime: string | null) => {
    if (!endTime) return null;
    const remaining = new Date(endTime).getTime() - new Date().getTime();
    const hours = Math.ceil(remaining / (1000 * 60 * 60));
    return hours > 0 ? `${hours} hours` : "Expired";
  };

  const testStrikeSystem = async () => {
    try {
      console.log('Testing strike system...');

      // Test if we can call the RPC functions
      const { data: testStrikes, error: testError } = await (supabase as any)
        .rpc('get_user_active_strikes', {
          user_id_param: '00000000-0000-0000-0000-000000000000'
        });

      console.log('RPC test result:', { testStrikes, testError });

      if (testError) {
        toast.error('Strike system not fully set up. Database functions may be missing.');
      } else {
        toast.success('Strike system is working! Ready to receive real data.');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Error testing strike system');
    }
  };

  const fixUserSuspension = async (userId: string) => {
    try {
      console.log('Fixing suspension for user:', userId);

      // Get current strike count
      const { data: strikesCountData, error: strikesError } = await (supabase as any)
        .rpc('get_user_active_strikes', { user_id_param: userId });

      if (strikesError) {
        console.error('Error getting strikes:', strikesError);
        toast.error('Cannot check strike count. Database function may not be available.');
        return;
      }

      const strikesCount = strikesCountData || 0;
      console.log('User strike count:', strikesCount);

      if (strikesCount >= 3) {
        // Create suspension if user has 3+ strikes
        const { error: suspendError } = await (supabase as any)
          .from('user_suspensions')
          .insert({
            user_id: userId,
            suspension_reason: 'Admin-triggered suspension: 3+ no-show strikes',
            suspension_end: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (suspendError) {
          console.error('Error creating suspension:', suspendError);
          toast.error('Failed to create suspension. Check console for details.');
        } else {
          toast.success('User suspension created successfully');
          fetchUsers(); // Refresh the data
        }
      } else {
        toast.info(`User has ${strikesCount} strikes, suspension not needed (requires 3+ strikes)`);
      }
    } catch (error) {
      console.error('Error fixing suspension:', error);
      toast.error('Error fixing user suspension');
    }
  };

  const suspendUser = async (userId: string, strikesCount: number) => {
    try {
      console.log('Suspending user:', userId, 'with', strikesCount, 'strikes');

      const { error: suspendError } = await (supabase as any)
        .from('user_suspensions')
        .insert({
          user_id: userId,
          suspension_reason: `Manual suspension: ${strikesCount} no-show strikes`,
          suspension_end: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (suspendError) {
        console.error('Error creating suspension:', suspendError);
        toast.error('Failed to suspend user. Check console for details.');
      } else {
        toast.success('User suspended successfully');
        fetchUsers(); // Refresh the data
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Error suspending user');
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      console.log('Uns suspending user:', userId);

      // Remove active suspensions
      const { error: suspensionError } = await supabase
        .from('user_suspensions')
        .update({
          is_active: false,
          lifted_at: new Date().toISOString(),
          lifted_by: (await supabase.auth.getUser()).data.user?.id,
          lift_reason: 'Manually unsuspended by admin'
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (suspensionError) {
        console.error('Error lifting suspension:', suspensionError);
        toast.error('Failed to unsuspend user. Check console for details.');
      } else {
        toast.success('User unsuspended successfully');
        fetchUsers(); // Refresh the data
      }
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast.error('Error unsuspending user');
    }
  };

  const forceRefreshUser = async (userId: string) => {
    try {
      console.log('Force refreshing user:', userId);

      // Force refresh the user's data
      await fetchUsers();
      toast.success('User data refreshed');
    } catch (error) {
      console.error('Error refreshing user:', error);
      toast.error('Error refreshing user data');
    }
  };

  const getUserStrikeCount = async (userId: string): Promise<number> => {
    try {
      const { data: strikesCountData, error: strikesError } = await (supabase as any)
        .rpc('get_user_active_strikes', { user_id_param: userId });

      if (strikesError) {
        console.error('Error getting strikes for user:', userId, strikesError);
        return 0;
      }

      return strikesCountData || 0;
    } catch (error) {
      console.error('Error in getUserStrikeCount:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Reliability Monitor</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              User Reliability Monitor
            </CardTitle>
            <CardDescription>
              Monitor and manage users with no-show strikes and account suspensions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setDebugMode(!debugMode)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {debugMode ? 'Hide Debug' : 'Show Debug'}
            </Button>
            <Button
              onClick={testStrikeSystem}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Test System
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={filterStrikes} onValueChange={setFilterStrikes}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by strikes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strikes</SelectItem>
              <SelectItem value="high">3+ Strikes</SelectItem>
              <SelectItem value="medium">2 Strikes</SelectItem>
              <SelectItem value="low">1 Strike</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Suspended</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.is_suspended).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">High Risk (3+)</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.no_show_strikes_count >= 3).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Avg Strikes</p>
                  <p className="text-2xl font-bold">
                    {users.length > 0 ? (users.reduce((sum, u) => sum + u.no_show_strikes_count, 0) / users.length).toFixed(1) : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Strikes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Strike</TableHead>
                <TableHead>Recent Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {debugMode && (
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {user.user_id.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone_verified ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={
                        user.no_show_strikes_count >= 3 ? "destructive" :
                        user.no_show_strikes_count >= 2 ? "secondary" : "outline"
                      }>
                        {user.no_show_strikes_count} strikes
                      </Badge>
                      {debugMode && (
                        <div className="text-xs text-gray-500">
                          Last: {user.last_strike_date ? new Date(user.last_strike_date).toLocaleDateString() : 'Never'}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_suspended ? (
                      <Badge variant="destructive">
                        Suspended
                        {user.suspension_end_time && (
                          <span className="ml-1">
                            ({getSuspensionTimeRemaining(user.suspension_end_time)})
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_strike_date ?
                      new Date(user.last_strike_date).toLocaleDateString() :
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {user.recent_strikes.slice(0, 2).map((strike, idx) => (
                        <div key={strike.id} className="text-xs text-muted-foreground">
                          {idx + 1}. {strike.provider_name} - {new Date(strike.strike_date).toLocaleDateString()}
                        </div>
                      ))}
                      {user.recent_strikes.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{user.recent_strikes.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.is_suspended ? (
                        // User is suspended - show unsuspend options
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unsuspendUser(user.user_id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Unsuspend User
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleManualOverride(user.user_id, 'cancel_suspension')}
                          >
                            Reset Strikes
                          </Button>
                        </>
                      ) : user.no_show_strikes_count >= 3 ? (
                        // User has 3+ strikes but not suspended - show suspend option
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => fixUserSuspension(user.user_id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Suspend User
                        </Button>
                      ) : user.no_show_strikes_count > 0 && user.no_show_strikes_count < 3 ? (
                        // User has 1-2 strikes - show manual suspend option
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => suspendUser(user.user_id, user.no_show_strikes_count)}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Suspend User
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {users.length === 0 ? (
                  <div>
                    <p className="mb-2">No users found with strikes or suspensions.</p>
                    <p className="text-sm">This could be because:</p>
                    <ul className="text-xs text-left mt-2 space-y-1 max-w-md mx-auto">
                      <li>• No users have received strikes yet</li>
                      <li>• Database tables are still being set up</li>
                      <li>• Strike system needs to be activated</li>
                      <li>• Users with strikes exist but are filtered out</li>
                    </ul>
                    <div className="flex gap-2 justify-center mt-4 flex-wrap">
                      <Button
                        onClick={fetchUsers}
                        variant="outline"
                        size="sm"
                      >
                        Refresh Data
                      </Button>
                      <Button
                        onClick={testStrikeSystem}
                        variant="outline"
                        size="sm"
                      >
                        Test System
                      </Button>
                      <Button
                        onClick={() => {
                          // Force refresh all users
                          fetchUsers();
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Force Refresh All
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>No users found matching the current filters.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserReliabilityMonitor;