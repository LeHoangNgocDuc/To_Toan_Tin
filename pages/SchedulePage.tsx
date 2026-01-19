
import React, { useState, useEffect } from 'react';
import { User, UserRole, ScheduleItem } from '../types';
import { SCRIPT_URL } from '../constants';

interface SchedulePageProps {
  user: User;
}

const SchedulePage: React.FC<SchedulePageProps> = ({ user }) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSession, setActiveSession] = useState<'Morning' | 'Afternoon'>('Morning');

  const [newEntry, setNewEntry] = useState<Partial<ScheduleItem>>({
    dayOfWeek: 2,
    period: 1,
    session: 'Morning',
    teacherId: user.id,
    className: user.assignedClasses?.[0]?.split(' ')[1] || '',
    subject: user.assignedClasses?.[0]?.split(' ')[0] || user.subject
  });

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?type=schedule`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSchedule(data.filter(s => s.teacherId === user.id));
      }
    } catch (e) {
      console.error("Lỗi tải lịch dạy:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [user.id]);

  const handleSaveSchedule = async () => {
    if (!newEntry.className) {
      alert('Vui lòng chọn phân công lớp!');
      return;
    }
    setIsSyncing(true);
    const dataToSave = { 
      ...newEntry, 
      id: `sch-${Date.now()}-${user.id}`,
      teacherId: user.id
    };
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'schedule', action: 'save', data: dataToSave })
      });
      setSchedule(prev => [...prev.filter(s => !(s.dayOfWeek === dataToSave.dayOfWeek && s.period === dataToSave.period && s.session === dataToSave.session)), dataToSave as ScheduleItem]);
      alert(`Đã lưu: Thứ ${newEntry.dayOfWeek} - Tiết ${newEntry.period} (${newEntry.className})`);
      // Không đóng modal, cho phép nhập tiếp
    } catch (e) {
      alert('Lỗi khi lưu lịch dạy!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignmentChange = (val: string) => {
    const [sub, cls] = val.split(' ');
    setNewEntry({...newEntry, subject: sub, className: cls});
  };

  const days = [2, 3, 4, 5, 6, 7];
  const periods = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Thời khóa biểu chuyên môn</h1>
          <div className="flex gap-4 mt-4">
             <button onClick={() => setActiveSession('Morning')} className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeSession === 'Morning' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-100'}`}>Buổi Sáng</button>
             <button onClick={() => setActiveSession('Afternoon')} className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeSession === 'Afternoon' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-100'}`}>Buổi Chiều</button>
          </div>
        </div>
        <button 
          onClick={() => {
            setNewEntry({...newEntry, session: activeSession});
            setShowAdjustModal(true);
          }}
          className="bg-slate-900 text-white px-6 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
        >
          Cập nhật lịch
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="p-6 w-24 border-r">Tiết</th>
                {days.map(d => <th key={d} className="p-6 border-r">Thứ {d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map(p => (
                <tr key={p} className="h-32">
                  <td className="p-6 bg-slate-50/50 border-r text-center font-black text-slate-400 text-[10px]">Tiết {p}</td>
                  {days.map(d => {
                    const item = schedule.find(s => s.dayOfWeek === d && s.period === p && s.session === activeSession);
                    return (
                      <td key={d} className="p-2 border-r group min-w-[140px]">
                        {item ? (
                          <div className={`h-full w-full p-4 rounded-3xl border flex flex-col justify-center items-center text-center shadow-sm transition-all hover:scale-[1.02] ${activeSession === 'Morning' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                            <div className="font-black text-lg">{item.className}</div>
                            <div className="text-[10px] font-black uppercase opacity-60 tracking-tighter">{item.subject}</div>
                          </div>
                        ) : <div className="h-full w-full border-2 border-dashed border-slate-100 rounded-3xl group-hover:border-slate-200 transition-colors" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-10 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase italic">Ghi nhận tiết dạy</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Buổi học</label>
                  <select value={newEntry.session} onChange={e => setNewEntry({...newEntry, session: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                    <option value="Morning">Sáng</option>
                    <option value="Afternoon">Chiều</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Thứ</label>
                  <select value={newEntry.dayOfWeek} onChange={e => setNewEntry({...newEntry, dayOfWeek: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                    {[2,3,4,5,6,7].map(d => <option key={d} value={d}>Thứ {d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Tiết</label>
                  <select value={newEntry.period} onChange={e => setNewEntry({...newEntry, period: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold">
                    {[1,2,3,4,5].map(p => <option key={p} value={p}>Tiết {p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phân công dạy</label>
                  <select 
                    value={`${newEntry.subject} ${newEntry.className}`} 
                    onChange={e => handleAssignmentChange(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                  >
                    <option value="">-- Chọn phân công --</option>
                    {user.assignedClasses?.map(c => <option key={c} value={c}>{c}</option>)}
                    {user.isChuNhiem && <option value="HĐTN Chủ_nhiệm">HĐTN (Chủ nhiệm)</option>}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowAdjustModal(false)} className="flex-1 font-black text-slate-400 uppercase tracking-widest">Đóng (Hoàn tất)</button>
              <button disabled={isSyncing} onClick={handleSaveSchedule} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase shadow-xl tracking-widest">
                {isSyncing ? 'Đang lưu...' : 'Lưu & Nhập tiếp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
