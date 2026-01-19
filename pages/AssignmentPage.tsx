
import React, { useState } from 'react';
import { User, UserRole, StaffPosition } from '../types';

interface AssignmentPageProps {
  user: User;
  users: User[];
  onApprove: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onRefresh: () => void;
}

const SUBJECT_OPTIONS = ['Toán', 'Tin học', 'Công nghệ', 'Khác'];
const GRADES = [6, 7, 8, 9];
const CLASSES = [1, 2, 3, 4, 5, 6];

const AssignmentPage: React.FC<AssignmentPageProps> = ({ user, users, onApprove, onUpdateUser, onDeleteUser, onRefresh }) => {
  const isManagement = user.role === UserRole.TCM || user.role === UserRole.TP;
  const isMainAdmin = user.username === 'Anphuc';
  
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [tempAssignment, setTempAssignment] = useState({
      subject: 'Toán', grade: 6, class: 1
  });

  const pendingUsers = users.filter(u => !u.isApproved);
  const approvedUsers = users.filter(u => u.isApproved);

  const handleRoleChangeSubmit = (newRole: UserRole) => {
    if (roleModalUser) {
      onUpdateUser({ ...roleModalUser, role: newRole });
      setRoleModalUser(null);
    }
  };

  const addClassToUser = () => {
      if (!editUser) return;
      if (editUser.role === UserRole.NV) {
          alert("Nhân viên không được phân công đứng lớp!");
          return;
      }

      const entry = `${tempAssignment.subject} ${tempAssignment.grade}/${tempAssignment.class}`;
      
      // Check conflict
      const conflict = users.find(u => u.id !== editUser.id && u.assignedClasses?.includes(entry));
      if (conflict) {
          alert(`Lớp ${entry} đã được phân công cho ${conflict.name}!`);
          return;
      }

      if (!editUser.assignedClasses?.includes(entry)) {
          setEditUser({
              ...editUser,
              assignedClasses: [...(editUser.assignedClasses || []), entry],
              subject: tempAssignment.subject // Auto update main subject if needed
          });
      }
  };

  const removeClassFromUser = (cls: string) => {
      if (!editUser) return;
      setEditUser({
          ...editUser,
          assignedClasses: editUser.assignedClasses.filter(c => c !== cls)
      });
  };

  const handleSaveEditUser = () => {
      if (editUser) {
          onUpdateUser(editUser);
          setEditUser(null);
          alert('Đã cập nhật thông tin thành viên!');
      }
  };

  // Hàm xử lý khi đổi vai trò trong Modal Sửa
  const handleEditUserRoleChange = (newRole: UserRole) => {
      if (!editUser) return;
      
      if (newRole === UserRole.NV) {
          // Nếu chuyển sang Nhân viên: Xóa hết lớp dạy, bỏ chủ nhiệm
          setEditUser({
              ...editUser,
              role: UserRole.NV,
              assignedClasses: [],
              isChuNhiem: false,
              subject: 'Văn phòng',
              staffPosition: StaffPosition.THIET_BI // Default
          });
      } else {
          // Nếu chuyển sang Giáo viên
          setEditUser({
              ...editUser,
              role: UserRole.GV,
              staffPosition: StaffPosition.NONE,
              subject: 'Toán' // Default reset
          });
      }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Phê duyệt thành viên mới */}
      {isManagement && pendingUsers.length > 0 && (
        <div className="bg-orange-50/50 border-2 border-dashed border-orange-200 rounded-[3rem] p-10">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-3 h-3 bg-orange-500 rounded-full animate-ping"></div>
             <h3 className="text-xl font-black text-orange-800 uppercase italic">Yêu cầu đăng ký mới ({pendingUsers.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white p-8 rounded-[2.5rem] border border-orange-100 shadow-xl flex items-center justify-between">
                <div>
                   <div className="text-lg font-black text-slate-800">{u.name}</div>
                   <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{u.role} • {u.subject}</div>
                   <div className="flex flex-wrap gap-1 mt-2">
                     {u.assignedClasses?.map(c => <span key={c} className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase">{c}</span>)}
                   </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onApprove(u)} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">Duyệt ngay</button>
                  {isMainAdmin && <button onClick={() => onDeleteUser(u.id)} className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all">Xóa</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách thành viên tổ */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
           <div>
             <h3 className="text-xl font-black text-slate-800 uppercase italic">Thành viên Tổ Toán-Tin</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Danh sách & Phân công nhiệm vụ</p>
           </div>
           <div className="flex gap-3">
             <button onClick={onRefresh} className="bg-slate-50 text-slate-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               Làm mới
             </button>
             {isMainAdmin && <span className="px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[9px] font-black uppercase italic flex items-center">Admin Mode</span>}
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-10">Giáo viên / Chức vụ</th>
                  <th className="p-10">Phân công chi tiết</th>
                  <th className="p-10 text-right">Quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvedUsers.length > 0 ? approvedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-10">
                       <div className="text-base font-black text-slate-800">{u.name}</div>
                       <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${u.role === UserRole.TCM ? 'bg-red-100 text-red-600' : u.role === UserRole.TP ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                          {u.staffPosition && u.staffPosition !== 'Không' && <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-[9px] font-black uppercase">{u.staffPosition}</span>}
                          {u.duties?.map(d => <span key={d} className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase">{d}</span>)}
                       </div>
                    </td>
                    <td className="p-10">
                       <div className="flex flex-wrap gap-2">
                          {u.assignedClasses?.map(c => (
                            <span key={c} className="px-3 py-1.5 bg-white border border-blue-100 rounded-xl text-[10px] font-black text-blue-600 shadow-sm">{c}</span>
                          ))}
                          {u.isChuNhiem && <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase">Chủ nhiệm</span>}
                          {(!u.assignedClasses || u.assignedClasses.length === 0) && u.role === UserRole.GV && <span className="text-[10px] text-slate-400 italic">Chưa có phân công</span>}
                          {u.role === UserRole.NV && <span className="text-[10px] text-slate-400 italic">Nhân viên không phân công giảng dạy</span>}
                       </div>
                    </td>
                    <td className="p-10 text-right space-x-2">
                       {isMainAdmin && u.username !== 'Anphuc' && (
                         <>
                             <button 
                               onClick={() => setRoleModalUser(u)}
                               className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-sm"
                             >
                               Vai trò
                             </button>
                             <button 
                               onClick={() => setEditUser(u)}
                               className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-sm"
                             >
                               Sửa
                             </button>
                             <button 
                               onClick={() => onDeleteUser(u.id)}
                               className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-sm"
                             >
                               Xóa
                             </button>
                         </>
                       )}
                       {!isMainAdmin && <span className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-[9px] font-black uppercase">Đang hoạt động</span>}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-slate-400 font-bold italic">Chưa có dữ liệu thành viên. Vui lòng nhấn "Làm mới".</td>
                  </tr>
                )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Modal Đổi vai trò (Quick Role) */}
      {roleModalUser && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
           <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-sm w-full p-10 animate-in zoom-in duration-300">
              <h3 className="text-xl font-black text-slate-800 mb-6 uppercase italic text-center">Chỉ định quyền</h3>
              <div className="space-y-3">
                {[UserRole.GV, UserRole.TP, UserRole.TCM].map(role => (
                  <button 
                    key={role}
                    onClick={() => handleRoleChangeSubmit(role)}
                    className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      roleModalUser.role === role 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105' 
                      : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <button onClick={() => setRoleModalUser(null)} className="mt-8 w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Đóng</button>
           </div>
        </div>
      )}

      {/* Modal Sửa phân công (Full Edit) */}
      {editUser && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6 overflow-y-auto">
              <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-10 animate-in zoom-in duration-300">
                  <h3 className="text-xl font-black text-slate-800 mb-6 uppercase italic">Sửa thông tin: {editUser.name}</h3>
                  <div className="space-y-6">
                      {/* Role Switcher */}
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                          <button 
                             onClick={() => handleEditUserRoleChange(UserRole.GV)}
                             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${editUser.role !== UserRole.NV ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                          >
                             Giáo viên
                          </button>
                          <button 
                             onClick={() => handleEditUserRoleChange(UserRole.NV)}
                             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${editUser.role === UserRole.NV ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}
                          >
                             Nhân viên
                          </button>
                      </div>

                      <div className={`p-6 rounded-[2.5rem] border-2 space-y-4 transition-colors ${editUser.role === UserRole.NV ? 'bg-purple-50/50 border-purple-100' : 'bg-blue-50/50 border-blue-100'}`}>
                          
                          {/* Nội dung cho Nhân viên */}
                          {editUser.role === UserRole.NV ? (
                             <div>
                                <label className="block text-[10px] font-black text-purple-400 uppercase mb-2">Vị trí công việc</label>
                                <select 
                                   value={editUser.staffPosition} 
                                   onChange={e => setEditUser({...editUser, staffPosition: e.target.value as StaffPosition})} 
                                   className="w-full bg-white border border-purple-200 rounded-xl p-3 text-xs font-bold outline-none text-purple-700"
                                >
                                   <option value={StaffPosition.THIET_BI}>Nhân viên Thiết bị</option>
                                   <option value={StaffPosition.THU_VIEN}>Nhân viên Thư viện</option>
                                </select>
                                <p className="mt-3 text-[10px] text-purple-400 italic text-center">* Đã xóa toàn bộ phân công dạy của nhân viên này.</p>
                             </div>
                          ) : (
                             /* Nội dung cho Giáo viên */
                             <>
                                <div className="flex gap-2">
                                    <select value={tempAssignment.subject} onChange={e => setTempAssignment({...tempAssignment, subject: e.target.value})} className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none flex-1">
                                        {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={tempAssignment.grade} onChange={e => setTempAssignment({...tempAssignment, grade: parseInt(e.target.value)})} className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none flex-1">
                                        {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                                    </select>
                                    <select value={tempAssignment.class} onChange={e => setTempAssignment({...tempAssignment, class: parseInt(e.target.value)})} className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none flex-1">
                                        {CLASSES.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                                    </select>
                                    <button onClick={addClassToUser} className="bg-blue-600 text-white px-4 rounded-xl font-black">+</button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {editUser.assignedClasses?.map(cls => (
                                        <div key={cls} className="flex items-center gap-2 px-3 py-1 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-600">
                                            {cls}
                                            <button onClick={() => removeClassFromUser(cls)} className="text-red-400 hover:text-red-600">×</button>
                                        </div>
                                    ))}
                                    {(!editUser.assignedClasses || editUser.assignedClasses.length === 0) && (
                                        <div className="text-[10px] text-slate-400 italic w-full text-center py-2">Chưa phân công lớp</div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-blue-100">
                                    <input 
                                        type="checkbox" 
                                        checked={editUser.isChuNhiem || false} 
                                        onChange={e => setEditUser({...editUser, isChuNhiem: e.target.checked})}
                                        className="w-5 h-5 rounded-lg text-blue-600" 
                                    />
                                    <label className="text-[11px] font-black text-slate-500 uppercase">Giáo viên chủ nhiệm</label>
                                </div>
                             </>
                          )}
                      </div>
                  </div>
                  <div className="mt-8 flex gap-4">
                      <button onClick={() => setEditUser(null)} className="flex-1 font-black text-slate-400 uppercase tracking-widest">Hủy</button>
                      <button onClick={handleSaveEditUser} className="flex-1 py-4 bg-slate-900 text-white rounded-[2rem] font-black uppercase shadow-xl tracking-widest">Lưu thay đổi</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AssignmentPage;
