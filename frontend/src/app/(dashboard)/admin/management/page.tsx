'use client';

import { useState, useEffect } from 'react';
import { api as axios } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  UserPlus, 
  Crown, 
  Users, 
  Building2, 
  UserMinus,
  Shield,
  Edit2
} from 'lucide-react';

// Simple notification function to replace toast
const notify = {
  success: (message: string) => alert(`✅ ${message}`),
  error: (message: string) => alert(`❌ ${message}`)
};

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'president' | 'admin';
  created_at: string;
}

interface Club {
  id: number;
  name: string;
  description: string;
  members?: ClubMember[];
}

interface ClubMember {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'president';
}

export default function AdminManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'president'>('member');
  const [loading, setLoading] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clubs' | 'users'>('clubs');

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      notify.error('Failed to fetch users');
    }
  };

  // Fetch clubs with members
  const fetchClubs = async () => {
    try {
      const response = await axios.get('/api/clubs?include=members');
      setClubs(response.data);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      notify.error('Failed to fetch clubs');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchClubs();
    }
  }, [user]);

  // Add member to club
  const addMemberToClub = async () => {
    if (!selectedClub || !selectedUser) {
      notify.error('Please select both club and user');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/clubs/${selectedClub}/members`, {
        user_id: selectedUser,
        role_in_club: selectedRole
      });
      
      notify.success(`User added as ${selectedRole} successfully`);
      setIsAddMemberDialogOpen(false);
      setSelectedUser('');
      setSelectedRole('member');
      fetchClubs();
    } catch (error: any) {
      console.error('Error adding member:', error);
      notify.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from club
  const removeMemberFromClub = async (clubId: number, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await axios.delete(`/api/clubs/${clubId}/members/${userId}`);
      notify.success('Member removed successfully');
      fetchClubs();
    } catch (error: any) {
      console.error('Error removing member:', error);
      notify.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  // Update member role
  const updateMemberRole = async (clubId: number, userId: string, newRole: 'member' | 'president') => {
    try {
      await axios.patch(`/api/clubs/${clubId}/members/${userId}/role`, {
        role_in_club: newRole
      });
      notify.success(`Role updated to ${newRole} successfully`);
      fetchClubs();
    } catch (error: any) {
      console.error('Error updating role:', error);
      notify.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  // Update user system role
  const updateUserRole = async (userId: string, newRole: 'student' | 'president' | 'admin') => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await axios.patch(`/api/users/${userId}`, { role: newRole });
      notify.success(`User role updated to ${newRole} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      notify.error(error.response?.data?.message || 'Failed to update user role');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              You need admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Management</h1>
        <p className="text-gray-600">Manage users, clubs, and assign roles</p>
      </div>

      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600">
          <button
            onClick={() => setActiveTab('clubs')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 ${
              activeTab === 'clubs' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Club Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 ${
              activeTab === 'users' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            User Management
          </button>
        </div>

        {/* Club Management Tab */}
        {activeTab === 'clubs' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Club & Member Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {clubs.map((club) => (
                    <Card key={club.id} className="border-l-4 border-l-emerald-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{club.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{club.description}</p>
                          </div>
                          <Dialog open={isAddMemberDialogOpen && selectedClub === club.id} 
                                  onOpenChange={(open) => {
                                    setIsAddMemberDialogOpen(open);
                                    if (open) setSelectedClub(club.id);
                                  }}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Member
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Member to {club.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="user">Select User</Label>
                                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {users
                                        .filter(u => !club.members?.some(m => m.id === u.id))
                                        .map(user => (
                                          <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="role">Role in Club</Label>
                                  <Select value={selectedRole} onValueChange={(value: 'member' | 'president') => setSelectedRole(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="president">President</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button 
                                  onClick={addMemberToClub} 
                                  disabled={loading || !selectedUser}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                                >
                                  {loading ? 'Adding...' : 'Add Member'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{club.members?.length || 0} members</span>
                          </div>
                          {club.members && club.members.length > 0 && (
                            <div className="space-y-2">
                              {club.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="font-medium">{member.name}</div>
                                      <div className="text-sm text-gray-600">{member.email}</div>
                                    </div>
                                    <Badge 
                                      variant={member.role === 'president' ? 'default' : 'secondary'}
                                      className={member.role === 'president' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                                    >
                                      {member.role === 'president' && <Crown className="h-3 w-3 mr-1" />}
                                      {member.role}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select 
                                      value={member.role} 
                                      onValueChange={(newRole: 'member' | 'president') => 
                                        updateMemberRole(club.id, member.id, newRole)
                                      }
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="president">President</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => removeMemberFromClub(club.id, member.id)}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Role Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <Badge 
                          variant={user.role === 'admin' ? 'destructive' : user.role === 'president' ? 'default' : 'secondary'}
                          className={
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                              : user.role === 'president' 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : ''
                          }
                        >
                          {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                          {user.role === 'president' && <Crown className="h-3 w-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={user.role} 
                          onValueChange={(newRole: 'student' | 'president' | 'admin') => 
                            updateUserRole(user.id, newRole)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="president">President</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
