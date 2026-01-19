
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, DocStatus, Document as DocType } from '../types';
import { SCRIPT_URL, DRIVE_FOLDER_ID, getGoogleClientId } from '../constants';

interface DocumentPageProps {
  user: User;
}

const DocumentPage: React.FC<DocumentPageProps> = ({ user }) => {
  const [activeCategory, setActiveCategory] = useState<'Đề cương' | 'Đề thi' | 'Chuyên đề'>('Đề cương');
  const [filterType, setFilterType] = useState<string>('Tất cả');
  const [docs, setDocs] = useState<DocType[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const tokenClientRef = useRef<any>(null);

  const [clientId, setClientId] = useState(getGoogleClientId());
  const isConfigValid = clientId && !clientId.startsWith('YOUR_GOOGLE_CLIENT_ID');

  const [formData, setFormData] = useState({
    title: '',
    type: 'GKI',
    grade: 6,
    category: 'Đề cương' as 'Đề cương' | 'Đề thi' | 'Chuyên đề'
  });

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?type=documents`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGis = () => {
      if ((window as any).google && isConfigValid) {
        try {
          tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: '', 
          });
        } catch (e) {
          console.error("GIS Init Error:", e);
        }
      }
    };

    if ((window as any).google) {
      initGis();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google) {
          initGis();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
    
    fetchDocs();
  }, [isConfigValid, clientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSaveSettings = () => {
    if (!clientId.includes('.apps.googleusercontent.com')) {
      return alert('Google Client ID không hợp lệ!');
    }
    localStorage.setItem('THD_GOOGLE_CLIENT_ID', clientId);
    alert('Đã lưu cấu hình Client ID! Hệ thống sẽ tải lại.');
    setShowSettings(false);
    window.location.reload();
  };

  const handleUpload = () => {
    if (!isConfigValid) return setShowSettings(true);
    if (!formData.title) return alert('Vui lòng nhập tiêu đề tài liệu!');
    if (!selectedFile) return alert('Vui lòng chọn tệp (PDF, RAR, ZIP, Word, Excel...)!');

    if (!tokenClientRef.current) return alert('Hệ thống xác thực Google đang khởi tạo...');

    setIsUploading(true);
    setUploadProgress(0);

    // Bước 1: Lấy Token
    tokenClientRef.current.callback = async (response: any) => {
      if (response.error !== undefined) {
        setIsUploading(false);
        return alert(`Lỗi xác thực Google: ${response.error}`);
      }
      const accessToken = response.access_token;
      startUploadFlow(accessToken);
    };

    tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  };

  const startUploadFlow = async (accessToken: string) => {
    try {
      if (!selectedFile) return;

      // Xử lý tên file để tránh trùng lặp và dễ tìm kiếm
      const safeFileName = `[${formData.category}] ${formData.title}_${selectedFile.name}`.replace(/[\/\\?%*:|"<>]/g, '-');
      
      const metadata = {
        name: safeFileName,
        // Nếu file không có mimeType (như .rar đôi khi), gán mặc định octet-stream để Drive tự xử lý
        mimeType: selectedFile.type || 'application/octet-stream',
        parents: [DRIVE_FOLDER_ID]
      };

      // BƯỚC 2: Khởi tạo Resumable Upload
      const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': selectedFile.type || 'application/octet-stream',
          'X-Upload-Content-Length': selectedFile.size.toString(),
        },
        body: JSON.stringify(metadata),
      });

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) throw new Error('Không thể khởi tạo đường truyền Drive. Vui lòng thử lại.');

      // BƯỚC 3: Upload tệp
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 95);
          setUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const driveFile = JSON.parse(xhr.responseText);
          setUploadProgress(98);
          await saveToDatabase(driveFile.id);
        } else {
          setIsUploading(false);
          alert('Lỗi tải tệp lên Drive: ' + xhr.statusText);
        }
      };

      xhr.onerror = () => {
        alert('Lỗi kết nối mạng.');
        setIsUploading(false);
      };

      xhr.send(selectedFile);
    } catch (error: any) {
      alert(error.message);
      setIsUploading(false);
    }
  };

  const saveToDatabase = async (driveFileId: string) => {
    try {
      const fileUrl = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;

      const payload = {
        type: 'documents',
        action: 'save',
        data: {
          id: `doc-${Date.now()}`,
          title: formData.title,
          category: formData.category,
          type: formData.type,
          grade: formData.grade,
          authorId: user.id,
          authorName: user.name,
          status: DocStatus.Approved,
          uploadDate: new Date().toLocaleDateString('vi-VN'),
          fileSize: selectedFile?.size,
          fileMime: selectedFile?.type || 'application/octet-stream',
          fileUrl: fileUrl,
        }
      };

      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setShowUpload(false);
        setSelectedFile(null);
        alert('Nộp tài liệu thành công!');
        fetchDocs();
      }, 500);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = docs.filter(d => 
    d.category === activeCategory && 
    (filterType === 'Tất cả' || d.type === filterType)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tight">Thư viện Tài liệu</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Hệ thống lưu trữ chuyên môn Tổ Toán - Tin</p>
        </div>
        <div className="flex gap-3">
          {user.role === UserRole.TCM && (
            <button onClick={() => setShowSettings(true)} className="bg-white border border-slate-200 text-slate-400 p-4 rounded-2xl hover:text-slate-800 transition-all shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          )}
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-indigo-600 text-white px-10 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl flex items-center gap-4 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Nộp tài liệu mới
          </button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-[2.8rem] border border-slate-100 shadow-sm flex items-center w-fit overflow-x-auto max-w-full">
        {['Đề cương', 'Đề thi', 'Chuyên đề'].map((cat: any) => (
          <button 
            key={cat}
            onClick={() => { setActiveCategory(cat); setFilterType('Tất cả'); }}
            className={`px-10 py-4 rounded-[2.2rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[500px]">
        {activeCategory !== 'Chuyên đề' && (
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-3 items-center">
            {['Tất cả', 'GKI', 'CKI', 'GKII', 'CKII', 'HÈ'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-tighter ${
                  filterType === type ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-32 text-center flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
               <span className="font-black text-slate-300 uppercase italic text-sm">Đang tải kho tài liệu...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/30">
                  <th className="p-10 w-[45%]">Tên tài liệu</th>
                  <th className="p-10 text-center">Thông tin</th>
                  <th className="p-10">Người nộp</th>
                  <th className="p-10 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                  <tr key={doc.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="p-10">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transform group-hover:rotate-6 transition-transform ${
                          doc.category === 'Đề thi' ? 'bg-rose-500' : doc.category === 'Chuyên đề' ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-base group-hover:text-indigo-600 transition-colors">{doc.title}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">{doc.type} • {doc.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-10 text-center">
                       <div className="text-sm font-black text-slate-700">KHỐI {doc.grade}</div>
                       <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{formatFileSize(doc.fileSize)}</div>
                    </td>
                    <td className="p-10">
                       <div className="text-sm font-black text-slate-700">{doc.authorName}</div>
                       <div className="text-[9px] text-slate-400 font-bold uppercase">{doc.uploadDate}</div>
                    </td>
                    <td className="p-10 text-right">
                       <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       </a>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-32 text-center">
                    <div className="flex flex-col items-center opacity-10">
                       <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                       <span className="font-black text-2xl uppercase italic tracking-tighter">Hiện chưa có tài liệu nào</span>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-[60] p-6">
           <div className="bg-white rounded-[4rem] shadow-2xl max-w-lg w-full p-12 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase italic tracking-tight text-center">Cấu hình Google Drive</h3>
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
                  <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                    Admin cần nhập <strong>OAuth 2.0 Client ID</strong> để kích hoạt tính năng upload.
                  </p>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest italic text-center">Google Client ID</label>
                   <textarea rows={4} value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-[2rem] p-6 text-[12px] font-bold outline-none transition-all shadow-inner font-mono text-center" placeholder="Dán Client ID tại đây..." />
                </div>
              </div>
              <div className="mt-10 flex gap-6">
                <button onClick={() => setShowSettings(false)} className="flex-1 font-black text-slate-400 uppercase tracking-widest text-[11px] italic">Đóng</button>
                <button onClick={handleSaveSettings} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Lưu & Tải lại</button>
              </div>
           </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6 overflow-y-auto">
           <div className="bg-white rounded-[4rem] shadow-2xl max-w-xl w-full p-12 animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Nộp tài liệu</h3>
                <button onClick={() => !isUploading && setShowUpload(false)} className="text-slate-300 hover:text-slate-900">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-8">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest italic">Tiêu đề tài liệu</label>
                   <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-[1.8rem] p-6 text-sm font-bold outline-none shadow-inner" placeholder="VD: Ôn tập Đại số 9 HK I" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest italic">Giai đoạn</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none shadow-inner">
                         <option value="GKI">Giữa HK I</option>
                         <option value="CKI">Cuối HK I</option>
                         <option value="GKII">Giữa HK II</option>
                         <option value="CKII">Cuối HK II</option>
                         <option value="HÈ">Bồi dưỡng Hè</option>
                      </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest italic">Khối lớp</label>
                    <select value={formData.grade} onChange={e => setFormData({...formData, grade: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none shadow-inner">
                       {[6,7,8,9].map(g => <option key={g} value={g}>Khối {g}</option>)}
                    </select>
                  </div>
                </div>
                
                <div 
                   onClick={() => !isUploading && fileInputRef.current?.click()}
                   className={`group p-12 border-4 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center gap-6 cursor-pointer transition-all ${
                     selectedFile ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-indigo-200'
                   }`}
                >
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept=".pdf,.rar,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                   />
                   <div className={`w-20 h-20 rounded-[2.2rem] flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform ${selectedFile ? 'bg-indigo-600 text-white shadow-indigo-500/40' : 'bg-white text-slate-300 shadow-slate-100'}`}>
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   </div>
                   <div className="text-center">
                     <span className="block text-[11px] font-black text-slate-800 uppercase tracking-widest italic">
                       {selectedFile ? selectedFile.name : 'Chọn File (PDF, RAR, ZIP, Word...)'}
                     </span>
                     {selectedFile && <span className="text-[10px] text-indigo-500 font-bold block mt-1">{formatFileSize(selectedFile.size)}</span>}
                   </div>
                </div>

                {isUploading && (
                  <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic animate-pulse">Đang nén & đẩy tệp lên Drive...</span>
                      <span className="text-2xl font-black text-slate-900">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full transition-all duration-300 relative shadow-lg" style={{ width: `${uploadProgress}%` }}>
                         <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-14 flex gap-6">
                {!isUploading && (
                  <button onClick={() => setShowUpload(false)} className="flex-1 font-black text-slate-400 uppercase tracking-widest text-[11px] italic">Quay lại</button>
                )}
                <button 
                  disabled={isUploading} 
                  onClick={handleUpload} 
                  className={`flex-1 py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                    isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                >
                  {isUploading ? 'Đang truyền...' : 'Xác nhận nộp bài'}
                </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
      `}</style>
    </div>
  );
};

export default DocumentPage;
