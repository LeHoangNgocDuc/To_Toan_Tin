
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, SubstituteRequest, ScheduleItem } from '../types';
import { SCRIPT_URL } from '../constants';

interface SubstitutePageProps {
  user: User;
  users: User[];
}

const ABSENCE_REASONS = [
  'Nghỉ công tác',
  'Việc gia đình (Có phép)',
  'Nghỉ ốm (Có giấy tờ)',
  'Đi học chuyên môn',
  'Việc riêng đột xuất',
  'Thai sản/Dưỡng nhi',
  'Tham gia phong trào'
];

const SubstitutePage: React.FC<SubstitutePageProps> = ({ user, users }) => {
  const [substitutes, setSubstitutes] = useState<SubstituteRequest[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user.role === UserRole.TCM || user.role === UserRole.TP;

  const [formData, setFormData] = useState({
    absentTeacherId: '',
    substituteTeacherId: user.id,
    date: new Date().toISOString().split('T')[0],
    period: 0,
    className: '',
    reason: ABSENCE_REASONS[0],
    session: 'Morning' as 'Morning' | 'Afternoon'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      fetch(`${SCRIPT_URL}?type=substitutes`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setSubstitutes(data); })
        .catch(e => console.error(e));
      
      fetch(`${SCRIPT_URL}?type=schedule`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setSchedule(data); })
        .catch(e => console.error(e));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getDayOfWeek = (dateStr: string) => {
    const d = new Date(dateStr).getDay();
    return d === 0 ? 8 : d + 1;
  };

  // Get available periods for the selected absent teacher on the selected date
  const availableSlots = useMemo(() => {
    if (!formData.absentTeacherId || !formData.date) return [];
    const dow = getDayOfWeek(formData.date);
    return schedule.filter(s => s.teacherId === formData.absentTeacherId && s.dayOfWeek === dow);
  }, [formData.absentTeacherId, formData.date, schedule]);

  const handleCreate = async () => {
    if (!formData.absentTeacherId || !formData.className || !formData.period) return alert('Thiếu thông tin hoặc không có tiết dạy để chọn!');
    setIsSubmitting(true);
    const newReq = { ...formData, id: `sub-${Date.now()}`, status: 'Approved', pointsAwarded: 0.25 };
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'substitutes', action: 'save', data: newReq })
      });
      alert('Đã cập nhật phiếu dạy thay!');
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert('Lỗi lưu dữ liệu!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminFlag = async (sub: SubstituteRequest, note: string) => {
    if (!isAdmin) return;
    const isFlagged = !sub.isFlagged;
    const updatedSub = { ...sub, isFlagged, adminNote: isFlagged ? note : '' };
    
    // Optimistic update
    setSubstitutes(prev => prev.map(s => s.id === sub.id ? updatedSub : s));

    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'substitutes', action: 'save', data: updatedSub })
    });
  };

  const mySubs = substitutes.filter(s => s.substituteTeacherId === user.id && !s.isFlagged).length;
  const myAbs = substitutes.filter(s => s.absentTeacherId === user.id).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Quản lý Dạy thay</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Ghi nhận tiết dạy tăng cường & tiết nghỉ cá nhân</p>
        </div>
        {(user.role === UserRole.TCM || user.role === UserRole.TP) && (
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Tạo phiếu mới</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiết tôi đã dạy thay</div>
            <div className="text-4xl font-black text-blue-600">{mySubs} <span className="text-xs text-slate-400 font-bold">Tiết</span></div>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs">+{mySubs * 0.25}đ</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-red-50 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tiết tôi đã nghỉ</div>
            <div className="text-4xl font-black text-red-500">{myAbs} <span className="text-xs text-slate-400 font-bold">Tiết</span></div>
          </div>
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase italic">Đang đồng bộ...</div> : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-6">Ngày</th>
                  <th className="p-6">GV Nghỉ</th>
                  <th className="p-6">GV Dạy Thay</th>
                  <th className="p-6">Chi tiết</th>
                  <th className="p-6">Trạng thái (Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {substitutes.map(sub => (
                  <tr key={sub.id} className={`hover:bg-slate-50/50 ${sub.isFlagged ? 'bg-red-50 opacity-75' : ''}`}>
                    <td className="p-6 text-slate-500 font-bold text-xs">{sub.date}</td>
                    <td className="p-6 font-black text-slate-800 text-sm">
                      {users.find(u => u.id === sub.absentTeacherId)?.name || sub.absentTeacherId}
                      <div className="text-[9px] text-slate-400 font-normal mt-1">{sub.reason}</div>
                    </td>
                    <td className="p-6">
                      <div className="font-black text-blue-600 text-sm">{users.find(u => u.id === sub.substituteTeacherId)?.name || sub.substituteTeacherId}</div>
                    </td>
                    <td className="p-6 text-slate-600 text-xs font-bold">Lớp {sub.className} <span className="mx-1">•</span> Tiết {sub.period}</td>
                    <td className="p-6">
                       {isAdmin ? (
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => handleAdminFlag(sub, 'Bỏ tiết/Sự cố')}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${
                                   sub.isFlagged 
                                   ? 'bg-red-600 text-white border-red-600' 
                                   : 'bg-white text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500'
                                }`}
                             >
                                {sub.isFlagged ? 'Đã báo lỗi' : 'Báo lỗi'}
                             </button>
                          </div>
                       ) : (
                          sub.isFlagged 
                          ? <span className="text-red-500 text-[10px] font-black uppercase">Sự cố/Bỏ tiết</span> 
                          : <span className="text-emerald-500 text-[10px] font-black uppercase">Đã thực hiện</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-10 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase italic">Ghi nhận tiết dạy thay</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Giáo viên nghỉ</label>
                <select 
                    value={formData.absentTeacherId} 
                    onChange={e => setFormData({...formData, absentTeacherId: e.target.value, period: 0, className: ''})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                >
                  <option value="">-- Chọn GV nghỉ --</option>
                  {users.filter(u => u.role !== UserRole.NV).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Ngày nghỉ</label>
                   <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="block text-[10px] font-black text-blue-500 uppercase mb-2">Chọn tiết dạy của GV nghỉ</label>
                  <select 
                    value={formData.period ? `${formData.period}-${formData.className}` : ''}
                    onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const [p, c, s] = val.split('-');
                        const slot = availableSlots.find(slot => slot.period.toString() === p && slot.className === c);
                        if(slot) {
                             setFormData({
                                ...formData, 
                                period: slot.period, 
                                className: slot.className,
                                session: slot.session
                            });
                        }
                    }}
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold text-blue-900"
                  >
                     <option value="">-- Chọn tiết theo TKB --</option>
                     {availableSlots.length > 0 ? availableSlots.map(s => (
                         <option key={`${s.period}-${s.className}`} value={`${s.period}-${s.className}-${s.session}`}>
                             Tiết {s.period} - Lớp {s.className} ({s.session === 'Morning' ? 'Sáng' : 'Chiều'})
                         </option>
                     )) : <option disabled>GV này không có lịch dạy vào ngày {formData.date}</option>}
                  </select>
              </div>

              <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Lý do nghỉ</label>
                   <select value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                      {ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 font-black text-slate-400 uppercase">Hủy</button>
              <button disabled={isSubmitting} onClick={handleCreate} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">
                {isSubmitting ? 'ĐANG LƯU...' : 'LƯU DỮ LIỆU'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstitutePage;
