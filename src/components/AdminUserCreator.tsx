import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminUserCreator = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Sign up the user
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'admin'
          }
        }
      });

      if (signupError) {
        toast.error("Failed to create admin user: " + signupError.message);
        return;
      }

      toast.success("Admin user created successfully! Check email for verification.");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (error: any) {
      toast.error("Failed to create admin user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Create Admin User</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="admin-name">Full Name</Label>
          <Input
            id="admin-name"
            placeholder="Admin Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        
        <Button onClick={createAdminUser} disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Admin User"}
        </Button>
        
        <p className="text-sm text-muted-foreground text-center">
          This will create an admin user who can access the admin dashboard
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminUserCreator;