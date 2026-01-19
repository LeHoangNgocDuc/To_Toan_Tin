
import React from 'react';
import { User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MOCK_USERS } from '../constants';

interface ReportPageProps {
  user: User;
  year: string;
}

const ReportPage: React.FC<ReportPageProps> = ({ user, year }) => {
  // Simulated data for charting
  const data = [
    { name: 'Nguyễn Văn A', points: 115 },
    { name: 'Trần Thị B', points: 108 },
    { name: 'Lê Văn C', points: 96 },
    { name: 'Phạm Thị D', points: 102 },
  ];

  const sortedData = [...data].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Báo cáo & Tổng kết</h1>
          <p className="text-slate-500">Xếp hạng và thống kê thi đua Tổ Toán - Tin</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Xuất Excel
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
            Gửi báo cáo Email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Biểu đồ thi đua học kỳ</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.points >= 110 ? '#3b82f6' : entry.points >= 100 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">Xếp hạng Giáo viên</div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Hạng</th>
                <th className="p-4">Giáo viên</th>
                <th className="p-4 text-center">Điểm</th>
                <th className="p-4">Danh hiệu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                  <td className="p-4 text-center font-bold text-blue-600">{item.points}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.points >= 110 ? 'bg-blue-100 text-blue-700' :
                      item.points >= 100 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.points >= 110 ? 'Xuất sắc' : item.points >= 100 ? 'Hoàn thành tốt' : 'Hoàn thành'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Table Styled like Excel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-800 text-white font-bold text-sm uppercase flex justify-between">
          <span>Bảng tổng hợp thi đua Tổ Toán - Tin Năm học {year}</span>
          <span className="text-xs opacity-70">Cập nhật: 24/10/2024</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="p-3 border-r border-slate-200">STT</th>
                <th className="p-3 border-r border-slate-200">Họ và tên</th>
                <th className="p-3 border-r border-slate-200">TT-CT-ĐĐ-LS</th>
                <th className="p-3 border-r border-slate-200">Chuyên môn</th>
                <th className="p-3 border-r border-slate-200">HSSS</th>
                <th className="p-3 border-r border-slate-200">Kiêm nhiệm</th>
                <th className="p-3 border-r border-slate-200">Điểm khác</th>
                <th className="p-3 bg-blue-50 text-blue-800">TỔNG CỘNG</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_USERS.filter(u => u.role !== UserRole.BGH).map((user, idx) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 border-r border-slate-200 text-center text-slate-400">{idx + 1}</td>
                  <td className="p-3 border-r border-slate-200 font-medium">{user.name}</td>
                  <td className="p-3 border-r border-slate-200 text-center">20</td>
                  <td className="p-3 border-r border-slate-200 text-center">40</td>
                  <td className="p-3 border-r border-slate-200 text-center">20</td>
                  <td className="p-3 border-r border-slate-200 text-center">10</td>
                  <td className="p-3 border-r border-slate-200 text-center text-green-600">+5</td>
                  <td className="p-3 bg-blue-50/50 text-center font-bold text-blue-700 italic">95</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
