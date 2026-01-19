import React, { useState } from 'react';
import { User, UserRole, SystemNotification } from '../types';
import { SCRIPT_URL } from '../constants';

const SUBJECT_OPTIONS = ['Toán', 'Tin học', 'Công nghệ', 'Khác'];
const GRADES = [6, 7, 8, 9];
const CLASSES = [1, 2, 3, 4, 5, 6];

interface DashboardProps {
  user: User;
  year: string;
  notifications: SystemNotification[];
  onRefresh: () => void;
  onUpdateProfile?: (updatedUser: User) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, year, notifications, onRefresh, onUpdateProfile }) => {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [newNotif, setNewNotif] = useState({
    content: '',
    executionTime: '',
    sendEmailReminder: false,
    isImportant: false
  });

  const [editData, setEditData] = useState({
    tempSubject: user.subject || 'Toán',
    tempGrade: 6,
    tempClass: 1,
    assignedClasses: [...(user.assignedClasses || [])],
    isChuNhiem: user.isChuNhiem || false
  });

  const handlePostNotif = async () => {
    if (!newNotif.content) return alert('Nội dung không được để trống!');
    setIsPosting(true);
    const data: SystemNotification = {
      ...newNotif,
      id: `notif-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      role: user.role,
      date: new Date().toLocaleDateString('vi-VN')
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'notifications', action: 'save', data })
      });
      alert('Đã đăng thông báo tổ!');
      setShowNotifModal(false);
      onRefresh();
    } catch (e) {
      alert('Lỗi đăng thông báo!');
    } finally {
      setIsPosting(false);
    }
  };

  const addAssignment = () => {
    const entry = `${editData.tempSubject} ${editData.tempGrade}/${editData.tempClass}`;
    if (!editData.assignedClasses.includes(entry)) {
      setEditData({ ...editData, assignedClasses: [...editData.assignedClasses, entry] });
    }
  };

  const removeAssignment = (item: string) => {
    setEditData({ ...editData, assignedClasses: editData.assignedClasses.filter(c => c !== item) });
  };

  const handleSaveProfile = async () => {
    if (editData.assignedClasses.length === 0) return alert('Vui lòng có ít nhất một lớp phân công!');
    
    setIsSavingProfile(true);
    const updatedUser = { 
      ...user, 
      assignedClasses: editData.assignedClasses,
      subject: editData.assignedClasses[0]?.split(' ')[0] || user.subject,
      isChuNhiem: editData.isChuNhiem
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'users', action: 'save', data: updatedUser })
      });
      alert('Đã cập nhật phân công chuyên môn!');
      setShowProfileModal(false);
      if (onUpdateProfile) onUpdateProfile(updatedUser);
      onRefresh();
    } catch (e) {
      alert('Lỗi khi cập nhật!');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-4xl font-black mb-3 italic">Chào {user.name.split(' ').pop()}!</h1>
            <p className="text-blue-200 font-bold uppercase tracking-[0.3em] text-[10px]">THCS TRẦN HƯNG ĐẠO • {year}</p>
            <div className="mt-8 flex gap-3">
              <span className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">{user.role}</span>
              <span className="px-5 py-2 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30">{user.subject}</span>
              {user.isChuNhiem && <span className="px-5 py-2 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30">Chủ nhiệm</span>}
            </div>
          </div>
          <button onClick={() => {
            setEditData({ 
              ...editData, 
              assignedClasses: [...(user.assignedClasses || [])], 
              tempSubject: user.subject,
              isChuNhiem: user.isChuNhiem || false
            });
            setShowProfileModal(true);
          }} className="mt-8 md:mt-0 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all active:scale-95 shadow-lg shadow-blue-900/40">
            Sửa phân công dạy
          </button>
        </div>
      </div>

      <div className="w-full">
         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Thông báo Tổ</h3>
            {(user.role === UserRole.TCM || user.role === UserRole.TP) && (
              <button onClick={() => setShowNotifModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Đăng tin mới</button>
            )}
          </div>
          <div className="space-y-6">
            {notifications.length > 0 ? notifications.map(notif => (
              <div key={notif.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm">{notif.senderName.charAt(0)}</div>
                    <div>
                       <div className="text-sm font-black text-slate-800">{notif.senderName}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{notif.role} • {notif.date}</div>
                    </div>
                  </div>
                  {notif.isImportant && <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[8px] font-black uppercase">Quan trọng</span>}
                </div>
                <p className="text-slate-600 font-bold leading-relaxed mb-4 italic">{notif.content}</p>
                {notif.executionTime && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Hạn thực hiện: <span className="text-orange-600">{notif.executionTime}</span></span>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-20 text-center font-black text-slate-300 italic uppercase">Chưa có thông báo mới</div>
            )}
          </div>
         </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase italic tracking-tight">Sửa phân công chuyên môn</h3>
              <div className="space-y-6">
                <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-blue-100 space-y-4">
                  <div className="text-[11px] font-black text-blue-800 uppercase italic tracking-widest">Cập nhật danh sách lớp</div>
                  <div className="space-y-2">
                    <select value={editData.tempSubject} onChange={e => setEditData({...editData, tempSubject: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-blue-600 outline-none shadow-sm">
                      {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select value={editData.tempGrade} onChange={e => setEditData({...editData, tempGrade: parseInt(e.target.value)})} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none shadow-sm">
                        {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                      </select>
                      <select value={editData.tempClass} onChange={e => setEditData({...editData, tempClass: parseInt(e.target.value)})} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none shadow-sm">
                        {CLASSES.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                      </select>
                      <button type="button" onClick={addAssignment} className="bg-blue-600 text-white px-5 rounded-xl font-black shadow-lg shadow-blue-500/30 active:scale-90">+</button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-blue-100">
                    <div className="text-[9px] font-black text-blue-400 uppercase mb-2 italic">Lớp đang giảng dạy ({editData.assignedClasses.length}):</div>
                    <div className="flex flex-wrap gap-2">
                      {editData.assignedClasses.map(item => (
                        <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-[9px] font-black text-blue-600 shadow-sm">
                          {item}
                          <button type="button" onClick={() => removeAssignment(item)} className="text-red-400 hover:text-red-600 font-black">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={editData.isChuNhiem} onChange={e => setEditData({...editData, isChuNhiem: e.target.checked})} className="w-5 h-5 rounded-lg border-blue-200 text-blue-600 cursor-pointer" id="editIsChuNhiem" />
                      <label htmlFor="editIsChuNhiem" className="text-[11px] font-black text-slate-500 uppercase cursor-pointer">Tôi là giáo viên chủ nhiệm</label>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 italic text-center">Gợi ý: Chọn Môn/Khối/Lớp rồi nhấn (+) để thêm nhanh.</div>
              </div>
              <div className="mt-10 flex gap-4">
                <button onClick={() => setShowProfileModal(false)} className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest italic hover:text-slate-900 transition-colors">Hủy bỏ</button>
                <button disabled={isSavingProfile} onClick={handleSaveProfile} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase shadow-xl tracking-widest active:scale-95 transition-all shadow-slate-200">
                  {isSavingProfile ? 'Đang cập nhật...' : 'Xác nhận thay đổi'}
                </button>
              </div>
           </div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6 overflow-y-auto">
           <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase italic">Đăng thông báo tổ</h3>
              <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 italic">Nội dung thông báo</label>
                   <textarea rows={4} value={newNotif.content} onChange={e => setNewNotif({...newNotif, content: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" placeholder="Nhập nội dung thông báo..."></textarea>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 italic">Hạn thực hiện</label>
                   <input type="date" value={newNotif.executionTime} onChange={e => setNewNotif({...newNotif, executionTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold shadow-inner" />
                </div>
                <div className="flex gap-4">
                   <label className="flex-1 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer shadow-inner">
                      <input type="checkbox" checked={newNotif.sendEmailReminder} onChange={e => setNewNotif({...newNotif, sendEmailReminder: e.target.checked})} className="w-5 h-5 rounded-md text-blue-600" />
                      <span className="text-[10px] font-black text-slate-600 uppercase">Gửi nhắc nhở</span>
                   </label>
                   <label className="flex-1 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer shadow-inner">
                      <input type="checkbox" checked={newNotif.isImportant} onChange={e => setNewNotif({...newNotif, isImportant: e.target.checked})} className="w-5 h-5 rounded-md text-red-600" />
                      <span className="text-[10px] font-black text-red-600 uppercase">Quan trọng</span>
                   </label>
                </div>
              </div>
              <div className="mt-10 flex gap-4">
                <button onClick={() => setShowNotifModal(false)} className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Hủy bỏ</button>
                <button disabled={isPosting} onClick={handlePostNotif} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                  {isPosting ? 'Đang đăng...' : 'Đăng ngay'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;