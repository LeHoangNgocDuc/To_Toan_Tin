
export enum UserRole {
  GV = 'Giáo viên',
  NV = 'Nhân viên',
  TCM = 'Tổ trưởng chuyên môn',
  TP = 'Tổ phó',
  BGH = 'Ban giám hiệu'
}

export enum StaffPosition {
  NONE = 'Không',
  THIET_BI = 'Nhân viên Thiết bị',
  THU_VIEN = 'Nhân viên Thư viện'
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  subject: string;
  staffPosition?: StaffPosition;
  isApproved: boolean;
  assignedClasses: string[];
  gradeLevel?: number[]; 
  isChuNhiem?: boolean;
  duties: string[];
}

export interface TeachingDemo {
  id: string;
  week: number;
  date: string;
  period: number;
  className: string;
  teacherId: string;
  tct: number;
  lessonName: string;
  reporterId: string;
  note: string;
  session: 'Morning' | 'Afternoon';
  // New fields
  isCancelled?: boolean; // Bỏ tiết
  isLate?: boolean; // Đến trễ
  availableTeachers?: string[]; // Danh sách ID giáo viên trống tiết (để mời dự)
}

export interface LessonPlanComment {
  id: string;
  reviewerName: string;
  content: string;
  type: 'Đúng quy định' | 'Nộp trễ' | 'Thiếu HSKT' | 'Khác';
  timestamp: string;
}

export interface LessonPlanReview {
  id: string;
  teacherId: string;
  week: number;
  planName: string; // Tên bài/phân môn
  comments: LessonPlanComment[];
  lastUpdated: string;
}

export interface SystemNotification {
  id: string;
  senderId: string;
  senderName: string;
  role: string;
  content: string;
  date: string;
  executionTime?: string;
  sendEmailReminder: boolean;
  isImportant: boolean;
}

export interface TeacherScoreRow {
  teacherId: string;
  tt: number; dn: number; sh: number; nq: number; qt: number;
  ga: number; sd: number; dg: number; lbg: number; tb: number; dt_hsss: number;
  ngc: number; bc: number; dt_ngaycong: number;
  tg: number; thct: number; clbm: number; dt_ctcm: number;
  chuNhiem: number;
  kiemNhiem: number;
  congTacKhac: number;
}

export interface ScheduleItem {
  id: string;
  teacherId: string;
  subject: string;
  className: string;
  period: number;
  dayOfWeek: number;
  session: 'Morning' | 'Afternoon';
  note?: string;
  isSubstitute?: boolean;
}

export interface SubstituteRequest {
  id: string;
  absentTeacherId: string;
  substituteTeacherId: string;
  reason: string;
  date: string;
  period: number;
  className: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  pointsAwarded: number;
  // New fields
  adminNote?: string; // Ghi chú của TTCM (Bỏ tiết, sự cố...)
  isFlagged?: boolean; // Đánh dấu có vấn đề
}

export enum DocStatus {
  Approved = 'Đã duyệt',
  Draft = 'Chờ duyệt',
  NeedsEdit = 'Cần chỉnh sửa'
}

export type DocType = string;

export interface Document {
  id: string;
  title: string;
  category: 'Đề cương' | 'Đề thi' | 'Chuyên đề';
  type: DocType;
  grade: number;
  authorId: string;
  authorName?: string;
  status: DocStatus;
  uploadDate: string;
  fileUrl?: string;
  fileSize?: number;
  fileMime?: string;
}
