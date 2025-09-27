'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  UserX, 
  Search, 
  Mail, 
  Crown,
  User,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ClubMember = {
  id: string;
  name?: string;
  email: string;
  role: string; // role_in_club from club_members table
  user_role: 'admin' | 'president' | 'student'; // role from users table
  joined_at?: string;
};

type Club = {
  id: number;
  name: string;
  description?: string;
  members: ClubMember[];
};

export default function ClubMembersPage() {
  const params = useParams<{ id: string }>();
  const clubId = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    loadClubData();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/clubs/${clubId}?include=members`);
      setClub(response.data);
    } catch (error: any) {
      console.error('Failed to load club data:', error);
      if (error.response?.status === 403) {
        toast.error('ไม่มีสิทธิ์เข้าถึง', 'คุณไม่สามารถจัดการชมรมนี้ได้');
        router.push('/dashboard/clubs');
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลได้', 'กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setRemovingMemberId(memberId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!removingMemberId) return;
    
    try {
      setIsRemoving(true);
      await api.delete(`/api/clubs/${clubId}/members/${removingMemberId}`);
      await loadClubData();
      toast.success('ลบสมาชิกสำเร็จ', 'สมาชิกถูกลบออกจากชมรมเรียบร้อยแล้ว');
      setShowRemoveConfirm(false);
      setRemovingMemberId(null);
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error('ไม่สามารถลบสมาชิกได้', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsRemoving(false);
    }
  };

  const promoteToPresident = async (memberId: string) => {
    try {
      await api.patch(`/api/clubs/${clubId}/members/${memberId}/role`, {
        role_in_club: 'president'
      });
      await loadClubData();
      toast.success('เลื่อนตำแหน่งสำเร็จ', 'สมาชิกได้รับการแต่งตั้งเป็นประธานร่วมแล้ว');
    } catch (error: any) {
      console.error('Failed to promote member:', error);
      toast.error('ไม่สามารถเลื่อนตำแหน่งได้', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  const demotePresident = async (memberId: string) => {
    try {
      await api.patch(`/api/clubs/${clubId}/members/${memberId}/role`, {
        role_in_club: 'member'
      });
      await loadClubData();
      toast.success('ลดตำแหน่งสำเร็จ', 'สมาชิกได้รับการปรับเป็นสมาชิกทั่วไปแล้ว');
    } catch (error: any) {
      console.error('Failed to demote member:', error);
      toast.error('ไม่สามารถลดตำแหน่งได้', error.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบชมรม</h2>
        <p className="text-gray-600 mb-4">ชมรมที่คุณค้นหาอาจไม่มีอยู่หรือคุณไม่มีสิทธิ์เข้าถึง</p>
        <Button onClick={() => router.push('/dashboard/clubs')}>
          กลับไปหน้าชมรม
        </Button>
      </div>
    );
  }

  const filteredMembers = club.members.filter(member => {
    const searchTerm = search.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm)
    );
  });

  const presidentsCount = club.members.filter(m => m.role === 'president').length;
  const membersCount = club.members.filter(m => m.role === 'member').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <p className="text-gray-600">จัดการสมาชิกชมรม</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{club.members.length} สมาชิกทั้งหมด</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Crown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ประธาน</p>
                <p className="text-xl font-bold">{presidentsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">สมาชิก</p>
                <p className="text-xl font-bold">{membersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">รวม</p>
                <p className="text-xl font-bold">{club.members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>รายชื่อสมาชิก</span>
            </CardTitle>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              เพิ่มสมาชิก
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search ? 'ไม่พบสมาชิกที่ค้นหา' : 'ยังไม่มีสมาชิกในชมรม'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{member.name || 'ไม่ระบุชื่อ'}</h3>
                        <Badge 
                          variant="secondary"
                          className={
                            member.role === 'president' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {member.role === 'president' ? (
                            <><Crown className="w-3 h-3 mr-1" />ประธาน</>
                          ) : (
                            <><User className="w-3 h-3 mr-1" />สมาชิก</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === 'member' ? (
                          <DropdownMenuItem onClick={() => promoteToPresident(member.id)}>
                            <Crown className="w-4 h-4 mr-2" />
                            แต่งตั้งเป็นประธาน
                          </DropdownMenuItem>
                        ) : member.role === 'president' && presidentsCount > 1 ? (
                          <DropdownMenuItem onClick={() => demotePresident(member.id)}>
                            <User className="w-4 h-4 mr-2" />
                            ลดเป็นสมาชิกทั่วไป
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem 
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          ลบออกจากชมรม
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <ConfirmationDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="ยืนยันการลบสมาชิก"
        description={`คุณต้องการลบสมาชิกคนนี้ออกจากชมรม "${club.name}" ใช่หรือไม่?`}
        confirmText="ลบออก"
        variant="destructive"
        loading={isRemoving}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}
