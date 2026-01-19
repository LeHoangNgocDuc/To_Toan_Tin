
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
  const [activeTab, setActiveTab] = useState<'market' | 'my_absences' | 'my_subs'>('market');
  const [substitutes, setSubstitutes] = useState<SubstituteRequest[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  
  // Modals
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user.role === UserRole.TCM || user.role === UserRole.TP || user.username === 'Anphuc';

  // Absence Form State
  const [absenceForm, setAbsenceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: ABSENCE_REASONS[0],
    sessionType: 'Morning' as 'Morning' | 'Afternoon' | 'AllDay'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch data parallel
      const [subRes, schRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?type=substitutes`),
        fetch(`${SCRIPT_URL}?type=schedule`)
      ]);
      const subData = await subRes.json();
      const schData = await schRes.json();

      if (Array.isArray(subData)) setSubstitutes(subData);
      if (Array.isArray(schData)) setSchedule(schData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Logic Helpers ---

  const getDayOfWeek = (dateStr: string) => {
    const d = new Date(dateStr).getDay();
    return d === 0 ? 8 : d + 1;
  };

  // Find affected classes based on Date + SessionType
  const affectedClasses = useMemo(() => {
    const dow = getDayOfWeek(absenceForm.date);
    return schedule.filter(s => {
      const isMyClass = s.teacherId === user.id;
      const isRightDay = s.dayOfWeek === dow;
      let isRightSession = true;
      if (absenceForm.sessionType === 'Morning') isRightSession = s.session === 'Morning';
      if (absenceForm.sessionType === 'Afternoon') isRightSession = s.session === 'Afternoon';
      
      return isMyClass && isRightDay && isRightSession;
    }).sort((a,b) => a.period - b.period);
  }, [schedule, user.id, absenceForm]);

  // Check if current user is free at a specific time
  const checkIsFree = (date: string, period: number, session: 'Morning' | 'Afternoon') => {
    const dow = getDayOfWeek(date);
    const busy = schedule.some(s => 
      s.teacherId === user.id && 
      s.dayOfWeek === dow && 
      s.period === period && 
      s.session === session
    );
    return !busy;
  };

  // --- Actions ---

  const handleRegisterAbsence = async (addMore: boolean = false) => {
    if (affectedClasses.length === 0) {
      return alert('Bạn không có tiết dạy nào vào thời gian đã chọn để đăng ký nghỉ.');
    }
    if (!window.confirm(`Xác nhận đăng ký nghỉ ngày ${absenceForm.date} (${absenceForm.sessionType === 'AllDay' ? 'Cả ngày' : 'Buổi ' + (absenceForm.sessionType === 'Morning' ? 'Sáng' : 'Chiều')})?\nHệ thống sẽ tạo ${affectedClasses.length} phiếu yêu cầu dạy thay.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const requests: SubstituteRequest[] = affectedClasses.map(cls => ({
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        absentTeacherId: user.id,
        substituteTeacherId: '', // Empty initially
        reason: absenceForm.reason,
        date: absenceForm.date,
        period: cls.period,
        className: cls.className,
        status: 'Pending',
        pointsAwarded: 0.25
      }));

      // Send multiple requests (simulation loop or batch if API supported)
      // Since API example is single item save, we loop. Ideally backend supports batch.
      for (const req of requests) {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ type: 'substitutes', action: 'save', data: req })
        });
      }

      alert('Đăng ký nghỉ thành công! Các giáo viên khác có thể nhận dạy thay.');
      
      if (addMore) {
        // Reset date but keep modal open
        const nextDay = new Date(absenceForm.date);
        nextDay.setDate(nextDay.getDate() + 1);
        setAbsenceForm({ ...absenceForm, date: nextDay.toISOString().split('T')[0] });
      } else {
        setShowAbsenceModal(false);
      }
      fetchData(); // Refresh list
    } catch (e) {
      alert('Lỗi khi lưu dữ liệu!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptSubstitute = async (request: SubstituteRequest) => {
    if (!window.confirm('Bạn chắc chắn muốn nhận dạy thay tiết này?')) return;
    setIsSubmitting(true);
    const updatedReq: SubstituteRequest = { ...request, substituteTeacherId: user.id, status: 'Approved' };
    
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'substitutes', action: 'save', data: updatedReq })
      });
      // Optimistic update
      setSubstitutes(prev => prev.map(s => s.id === request.id ? updatedReq : s));
      alert('Đã nhận dạy thay thành công!');
    } catch (e) {
      alert('Lỗi cập nhật!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (request: SubstituteRequest) => {
     if (!window.confirm('Hủy yêu cầu này?')) return;
     // Delete logic depends on API, here we just use action delete
     // Assuming API supports delete by ID
     try {
       await fetch(SCRIPT_URL, {
         method: 'POST',
         mode: 'no-cors',
         headers: { 'Content-Type': 'text/plain' },
         body: JSON.stringify({ type: 'substitutes', action: 'delete', data: { id: request.id } })
       });
       setSubstitutes(prev => prev.filter(s => s.id !== request.id));
     } catch(e) { alert('Lỗi xóa!'); }
  };

  // --- Filtering Lists ---

  const pendingRequests = substitutes.filter(s => !s.substituteTeacherId && s.absentTeacherId !== user.id);
  const myAbsenceRequests = substitutes.filter(s => s.absentTeacherId === user.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const mySubstitutions = substitutes.filter(s => s.substituteTeacherId === user.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight italic">Quản lý Dạy thay</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Đăng ký nghỉ & Hỗ trợ dạy thay</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowAbsenceModal(true)} 
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Đăng ký Nghỉ
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 w-fit">
         <button 
            onClick={() => setActiveTab('market')} 
            className={`px-6 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'market' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
         >
            Cần người dạy ({pendingRequests.length})
         </button>
         <button 
            onClick={() => setActiveTab('my_absences')} 
            className={`px-6 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_absences' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
         >
            Lịch sử nghỉ
         </button>
         <button 
            onClick={() => setActiveTab('my_subs')} 
            className={`px-6 py-3 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_subs' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
         >
            Đã nhận dạy ({mySubstitutions.length})
         </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[400px]">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-8">Thông tin buổi dạy</th>
                    <th className="p-8">Giáo viên</th>
                    <th className="p-8">Trạng thái / Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {/* TAB 1: MARKET */}
                  {activeTab === 'market' && (
                     pendingRequests.length > 0 ? pendingRequests.map(req => {
                        // Assuming requests don't explicitly store session, we guess or if availableSlots logic was used, it matches schedule. 
                        // We check conflict here.
                        // NOTE: ScheduleItem doesn't store exact date, only DoW. 
                        // Need to be careful. Here we assume 'Morning' if period <= 5 usually, but data might vary.
                        // Let's assume period 1-5 Morning, 6-10 Afternoon for conflict check heuristic if session missing.
                        const session = (req.period <= 5) ? 'Morning' : 'Afternoon'; 
                        const isFree = checkIsFree(req.date, req.period, session);

                        return (
                           <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-8">
                                 <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm">
                                       <span className="text-xl">{req.period}</span>
                                       <span className="text-[8px] uppercase">Tiết</span>
                                    </div>
                                    <div>
                                       <div className="font-black text-slate-800 text-base">{req.date}</div>
                                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Lớp {req.className}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-8">
                                 <div className="text-sm font-bold text-slate-700">{users.find(u => u.id === req.absentTeacherId)?.name}</div>
                                 <div className="text-[10px] text-red-400 italic mt-1">{req.reason}</div>
                              </td>
                              <td className="p-8">
                                 {isFree ? (
                                    <button onClick={() => handleAcceptSubstitute(req)} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                                       Nhận dạy
                                    </button>
                                 ) : (
                                    <span className="text-[10px] font-black text-slate-300 uppercase bg-slate-100 px-4 py-2 rounded-xl">Bạn bị trùng lịch</span>
                                 )}
                              </td>
                           </tr>
                        );
                     }) : (
                        <tr><td colSpan={3} className="p-20 text-center text-slate-300 font-black italic uppercase">Hiện không có yêu cầu nào</td></tr>
                     )
                  )}

                  {/* TAB 2: MY ABSENCES */}
                  {activeTab === 'my_absences' && (
                     myAbsenceRequests.length > 0 ? myAbsenceRequests.map(req => (
                        <tr key={req.id}>
                           <td className="p-8">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex flex-col items-center justify-center font-black">
                                    <span className="text-lg">{req.period}</span>
                                    <span className="text-[7px] uppercase">Tiết</span>
                                 </div>
                                 <div>
                                    <div className="font-bold text-slate-800">{req.date}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Lớp {req.className}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-8">
                              {req.substituteTeacherId ? (
                                 <div>
                                    <div className="text-[9px] text-slate-400 uppercase mb-1">Người dạy thay</div>
                                    <div className="font-black text-emerald-600">{users.find(u => u.id === req.substituteTeacherId)?.name}</div>
                                 </div>
                              ) : (
                                 <span className="text-[10px] font-black text-orange-400 uppercase animate-pulse">Đang tìm người...</span>
                              )}
                           </td>
                           <td className="p-8">
                              {!req.substituteTeacherId && (
                                 <button onClick={() => handleCancelRequest(req)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase underline">Hủy yêu cầu</button>
                              )}
                           </td>
                        </tr>
                     )) : (
                        <tr><td colSpan={3} className="p-20 text-center text-slate-300 font-black italic uppercase">Bạn chưa đăng ký nghỉ tiết nào</td></tr>
                     )
                  )}

                  {/* TAB 3: MY SUBS */}
                  {activeTab === 'my_subs' && (
                     mySubstitutions.length > 0 ? mySubstitutions.map(req => (
                        <tr key={req.id}>
                           <td className="p-8">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center justify-center font-black">
                                    <span className="text-lg">{req.period}</span>
                                    <span className="text-[7px] uppercase">Tiết</span>
                                 </div>
                                 <div>
                                    <div className="font-bold text-slate-800">{req.date}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Lớp {req.className}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-8">
                              <div className="text-[9px] text-slate-400 uppercase mb-1">Dạy thay cho</div>
                              <div className="font-bold text-slate-700">{users.find(u => u.id === req.absentTeacherId)?.name}</div>
                           </td>
                           <td className="p-8">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl">
                                 <span className="text-[10px] font-black uppercase">Đã xác nhận</span>
                                 <span className="text-xs font-bold">+0.25đ</span>
                              </div>
                           </td>
                        </tr>
                     )) : (
                        <tr><td colSpan={3} className="p-20 text-center text-slate-300 font-black italic uppercase">Bạn chưa nhận dạy thay tiết nào</td></tr>
                     )
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* MODAL: ĐĂNG KÝ NGHỈ */}
      {showAbsenceModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-10 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase italic">Đăng ký báo bận</h3>
              
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Ngày nghỉ</label>
                    <input type="date" value={absenceForm.date} onChange={e => setAbsenceForm({...absenceForm, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold shadow-inner" />
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Thời gian</label>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                       <button onClick={() => setAbsenceForm({...absenceForm, sessionType: 'Morning'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${absenceForm.sessionType === 'Morning' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Sáng</button>
                       <button onClick={() => setAbsenceForm({...absenceForm, sessionType: 'Afternoon'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${absenceForm.sessionType === 'Afternoon' ? 'bg-white shadow-md text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>Chiều</button>
                       <button onClick={() => setAbsenceForm({...absenceForm, sessionType: 'AllDay'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${absenceForm.sessionType === 'AllDay' ? 'bg-white shadow-md text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>Cả ngày</button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Lý do</label>
                    <select value={absenceForm.reason} onChange={e => setAbsenceForm({...absenceForm, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none">
                       {ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>

                 <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-3">Các lớp bị ảnh hưởng ({affectedClasses.length})</div>
                    <div className="flex flex-wrap gap-2">
                       {affectedClasses.length > 0 ? affectedClasses.map((cls, idx) => (
                          <div key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                             T{cls.period} - {cls.className}
                          </div>
                       )) : (
                          <span className="text-xs text-slate-400 italic">Không tìm thấy tiết dạy nào trong lịch.</span>
                       )}
                    </div>
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setShowAbsenceModal(false)} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50">Đóng</button>
                 <button disabled={isSubmitting || affectedClasses.length === 0} onClick={() => handleRegisterAbsence(true)} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Lưu & Thêm tiếp
                 </button>
                 <button disabled={isSubmitting || affectedClasses.length === 0} onClick={() => handleRegisterAbsence(false)} className="flex-1 py-4 bg-slate-900 text-white rounded-[2rem] font-black uppercase shadow-xl tracking-widest active:scale-95 transition-all">
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận nghỉ'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SubstitutePage;
