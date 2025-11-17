"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  student_id?: string;
  faculty?: string;
  major?: string;
  birth_date?: string;
  year_level?: number;
  phone?: string;
}

interface Registration {
  id: number;
  user_id: string;
  email: string;
  name: string;
  role: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  user?: User;
}

interface Activity {
  id: number;
  name: string;
  max_participants: number;
  approval_mode: "auto" | "manual";
  approved_count: number;
}

export default function ActivityRegistrationsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const activityId = parseInt(params.id as string);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Check permissions
  const canManage = user?.role === "admin" || user?.role === "president";

  useEffect(() => {
    if (!canManage) {
      toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/dashboard");
      return;
    }

    loadData();
  }, [activityId, canManage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activityRes, registrationsRes] = await Promise.all([
        api.get(`/api/activities/${activityId}`),
        api.get(`/api/activities/${activityId}/registrations`),
      ]);

      setActivity(activityRes.data);
      setRegistrations(registrationsRes.data);
    } catch (error: any) {
      console.error("Failed to load data:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (regId: number) => {
    setActionLoading(regId);
    try {
      await api.patch(`/api/activities/${activityId}/registrations/${regId}/approve`);
      toast.success("✅ อนุมัติผู้สมัครสำเร็จ");
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "ไม่สามารถอนุมัติได้");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (regId: number, reason?: string) => {
    setActionLoading(regId);
    try {
      await api.patch(`/api/activities/${activityId}/registrations/${regId}/reject`, {
        reason: reason || "ไม่ผ่านการพิจารณา",
      });
      toast.success("❌ ปฏิเสธผู้สมัครสำเร็จ");
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "ไม่สามารถปฏิเสธได้");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm("ต้องการอนุมัติผู้สมัครที่รออนุมัติทั้งหมดใช่หรือไม่?")) return;

    try {
      const res = await api.patch(`/api/activities/${activityId}/registrations/approve-all`);
      toast.success(`✅ อนุมัติทั้งหมดสำเร็จ (${res.data.count} คน)`);
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "ไม่สามารถอนุมัติทั้งหมดได้");
    }
  };

  const handleRejectAll = async () => {
    if (!confirm("ต้องการปฏิเสธผู้สมัครที่รออนุมัติทั้งหมดใช่หรือไม่?")) return;

    try {
      const res = await api.patch(`/api/activities/${activityId}/registrations/reject-all`, {
        reason: "ปฏิเสธเป็นกลุ่ม",
      });
      toast.success(`❌ ปฏิเสธทั้งหมดสำเร็จ (${res.data.count} คน)`);
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "ไม่สามารถปฏิเสธทั้งหมดได้");
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/api/activities/${activityId}/registrations.csv`, {
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `registrations_${activityId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("📥 ดาวน์โหลดไฟล์ CSV สำเร็จ");
    } catch (error) {
      toast.error("ไม่สามารถดาวน์โหลดได้");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            อนุมัติแล้ว
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            รออนุมัติ
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            ไม่อนุมัติ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = registrations.filter((r) => r.status === "pending").length;
  const approvedCount = registrations.filter((r) => r.status === "approved").length;
  const rejectedCount = registrations.filter((r) => r.status === "rejected").length;

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesStatus = statusFilter === "all" || reg.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      reg.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.faculty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.user?.major?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">ไม่พบข้อมูลกิจกรรม</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ย้อนกลับ
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              จัดการผู้สมัคร
            </h1>
            <p className="text-gray-600 text-lg">{activity.name}</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                {activity.approval_mode === "auto" ? "✅ อนุมัติอัตโนมัติ" : "👤 อนุมัติด้วยตนเอง"}
              </Badge>
              <span className="text-sm text-gray-600">
                {approvedCount} / {activity.max_participants} คน
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{registrations.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              อนุมัติแล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {approvedCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              รออนุมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              ไม่อนุมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">
                {rejectedCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && activity.approval_mode === "manual" && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  มีผู้สมัครรออนุมัติ {pendingCount} คน
                </h3>
                <p className="text-sm text-yellow-700">
                  คุณสามารถอนุมัติหรือปฏิเสธทั้งหมดได้
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApproveAll}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  อนุมัติทั้งหมด
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="destructive"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  ปฏิเสธทั้งหมด
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหาด้วยชื่อ, อีเมล, รหัสนักศึกษา, คณะ, สาขา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <Button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                >
                  {status === "all"
                    ? "ทั้งหมด"
                    : status === "pending"
                    ? "รออนุมัติ"
                    : status === "approved"
                    ? "อนุมัติแล้ว"
                    : "ไม่อนุมัติ"}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            พบ {filteredRegistrations.length} รายการจากทั้งหมด {registrations.length} รายการ
          </p>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้สมัคร ({filteredRegistrations.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "ไม่พบผู้สมัครที่ตรงกับเงื่อนไข"
                  : "ยังไม่มีผู้สมัครเข้าร่วมกิจกรรม"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ข้อมูลนักศึกษา
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      คณะ/สาขา
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ติดต่อ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่สมัคร
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegistrations.map((reg, index) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {reg.user?.name || reg.name || "ไม่มีชื่อ"}
                          </div>
                          <div className="text-xs text-gray-500">
                            รหัส: {reg.user?.student_id || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            ชั้นปี: {reg.user?.year_level || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {reg.user?.faculty || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reg.user?.major || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {reg.user?.email || reg.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reg.user?.phone || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(reg.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {reg.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(reg.id)}
                              disabled={actionLoading === reg.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              ปฏิเสธ
                            </Button>
                          </div>
                        )}
                        {reg.status === "approved" && (
                          <span className="text-green-600 text-xs">
                            ✓ อนุมัติเมื่อ {reg.approved_at ? formatDate(reg.approved_at) : "-"}
                          </span>
                        )}
                        {reg.status === "rejected" && (
                          <div className="text-xs text-red-600">
                            <div>✗ ปฏิเสธแล้ว</div>
                            {reg.rejection_reason && (
                              <div className="text-gray-500 mt-1">
                                เหตุผล: {reg.rejection_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
