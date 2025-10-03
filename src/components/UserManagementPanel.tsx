import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Ban, 
  UserCheck, 
  Mail,
  Phone,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  user_type: string;
  phone?: string;
  created_at: string;
  avatar_url?: string;
  is_banned?: boolean;
}

const UserManagementPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: string, shouldBan: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: shouldBan } as any)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(shouldBan ? "User banned successfully" : "User unbanned successfully");
      loadUsers(); // Reload users
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedUserType === "all" || user.user_type === selectedUserType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedUserType}
          onChange={(e) => setSelectedUserType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Users</option>
          <option value="customer">Customers</option>
          <option value="provider">Providers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.user_type === 'customer').length}
            </div>
            <p className="text-sm text-muted-foreground">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.user_type === 'provider').length}
            </div>
            <p className="text-sm text-muted-foreground">Providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.user_type === 'admin').length}
            </div>
            <p className="text-sm text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {users.filter(u => u.is_banned).length}
            </div>
            <p className="text-sm text-muted-foreground">Banned</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <Card key={user.user_id} className={user.is_banned ? "border-destructive/20" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{user.full_name}</h3>
                      <Badge variant={
                        user.user_type === 'admin' ? 'default' :
                        user.user_type === 'provider' ? 'secondary' : 'outline'
                      }>
                        {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                      </Badge>
                      {user.is_banned && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Banned
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {user.user_type !== 'admin' && (
                      <Button
                        size="sm"
                        variant={user.is_banned ? "default" : "destructive"}
                        onClick={() => banUser(user.user_id, !user.is_banned)}
                        className="flex items-center gap-2"
                      >
                        {user.is_banned ? (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            Ban
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserManagementPanel;