
import React, { useState, useEffect } from 'react';
import { User, UserRole, LessonPlanReview } from '../types';
import { SCRIPT_URL } from '../constants';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, BorderStyle, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface LessonPlanPageProps {
  user: User;
  users: User[];
}

const LessonPlanPage: React.FC<LessonPlanPageProps> = ({ user, users }) => {
  const [reviews, setReviews] = useState<LessonPlanReview[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const canReview = user.role === UserRole.TCM || user.role === UserRole.TP;

  const [newComment, setNewComment] = useState({
    week: 1,
    planName: '',
    content: '',
    type: 'Đúng quy định' as 'Đúng quy định' | 'Nộp trễ' | 'Thiếu HSKT' | 'Khác'
  });

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?type=lessonPlans`);
      const data = await response.json();
      if (Array.isArray(data)) setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleAddComment = async () => {
    if (!selectedTeacherId) return alert('Vui lòng chọn giáo viên!');
    if (!newComment.planName) return alert('Vui lòng nhập tên bài/phân môn!');

    setIsSaving(true);
    const timestamp = new Date().toLocaleString('vi-VN');
    
    // Tìm review cũ của GV này trong tuần này
    const existingReview = reviews.find(r => r.teacherId === selectedTeacherId && r.week === newComment.week);
    
    const commentData = {
      id: `cmt-${Date.now()}`,
      reviewerName: user.name,
      content: newComment.content,
      type: newComment.type,
      timestamp
    };

    let updatedReview: LessonPlanReview;

    if (existingReview) {
      updatedReview = {
        ...existingReview,
        planName: newComment.planName, // Cập nhật tên bài mới nhất
        lastUpdated: timestamp,
        comments: [...existingReview.comments, commentData]
      };
    } else {
      updatedReview = {
        id: `lp-${Date.now()}`,
        teacherId: selectedTeacherId,
        week: newComment.week,
        planName: newComment.planName,
        lastUpdated: timestamp,
        comments: [commentData]
      };
    }

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ type: 'lessonPlans', action: 'save', data: updatedReview })
      });
      
      // Update local state
      if (existingReview) {
        setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
      } else {
        setReviews(prev => [...prev, updatedReview]);
      }
      
      setNewComment({ ...newComment, content: '', type: 'Đúng quy định' });
      alert('Đã thêm nhận xét!');
    } catch (e) {
      alert('Lỗi khi lưu!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportWord = async () => {
    if (!selectedTeacherId) return;
    setIsExporting(true);

    try {
      const teacherName = users.find(u => u.id === selectedTeacherId)?.name || "Giáo viên";
      const teacherReviews = reviews
        .filter(r => r.teacherId === selectedTeacherId)
        .sort((a, b) => a.week - b.week);

      if (teacherReviews.length === 0) {
        alert("Giáo viên này chưa có nhận xét nào để xuất file.");
        setIsExporting(false);
        return;
      }

      // Tạo các hàng cho bảng
      const tableRows = teacherReviews.map(review => {
        // Gom tất cả comment trong tuần đó thành các đoạn văn
        const commentParagraphs = review.comments.map(cmt => {
            return new Paragraph({
                children: [
                    new TextRun({
                        text: `${cmt.reviewerName} (${cmt.timestamp}): `,
                        bold: true,
                        size: 22, // 11pt
                    }),
                    new TextRun({
                        text: `[${cmt.type}] `,
                        bold: true,
                        color: cmt.type === 'Đúng quy định' ? "008000" : "FF0000",
                        size: 22,
                    }),
                    new TextRun({
                        text: cmt.content,
                        size: 22,
                    })
                ],
                spacing: { after: 100 } // Khoảng cách giữa các comment
            });
        });

        return new TableRow({
            children: [
                new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: review.week.toString(), alignment: AlignmentType.CENTER })],
                }),
                new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: review.planName })],
                }),
                new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    children: commentParagraphs.length > 0 ? commentParagraphs : [new Paragraph("Chưa có nhận xét")],
                }),
            ],
        });
      });

      // Tạo Header bảng
      const headerRow = new TableRow({
          children: [
              new TableCell({
                  children: [new Paragraph({ text: "Tuần", bold: true, alignment: AlignmentType.CENTER })],
                  shading: { fill: "E0E0E0" },
              }),
              new TableCell({
                  children: [new Paragraph({ text: "Tên bài dạy / Phân môn", bold: true, alignment: AlignmentType.CENTER })],
                  shading: { fill: "E0E0E0" },
              }),
              new TableCell({
                  children: [new Paragraph({ text: "Nội dung kiểm tra & Nhận xét", bold: true, alignment: AlignmentType.CENTER })],
                  shading: { fill: "E0E0E0" },
              }),
          ],
      });

      const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "TỔNG HỢP NHẬN XÉT KẾ HOẠCH BÀI DẠY",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Tổ chuyên môn: ", bold: true }),
                        new TextRun({ text: "Toán - Tin" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Giáo viên được kiểm tra: ", bold: true }),
                        new TextRun({ text: teacherName }),
                    ],
                    spacing: { after: 300 },
                }),
                new Table({
                    rows: [headerRow, ...tableRows],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                }),
                new Paragraph({
                    text: `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`,
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 400 },
                    italics: true,
                }),
            ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Nhan_xet_KHBD_${teacherName.replace(/\s/g, '_')}.docx`);

    } catch (error) {
      console.error("Export Error:", error);
      alert("Có lỗi xảy ra khi xuất file Word.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedTeacher = users.find(u => u.id === selectedTeacherId);
  const teacherReviews = reviews.filter(r => r.teacherId === selectedTeacherId).sort((a,b) => b.week - a.week);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Left Sidebar: List Teachers */}
      <div className="lg:w-1/4 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-800 uppercase italic">Danh sách GV</h3>
          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Tổ Toán - Tin</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {users.filter(u => u.role !== UserRole.NV && u.isApproved).map(u => (
            <button 
              key={u.id}
              onClick={() => setSelectedTeacherId(u.id)}
              className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedTeacherId === u.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${selectedTeacherId === u.id ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>
                {u.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">{u.name}</div>
                <div className={`text-[9px] font-black uppercase tracking-widest ${selectedTeacherId === u.id ? 'text-slate-400' : 'text-slate-400'}`}>{u.subject}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content: Reviews */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {selectedTeacher ? (
          <>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">Kế hoạch bài dạy</h2>
                <p className="text-slate-500 text-xs font-bold mt-1">Giáo viên: {selectedTeacher.name} • {selectedTeacher.assignedClasses?.join(', ')}</p>
              </div>
              <div className="flex gap-3">
                 <button 
                    onClick={handleExportWord} 
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                 >
                    {isExporting ? (
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    )}
                    Xuất File Word
                 </button>
                 {canReview && (
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center">
                    Chế độ: Tổ trưởng/Tổ phó
                    </div>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {/* Form nhận xét mới */}
              {canReview && (
                <div className="mb-10 bg-blue-50/50 rounded-[2rem] p-8 border-2 border-blue-100">
                  <h4 className="text-sm font-black text-blue-800 uppercase mb-4 tracking-widest">Thêm ký duyệt & Nhận xét mới</h4>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                     <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tuần</label>
                       <input type="number" value={newComment.week} onChange={e => setNewComment({...newComment, week: parseInt(e.target.value)})} className="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold bg-white" />
                     </div>
                     <div className="col-span-2">
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Tên bài dạy / Phân môn</label>
                       <input type="text" value={newComment.planName} onChange={e => setNewComment({...newComment, planName: e.target.value})} className="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold bg-white" placeholder="VD: Hình học 9 - Tiết 12" />
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Loại nhận xét</label>
                       <select value={newComment.type} onChange={e => setNewComment({...newComment, type: e.target.value as any})} className="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold bg-white">
                         <option value="Đúng quy định">Đúng quy định</option>
                         <option value="Nộp trễ">Nộp trễ</option>
                         <option value="Thiếu HSKT">Thiếu HSKT</option>
                         <option value="Khác">Khác</option>
                       </select>
                     </div>
                  </div>
                  <div className="mb-4">
                     <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nội dung chi tiết (Tùy chọn)</label>
                     <textarea value={newComment.content} onChange={e => setNewComment({...newComment, content: e.target.value})} className="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold bg-white h-20" placeholder="Nhập nhận xét cụ thể..."></textarea>
                  </div>
                  <button disabled={isSaving} onClick={handleAddComment} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all w-full">
                    {isSaving ? 'Đang lưu...' : 'Lưu nhận xét'}
                  </button>
                </div>
              )}

              {/* Lịch sử nhận xét */}
              <div className="space-y-6">
                {teacherReviews.length > 0 ? teacherReviews.map(review => (
                  <div key={review.id} className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
                      <div>
                        <span className="text-xl font-black text-slate-800">Tuần {review.week}</span>
                        <span className="mx-3 text-slate-300">|</span>
                        <span className="text-sm font-bold text-slate-600">{review.planName}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cập nhật: {review.lastUpdated}</span>
                    </div>
                    <div className="p-6 space-y-4">
                      {review.comments.map((cmt, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="mt-1 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                             {cmt.reviewerName.charAt(0)}
                          </div>
                          <div className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                             <div className="flex justify-between mb-2">
                                <span className="text-xs font-black text-slate-800">{cmt.reviewerName}</span>
                                <span className="text-[9px] text-slate-400">{cmt.timestamp}</span>
                             </div>
                             <div className="mb-2">
                               <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                 cmt.type === 'Đúng quy định' ? 'bg-emerald-100 text-emerald-600' : 
                                 cmt.type === 'Nộp trễ' ? 'bg-orange-100 text-orange-600' : 
                                 'bg-red-100 text-red-600'
                               }`}>
                                 {cmt.type}
                               </span>
                             </div>
                             {cmt.content && <p className="text-sm text-slate-600 italic">"{cmt.content}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 opacity-30">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="font-black text-xl uppercase italic">Chưa có dữ liệu KHBD</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
            <svg className="w-24 h-24 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="font-black text-2xl uppercase italic">Chọn giáo viên để xem KHBD</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanPage;
