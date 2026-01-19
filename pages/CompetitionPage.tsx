
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, TeacherScoreRow } from '../types';
import { SCRIPT_URL } from '../constants';

const DEFAULT_SCORES: Omit<TeacherScoreRow, 'teacherId'> = {
  tt: 0, dn: 0, sh: 0, nq: 0, qt: 0,
  ga: 0, sd: 0, dg: 0, lbg: 0, tb: 0, dt_hsss: 0,
  ngc: 0, bc: 0, dt_ngaycong: 0,
  tg: 0, thct: 0, clbm: 0, dt_ctcm: 0,
  chuNhiem: 0, kiemNhiem: 0, congTacKhac: 0
};

interface CompetitionPageProps {
  user: User;
  users: User[];
}

type Period = 'HKI' | 'HKII' | 'Cả năm';

const CompetitionPage: React.FC<CompetitionPageProps> = ({ user, users }) => {
  const [activePeriod, setActivePeriod] = useState<Period>('HKI');
  const [viewMode, setViewMode] = useState<'Summary' | 'Excel'>('Excel');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(user.id);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scores, setScores] = useState<Record<string, TeacherScoreRow>>({});

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      fetch(`${SCRIPT_URL}?type=scores`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const newScores: Record<string, TeacherScoreRow> = {};
            data.forEach((item: any) => {
              if (item.teacherId) {
                newScores[item.teacherId] = {
                  ...item,
                  ...Object.keys(item).reduce((acc: any, key) => {
                     if (key !== 'teacherId' && key !== 'teacherName' && key !== 'lastUpdated') {
                       acc[key] = parseFloat(item[key]) || 0;
                     }
                     return acc;
                  }, {})
                };
              }
            });
            setScores(newScores);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsSyncing(false));
    } catch (error) {
      console.error('Lỗi khởi tạo:', error);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveScoreToSheet = async (teacherId: string) => {
    setIsSyncing(true);
    const scoreData = {
      ...scores[teacherId],
      teacherName: users.find(u => u.id === teacherId)?.name || user.name
    };
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'scores', action: 'save', data: scoreData })
      });
      alert('Đã đồng bộ điểm lên Google Sheet!');
      setShowEntryModal(false);
      fetchData();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu dữ liệu!');
    } finally {
      setIsSyncing(false);
    }
  };

  const fullTableData = useMemo(() => {
    return users
      .filter(u => u.role !== UserRole.BGH)
      .map(u => {
        const s = scores[u.id] || { 
          teacherId: u.id,
          ...DEFAULT_SCORES
        };
        const totalA = (s.tt || 0) + (s.dn || 0) + (s.sh || 0) + (s.nq || 0) + (s.qt || 0);
        const totalHSSS = (s.ga || 0) + (s.sd || 0) + (s.dg || 0) + (s.lbg || 0) + (s.tb || 0) + (s.dt_hsss || 0);
        const totalNgayCong = (s.ngc || 0) + (s.bc || 0) + (s.dt_ngaycong || 0);
        const totalCTCM = (s.tg || 0) + (s.thct || 0) + (s.clbm || 0) + (s.dt_ctcm || 0);
        const grandTotal = totalA + totalHSSS + totalNgayCong + totalCTCM + (s.chuNhiem || 0) + (s.kiemNhiem || 0) + (s.congTacKhac || 0);
        return { ...u, ...s, totalA, totalHSSS, totalNgayCong, totalCTCM, grandTotal };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }, [scores, users]);

  const handleScoreUpdate = (teacherId: string, field: keyof TeacherScoreRow, value: number) => {
    setScores(prev => ({
      ...prev,
      [teacherId]: {
        ...(prev[teacherId] || { teacherId, ...DEFAULT_SCORES }),
        [field]: value as any
      }
    }));
  };

  const currentEntryScore = scores[selectedTeacherId] || { teacherId: selectedTeacherId, ...DEFAULT_SCORES };

  return (
    <div className="space-y-6 max-w-[100vw] overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2">
          <div className="flex gap-2 p-1 bg-slate-200 rounded-xl shadow-inner">
            <button onClick={() => setViewMode('Summary')} className={`px-4 py-2 rounded-lg text-xs font-bold ${viewMode === 'Summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Tổng hợp</button>
            <button onClick={() => setViewMode('Excel')} className={`px-4 py-2 rounded-lg text-xs font-bold ${viewMode === 'Excel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Chi tiết</button>
          </div>
          <button 
            onClick={() => {
              setSelectedTeacherId(user.id);
              setShowEntryModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 113.536 3.536L12 20.232H8v-4z" /></svg>
            Cập nhật điểm Sheet
          </button>
        </div>
        {isSyncing && <div className="text-[10px] font-black text-blue-600 uppercase animate-pulse italic">Đang đồng bộ Sheets...</div>}
      </div>

      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px] font-medium table-fixed min-w-[1500px]">
            <thead>
              <tr className="bg-emerald-600 text-white font-black text-[14px] text-center uppercase tracking-widest">
                <th colSpan={36} className="py-4">Tổng kết thi đua {activePeriod} - Tổ Toán Tin (Dữ liệu Sheet)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
               <tr className="bg-slate-50 font-black uppercase text-center text-slate-400 h-10">
                 <td className="w-10">TT</td><td className="w-40">Họ và tên</td><td>TT</td><td>DN</td><td>SH</td><td>NQ</td><td>QT</td><td className="bg-blue-600 text-white">Cộng A</td>
                 <td>GA</td><td>SD</td><td>DG</td><td>LBG</td><td>TB</td><td>ĐT</td><td className="bg-yellow-400 text-slate-900">Cộng B1</td>
                 <td>NGC</td><td>BC</td><td>DT</td><td className="bg-blue-500 text-white">Cộng B2</td>
                 <td>TG</td><td>THCT</td><td>CLBM</td><td>ĐT</td><td className="bg-yellow-400 text-slate-900">Cộng B3</td>
                 <td>CN</td><td>KN</td><td>Thưởng</td><td className="bg-yellow-500 text-slate-900">Tổng</td>
               </tr>
              {fullTableData.map((row, idx) => (
                <tr key={row.id} className="text-center h-10 hover:bg-blue-50/50 transition-colors">
                  <td className="font-bold text-slate-300">{idx + 1}</td>
                  <td className="text-left px-3 font-black text-slate-800 border-r">{row.name}</td>
                  <td>{row.tt}</td><td>{row.dn}</td><td>{row.sh}</td><td>{row.nq}</td><td>{row.qt}</td>
                  <td className="bg-blue-600 text-white font-black">{row.totalA}</td>
                  <td>{row.ga}</td><td>{row.sd}</td><td>{row.dg}</td><td>{row.lbg}</td><td>{row.tb}</td><td>{row.dt_hsss}</td>
                  <td className="bg-yellow-400 font-black">{row.totalHSSS}</td>
                  <td>{row.ngc}</td><td>{row.bc}</td><td>{row.dt_ngaycong}</td>
                  <td className="bg-blue-500 text-white font-black">{row.totalNgayCong}</td>
                  <td>{row.tg}</td><td>{row.thct}</td><td>{row.clbm}</td><td>{row.dt_ctcm}</td>
                  <td className="bg-yellow-400 font-black">{row.totalCTCM}</td>
                  <td>{row.chuNhiem}</td><td>{row.kiemNhiem}</td><td className="text-emerald-600 font-black">+{row.congTacKhac}</td>
                  <td className="bg-slate-900 text-white font-black">{row.grandTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEntryModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase">Nhập điểm thi đua cá nhân</h3>
            <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2">
               {(['tt', 'dn', 'sh', 'nq', 'qt', 'ga', 'sd', 'dg', 'lbg', 'tb', 'dt_hsss', 'ngc', 'bc', 'dt_ngaycong', 'tg', 'thct', 'clbm', 'dt_ctcm', 'chuNhiem', 'kiemNhiem', 'congTacKhac'] as (keyof TeacherScoreRow)[]).map(field => (
                  <div key={field}>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">{field}</label>
                    <input 
                      type="number" 
                      value={currentEntryScore[field] || 0}
                      onChange={(e) => handleScoreUpdate(selectedTeacherId, field, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold" 
                    />
                  </div>
               ))}
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowEntryModal(false)} className="flex-1 font-black text-slate-400 uppercase">Hủy</button>
              <button disabled={isSyncing} onClick={() => saveScoreToSheet(selectedTeacherId)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl tracking-widest">
                {isSyncing ? 'Đang lưu...' : 'Lưu vào Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionPage;
