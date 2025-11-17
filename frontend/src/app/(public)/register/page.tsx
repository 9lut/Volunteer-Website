'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/axios';
import { signIn } from 'next-auth/react';
import { useToast } from '@/components/ui/toast';
import { LoadingButton } from '@/components/ui/loading-button';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [phone, setPhone] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    
    // Validation - บังคับกรอกทุกฟิลด์
    if (!name.trim()) return setErr('กรุณากรอกชื่อ-นามสกุล');
    if (!studentId.trim()) return setErr('กรุณากรอกรหัสนักศึกษา');
    if (!faculty.trim()) return setErr('กรุณากรอกคณะ');
    if (!major.trim()) return setErr('กรุณากรอกสาขา');
    if (!birthDate) return setErr('กรุณาเลือกวันเกิด');
    if (!yearLevel) return setErr('กรุณาเลือกชั้นปี');
    if (!phone.trim()) return setErr('กรุณากรอกเบอร์โทรศัพท์');
    if (!email || !password) return setErr('กรุณากรอกอีเมลและรหัสผ่าน');
    
    if (password.length < 8) return setErr('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    if (password !== confirm) return setErr('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
    
    // ตรวจสอบรหัสนักศึกษา
    if (studentId && !/^\d{10}$/.test(studentId)) {
      return setErr('รหัสนักศึกษาต้องเป็นตัวเลข 10 หลักเท่านั้น');
    }
    
    // ตรวจสอบเบอร์โทร
    if (phone && !/^0\d{9}$/.test(phone)) {
      return setErr('เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก');
    }
    
    try {
      setLoading(true);
      await api.post('/api/auth/register', { 
        email, 
        password, 
        name: name.trim(),
        student_id: studentId.trim(),
        faculty: faculty.trim(),
        major: major.trim(),
        birth_date: birthDate,
        year_level: parseInt(yearLevel),
        phone: phone.trim(),
      });
      
      // Show success state
      setSuccess(true);
      toast.success('สมัครสมาชิกสำเร็จ!', 'กำลังเข้าสู่ระบบอัตโนมัติ...');
      
      // เข้าสู่ระบบอัตโนมัติ
      const res = await signIn('credentials', { email, password, redirect: false });
      if (!res || res.error) {
        toast.warning('เข้าสู่ระบบไม่สำเร็จ', 'กรุณาเข้าสู่ระบบด้วยตนเอง');
        router.replace('/login');
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ!', 'ยินดีต้อนรับสู่ระบบจิตอาสา');
        router.replace('/');
      }
    } catch (e: any) {
      const message = e?.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ';
      setErr(message);
      toast.error('สมัครสมาชิกไม่สำเร็จ', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white mt-30">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white">
          <div className="p-6 md:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">สมัครสมาชิก</h1>
              <p className="mt-2 text-xs text-gray-500">สร้างบัญชีใหม่เพื่อเริ่มใช้งาน</p>
            </div>

            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...
              </div>
            )}

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="student_id" className="block text-sm font-medium text-gray-700">รหัสนักศึกษา (10 หลัก) <span className="text-red-500">*</span></label>
                <input
                  id="student_id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="6512345678"
                  maxLength={10}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
                <p className="text-xs text-gray-500">ตัวเลข 10 หลักเท่านั้น (ห้ามซ้ำในระบบ)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">คณะ <span className="text-red-500">*</span></label>
                  <input
                    id="faculty"
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="วิศวกรรมศาสตร์"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="major" className="block text-sm font-medium text-gray-700">สาขา <span className="text-red-500">*</span></label>
                  <input
                    id="major"
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="วิศวกรรมคอมพิวเตอร์"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">วันเกิด <span className="text-red-500">*</span></label>
                  <input
                    id="birth_date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="year_level" className="block text-sm font-medium text-gray-700">ชั้นปี <span className="text-red-500">*</span></label>
                  <select
                    id="year_level"
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">เลือกชั้นปี</option>
                    <option value="1">ปี 1</option>
                    <option value="2">ปี 2</option>
                    <option value="3">ปี 3</option>
                    <option value="4">ปี 4</option>
                    <option value="5">ปี 5</option>
                    <option value="6">ปี 6</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0812345678"
                  maxLength={10}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
                <p className="text-xs text-gray-500">ขึ้นต้นด้วย 0 และมี 10 หลัก</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">อีเมล <span className="text-red-500">*</span></label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.ac.th"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">รหัสผ่าน <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                <input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="กำลังสมัครสมาชิก..."
                disabled={success}
                className="group relative inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-white transition hover:bg-black disabled:opacity-60"
              >
                สมัครสมาชิก
              </LoadingButton>

              <p className="text-center text-sm text-gray-600">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href="/login" className="font-medium text-gray-900 underline underline-offset-4 hover:no-underline">เข้าสู่ระบบ</Link>
              </p>
            </form>
          </div>
        </div>

        <div className="py-4" />
      </div>
    </main>
  );
}