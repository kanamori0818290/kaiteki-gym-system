import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckSquare, Info, XCircle, Plus, Trash2, Users, Building, MapPin, Clock, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Loader2, Lock, LogOut, Check, X, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query } from 'firebase/firestore';

// --- Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyCTDD_TMng6EclbLiMoc7-36QRowhQrvew",
  authDomain: "kaiteki-gym.firebaseapp.com",
  projectId: "kaiteki-gym",
  storageBucket: "kaiteki-gym.firebasestorage.app",
  messagingSenderId: "88315814584",
  appId: "1:88315814584:web:14eb104398bb05cf0bca4d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'kaiteki-gym-production';
const safeAppId = String(rawAppId).replace(/\//g, '-');

const ADMIN_PASSWORD = "admin123";

// 備品リスト
const equipmentForAll = [
  'バドミントン用器具（ポール・ネット）',
  'ビーチボールバレー用器具（ポール・ネット・審判台）',
  'バレーボール用器具（ポール・ネット・審判台）',
  '卓球用器具（台・ネット）',
  'フットサル用器具（ゴール）'
];

const equipmentForEmployeesOnly = [
  'バドミントン用品（ラケット、シャトル）',
  '各種ボール（ビーチ、バスケ、ドッジ、バレー、卓球）',
  '卓球ラケット'
];

// ユーティリティ
const formatDateStr = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();

// 時間の重複チェック関数 (10:00-11:00 と 11:00-12:00 は重複しない)
const isTimeOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

// --- メインコンポーネント ---
export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [toastMessage, setToastMessage] = useState(null);
  const [preSelectedDate, setPreSelectedDate] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (error) { console.error("Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const resRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations');
    const unsubscribe = onSnapshot(resRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservations(data);
      setIsLoading(false);
    }, (err) => { 
      console.error("Firestore Error:", err); 
      setIsLoading(false); 
    });
    return () => unsubscribe();
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassInput('');
      setActiveTab('admin');
      showToast('管理者としてログインしました');
    } else {
      alert('パスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <Building className="h-8 w-8 text-blue-200" />
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-bold tracking-tight mr-2 tracking-wider">KAITEKI体育館</h1>
                {!isAdmin ? (
                  <button onClick={() => setShowLoginModal(true)} className="p-1.5 hover:bg-blue-700 rounded-full transition-colors border border-blue-400/30">
                    <Lock className="h-4 w-4 text-blue-300" />
                  </button>
                ) : (
                  <button onClick={() => {setIsAdmin(false); setActiveTab('calendar');}} className="flex items-center text-[10px] bg-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-700">
                    <LogOut className="h-3 w-3 mr-1" />解除
                  </button>
                )}
              </div>
              <p className="text-[10px] text-blue-200 opacity-80 font-bold">三菱ケミカル / ダイヤリックス株式会社</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-blue-900/50 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            <TabButton icon={<Calendar />} label="状況" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabButton icon={<FileText />} label="予約" isActive={activeTab === 'reserve'} onClick={() => { setActiveTab('reserve'); setPreSelectedDate(''); }} />
            <TabButton icon={<XCircle />} label="取消" isActive={activeTab === 'cancel'} onClick={() => setActiveTab('cancel')} />
            {isAdmin && <TabButton icon={<ShieldCheck className="text-yellow-400" />} label="管理" isActive={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
            <TabButton icon={<Info />} label="規約" isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10 py-20">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-base font-bold text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="w-full space-y-8">
            {activeTab === 'calendar' && <CalendarView reservations={reservations} onReserveClick={(d) => {setPreSelectedDate(d); setActiveTab('reserve');}} />}
            {activeTab === 'reserve' && <ReservationForm initialDate={preSelectedDate} reservations={reservations} user={user} onSuccess={() => {showToast('申し込みを送信しました。承認をお待ちください。'); setActiveTab('calendar');}} />}
            {activeTab === 'cancel' && <CancelView reservations={reservations} onSuccess={() => showToast('予約をキャンセルしました')} />}
            {activeTab === 'rules' && <RulesView />}
            {activeTab === 'admin' && isAdmin && <AdminDashboard reservations={reservations} onStatusUpdate={() => showToast('更新しました')} />}
          </div>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center text-blue-800"><Lock className="mr-3 h-6 w-6"/>管理者ログイン</h3>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full border-2 border-gray-100 p-3 rounded-xl mb-6 text-center text-lg tracking-widest focus:border-blue-500 outline-none transition-all shadow-inner" placeholder="パスワード" />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 text-gray-500 py-2 font-bold hover:bg-gray-100 rounded-xl">閉じる</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 shadow-md">ログイン</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-10 z-50">
          <CheckSquare className="h-5 w-5 text-green-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-900 shadow-md' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}>
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      <span>{label}</span>
    </button>
  );
}

// 1. カレンダービュー
function CalendarView({ reservations, onReserveClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateStr(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
  
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const selectedDayReservations = reservations.filter(res => res.date === selectedDateStr);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center tracking-tight"><CalendarDays className="mr-2 h-7 w-7 text-blue-600"/> 空き状況カレンダー</h2>
        <div className="flex space-x-4 text-xs bg-white px-4 py-2 rounded-xl shadow-sm border font-bold">
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5 shadow-sm"></span>承認済</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-1.5 shadow-sm"></span>申請中</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handlePrevMonth} className="p-2 border rounded-xl hover:bg-gray-50"><ChevronLeft className="h-5 w-5 text-blue-600"/></button>
            <span className="font-bold text-xl text-blue-950">{currentYear}年 {currentMonth}月</span>
            <button onClick={handleNextMonth} className="p-2 border rounded-xl hover:bg-gray-50"><ChevronRight className="h-5 w-5 text-blue-600"/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-gray-400 text-[10px] font-bold mb-3 uppercase tracking-widest">
            <div className="text-red-400">Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div className="text-blue-400">Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {blanks.map(b => <div key={`b-${b}`} className="p-2"></div>)}
            {days.map(d => {
              const dStr = formatDateStr(currentYear, currentMonth, d);
              const dayRes = reservations.filter(r => r.date === dStr);
              const hasApp = dayRes.some(r => r.status === 'approved');
              const hasPen = dayRes.some(r => r.status === 'pending');
              const isToday = formatDateStr(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate()) === dStr;
              return (
                <button key={d} onClick={() => setSelectedDateStr(dStr)} className={`min-h-[4.5rem] border rounded-xl flex flex-col items-center justify-between p-2 transition-all ${dStr === selectedDateStr ? 'border-blue-600 bg-blue-50 shadow ring-2 ring-blue-100' : 'border-gray-50 hover:border-blue-200 hover:bg-blue-50/50'} ${isToday ? 'bg-orange-50/50' : ''}`}>
                  <span className={`text-base font-bold ${dStr === selectedDateStr ? 'text-blue-900' : (isToday ? 'text-orange-600' : 'text-gray-700')}`}>{d}</span>
                  <div className="flex space-x-1 mb-1">
                    {hasApp && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />}
                    {hasPen && <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-5 bg-blue-800 text-white font-bold flex justify-between items-center text-base">
            <span>{selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日 の詳細</span>
            <Clock className="h-5 w-5 opacity-60" />
          </div>
          <div className="p-5 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
            {selectedDayReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDayReservations.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(res => (
                  <div key={res.id} className={`border-l-8 p-4 rounded-xl shadow-sm bg-white transition-all hover:scale-[1.02] ${res.status === 'approved' ? 'border-blue-500' : 'border-yellow-400'}`}>
                    <div className="text-base font-bold text-gray-900 mb-1 tracking-tight">{res.startTime} - {res.endTime}</div>
                    <div className="text-sm font-bold text-blue-700 my-1 bg-blue-50 px-2 py-0.5 rounded inline-block">
                      {res.place} {res.courts ? `(${res.courts.join('')}面)` : ''}
                    </div>
                    <div className="text-xs font-bold text-gray-500">団体: {res.name}</div>
                    <div className={`mt-2 text-[10px] font-bold px-3 py-0.5 inline-block rounded-full ${res.status === 'approved' ? 'bg-blue-600 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                      {res.status === 'approved' ? '利用確定済' : '承認待ち'}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-10 opacity-50">
                  <CheckSquare className="h-10 w-10" />
                  <p className="text-sm font-bold">予約はありません</p>
                </div>}
          </div>
          <div className="p-5 border-t bg-white">
            <button onClick={() => onReserveClick(selectedDateStr)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center">
              <Plus className="h-5 w-5 mr-2" /> この日で予約する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. 新規予約フォーム
function ReservationForm({ initialDate, reservations, user, onSuccess }) {
  const [userType, setUserType] = useState('external');
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [formData, setFormData] = useState({ 
    name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', place: '', purpose: '' 
  });
  const [selectedCourts, setSelectedCourts] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [members, setMembers] = useState([{ name: '', address: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 指定された時間の重複状況を計算
  const getOccupiedCourts = () => {
    if (!selectedDate || !formData.startTime || !formData.endTime || formData.place !== '体育館') return [];
    
    // 他団体の確定済み/承認待ち予約をチェック
    return reservations
      .filter(r => r.date === selectedDate && r.place === '体育館' && r.courts)
      .filter(r => isTimeOverlapping(formData.startTime, formData.endTime, r.startTime, r.endTime))
      .flatMap(r => r.courts);
  };

  const occupiedCourts = getOccupiedCourts();

  const toggleCourt = (court) => {
    if (occupiedCourts.includes(court)) return; // 重複している場合は選択不可
    setSelectedCourts(prev => {
      if (prev.includes(court)) return prev.filter(c => c !== court);
      if (prev.length >= 3) {
        alert("1団体で同時に予約できるのは最大3面までです。");
        return prev;
      }
      return [...prev, court].sort();
    });
  };

  const handleAddMember = () => setMembers([...members, { name: '', address: '' }]);
  const handleRemoveMember = (idx) => setMembers(members.filter((_, i) => i !== idx));

  const toggleEquipment = (item) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("認証エラーです");
    if (formData.place === '体育館' && selectedCourts.length === 0) return alert("利用するコート(A-F)を選んでください。");
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations'), {
        date: selectedDate, userType, ...formData, 
        courts: formData.place === '体育館' ? selectedCourts : null,
        equipment, members, status: 'pending', createdAt: new Date().toISOString(), userId: user.uid
      });
      onSuccess();
    } catch (err) { alert("保存に失敗しました。"); } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-500 pb-10">
      <h2 className="text-3xl font-bold flex items-center text-gray-900 tracking-tight">
        <div className="bg-blue-600 text-white p-3 rounded-2xl mr-4 shadow-lg"><FileText className="h-7 w-7" /></div>
        施設利用申し込み
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ①基本情報 */}
        <div className="bg-white p-8 rounded-3xl border shadow-lg space-y-6 h-fit">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><Users className="h-6 w-6 mr-3 text-blue-500"/> ① 基本情報</h3>
          <div className="flex bg-gray-50 p-1.5 rounded-2xl shadow-inner">
            {['employee', 'external'].map(type => (
              <label key={type} className={`flex-1 py-4 rounded-xl text-center cursor-pointer transition-all font-bold text-sm ${userType === type ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-500'}`}>
                <input type="radio" checked={userType === type} onChange={() => setUserType(type)} className="hidden" />
                <span>{type === 'employee' ? '従業員' : '一般・団体'}</span>
              </label>
            ))}
          </div>
          <div className="space-y-4">
            <InputField label="利用団体名 *" value={formData.name} onChange={(v)=>setFormData({...formData, name:v})} placeholder="団体名を入力" />
            <InputField label="利用責任者 *" value={formData.repName} onChange={(v)=>setFormData({...formData, repName:v})} placeholder="氏名を入力" />
            <InputField label="メールアドレス *" type="email" value={formData.email} onChange={(v)=>setFormData({...formData, email:v})} placeholder="example@email.com" />
            <InputField label="緊急連絡先 *" type="tel" value={formData.phone} onChange={(v)=>setFormData({...formData, phone:v})} placeholder="090-XXXX-XXXX" />
          </div>
        </div>

        {/* ②日時と場所 */}
        <div className="bg-white p-8 rounded-3xl border shadow-lg space-y-6">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><MapPin className="h-6 w-6 mr-3 text-blue-500"/> ② 日時と場所</h3>
          <div className="space-y-5">
            <div className="space-y-2 px-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">利用日 *</label>
              <input type="date" required value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="border-2 border-gray-100 p-4 rounded-2xl w-full font-bold text-xl text-blue-900 focus:border-blue-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 px-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">開始時間 *</label>
                <input type="time" step="600" required value={formData.startTime} onChange={(e)=>setFormData({...formData, startTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">終了時間 *</label>
                <input type="time" step="600" required value={formData.endTime} onChange={(e)=>setFormData({...formData, endTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2 px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">施設選択 *</label>
                <select required value={formData.place} onChange={(e)=>setFormData({...formData, place:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-base font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none appearance-none">
                  <option value="">場所を選択</option>
                  <option value="体育館">体育館（アリーナ）</option>
                  <option value="多目的室">多目的室</option>
                </select>
              </div>

              {formData.place === '体育館' && (
                <div className="space-y-4 animate-in zoom-in duration-300 px-2">
                  <label className="text-sm font-bold text-blue-800 flex justify-between px-1">
                    <span>コート選択 (最大3面) *</span>
                    <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">選択中: {selectedCourts.length}/3</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 p-5 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">用具側</p>
                      <div className="flex space-x-3 justify-center">
                        {['E', 'D', 'F'].map(c => (
                          <CourtButton key={c} label={c} active={selectedCourts.includes(c)} occupied={occupiedCourts.includes(c)} onClick={() => toggleCourt(c)} />
                        ))}
                      </div>
                    </div>
                    <div className="my-1 border-b border-gray-200 w-2/3 mx-auto"></div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">入口側</p>
                      <div className="flex space-x-3 justify-center">
                        {['A', 'B', 'C'].map(c => (
                          <CourtButton key={c} label={c} active={selectedCourts.includes(c)} occupied={occupiedCourts.includes(c)} onClick={() => toggleCourt(c)} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 px-1 italic">※赤色のコートは他の団体が予約済みです。</p>
                </div>
              )}
            </div>

            <div className="space-y-2 px-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">利用目的 *</label>
              <textarea required placeholder="例：バドミントン練習" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-sm font-bold h-24 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* ③備品選択 */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6 lg:col-span-2">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><CheckSquare className="h-7 w-7 mr-3 text-blue-500"/> ③ 貸出備品</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
            <div className="space-y-4">
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit tracking-wider border border-blue-100">全員貸出可能</p>
              <div className="grid grid-cols-1 gap-2">
                {equipmentForAll.map(item => (
                  <label key={item} className="flex items-center space-x-3 text-sm font-bold cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                    <input type="checkbox" checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`space-y-4 ${userType !== 'employee' ? 'opacity-30' : ''}`}>
              <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit tracking-wider border border-red-100">従業員のみ</p>
              <div className="grid grid-cols-1 gap-2">
                {equipmentForEmployeesOnly.map(item => (
                  <label key={item} className={`flex items-center space-x-3 text-sm font-bold ${userType !== 'employee' ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} p-2 rounded-xl transition-colors`}>
                    <input type="checkbox" disabled={userType !== 'employee'} checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              {userType !== 'employee' && <p className="text-[10px] text-red-500 font-bold italic px-2">※ラケット・ボール類はご持参ください。</p>}
            </div>
          </div>
        </div>

        {/* ④利用者名簿 */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b-2 border-blue-50 pb-3">
            <h3 className="font-bold flex items-center text-blue-900 text-xl tracking-tight"><Plus className="h-7 w-7 mr-3 text-blue-500"/> ④ 利用者名簿</h3>
            <button type="button" onClick={handleAddMember} className="bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-full hover:bg-blue-100 transition-colors flex items-center shadow-sm text-sm"><Plus className="h-4 w-4 mr-1"/>行を追加</button>
          </div>
          <p className="text-xs text-gray-500 font-bold leading-relaxed px-4 border-l-4 border-gray-200">※必ず全員の氏名を記入してください（見学者含む）。住所は町名まで記入してください。</p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 px-2">
            {members.map((m, idx) => (
              <div key={idx} className="flex space-x-3 items-center bg-gray-50 p-3 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all">
                <span className="text-[10px] font-bold text-gray-300 w-4 text-center">{idx + 1}</span>
                <input required type="text" placeholder="氏名" value={m.name} onChange={(e) => {
                  const n = [...members]; n[idx].name = e.target.value; setMembers(n);
                }} className="bg-white border-2 border-transparent focus:border-blue-300 p-2.5 rounded-xl flex-1 text-sm font-bold outline-none shadow-sm" />
                <input required type="text" placeholder="住所（町名まで）" value={m.address} onChange={(e) => {
                  const n = [...members]; n[idx].address = e.target.value; setMembers(n);
                }} className="bg-white border-2 border-transparent focus:border-blue-300 p-2.5 rounded-xl flex-[2] text-sm font-bold outline-none shadow-sm" />
                {members.length > 1 && (
                  <button type="button" onClick={() => handleRemoveMember(idx)} className="text-red-300 hover:text-red-500 transition-all p-2"><Trash2 className="h-5 w-5" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-8 space-y-6">
        <button type="submit" disabled={isSubmitting} className="w-full max-w-lg bg-blue-600 text-white py-5 rounded-[2rem] font-bold text-xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:bg-gray-400 flex items-center justify-center">
          {isSubmitting ? <><Loader2 className="animate-spin mr-3"/> 送信中...</> : 'この内容で予約を申し込む'}
        </button>
        <p className="text-xs text-gray-400 font-bold max-w-sm text-center">※承認状況は「状況」タブからご確認ください。</p>
      </div>
    </form>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1 px-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">{label}</label>
      <input type={type} required placeholder={placeholder} value={value} onChange={(e)=>onChange(e.target.value)} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3.5 rounded-2xl w-full text-base font-bold outline-none transition-all shadow-inner" />
    </div>
  );
}

function CourtButton({ label, active, occupied, onClick }) {
  return (
    <button 
      type="button"
      disabled={occupied}
      onClick={onClick}
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-bold text-xl transition-all shadow-sm flex items-center justify-center relative
        ${occupied ? 'bg-red-50 text-red-300 border-2 border-red-100 cursor-not-allowed opacity-60' : 
          active ? 'bg-blue-600 text-white shadow-blue-500/30 border-2 border-blue-400' : 'bg-white text-gray-500 border-2 border-gray-100 hover:border-blue-400 hover:text-blue-500'}
      `}
    >
      {label}
      {occupied && <X className="absolute h-4 w-4 text-red-300 bottom-1 right-1" />}
    </button>
  );
}

// 3. 承認管理（管理者画面）
function AdminDashboard({ reservations, onStatusUpdate }) {
  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id), { status: newStatus });
      onStatusUpdate();
    } catch (err) { alert("更新に失敗しました"); }
  };

  const deleteReservation = async (id) => {
    if (window.confirm('却下（削除）しますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
      onStatusUpdate();
    }
  };

  const pending = reservations.filter(r => r.status === 'pending').sort((a,b)=>a.date.localeCompare(b.date));
  const approved = reservations.filter(r => r.status === 'approved').sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto py-4">
      <div className="flex items-end justify-between border-b-2 pb-6">
        <h2 className="text-3xl font-bold flex items-center text-blue-900 tracking-tight">
          <ShieldCheck className="mr-3 h-8 w-8 text-blue-600"/> 予約承認管理
        </h2>
        <div className="text-right">
          <p className="text-sm font-bold text-blue-600">待ち: {pending.length}件</p>
        </div>
      </div>
      
      <section>
        <h3 className="font-bold text-xl text-yellow-700 mb-6 flex items-center bg-yellow-50 px-5 py-2 rounded-2xl w-fit border border-yellow-200 shadow-sm">
          <Clock className="h-6 w-6 mr-3 animate-pulse"/> 未承認の申請
        </h3>
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border border-dashed text-center text-gray-300 font-bold">新しい申請はありません</div>
          ) : pending.map(res => (
            <div key={res.id} className="bg-white p-8 rounded-[2.5rem] border shadow-lg flex flex-col md:flex-row justify-between gap-6 hover:border-yellow-200 transition-all">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="bg-yellow-100 text-yellow-800 text-[10px] px-3 py-0.5 rounded-full font-bold uppercase tracking-widest border border-yellow-200">Pending</span>
                  <span className="font-bold text-2xl text-gray-900">{res.date}</span>
                </div>
                <div className="text-xl font-bold text-blue-800 leading-none py-1">{res.startTime} - {res.endTime}</div>
                <div className="text-lg font-bold text-gray-700">{res.place} {res.courts ? `(${res.courts.join('')})` : ''}</div>
                <div className="text-sm text-gray-500 font-bold border-t pt-3 mt-3">
                  <div className="mb-1 underline decoration-blue-200">団体: {res.name} (代表: {res.repName} / {res.phone})</div>
                  <div className="bg-gray-50 p-3 rounded-xl italic">目的: {res.purpose}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={()=>deleteReservation(res.id)} className="border-2 border-red-500 text-red-500 px-6 py-2 rounded-2xl font-bold text-sm hover:bg-red-50">削除</button>
                <button onClick={()=>updateStatus(res.id, 'approved')} className="bg-green-600 text-white px-10 py-4 rounded-full font-bold text-base hover:bg-green-700 shadow-lg transition-transform active:scale-95 flex items-center">
                  <Check className="h-6 w-6 mr-2"/> 承認
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-bold text-xl text-blue-900 mb-6 border-b-2 border-blue-100 pb-2">承認済みリスト</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approved.slice(0, 12).map(res => (
            <div key={res.id} className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center group">
              <div className="truncate pr-4">
                <div className="font-bold text-lg text-gray-900 truncate">{res.date} <span className="text-blue-600 text-sm font-bold">({res.startTime})</span></div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">{res.place} | {res.name}</div>
              </div>
              <button onClick={()=>updateStatus(res.id, 'pending')} className="text-[10px] font-bold text-gray-300 hover:text-red-500 transition-colors border p-2 rounded-xl group-hover:opacity-100 opacity-0">撤回</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 4. 確認・取消
function CancelView({ reservations, onSuccess }) {
  const [searchName, setSearchName] = useState('');
  const [found, setFound] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setFound(reservations.filter(res => res.repName.includes(searchName)));
  };

  const handleCancel = async (id) => {
    if (window.confirm('本当にこの予約を取り消しますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
      onSuccess();
      setFound(found.filter(f => f.id !== id));
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border shadow-2xl animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-8 flex items-center text-gray-800 tracking-tight">
        <div className="bg-red-50 text-red-500 p-3 rounded-2xl mr-4"><XCircle className="h-7 w-7" /></div>
        確認・キャンセル
      </h2>
      
      <div className="bg-yellow-100/50 p-6 rounded-[2rem] border-2 border-white mb-10 text-xs font-bold text-yellow-800 leading-relaxed shadow-inner">
        <p className="text-base font-bold mb-3 flex items-center text-orange-950"><AlertTriangle className="h-5 w-5 mr-2 text-orange-600"/> キャンセル時の注意事項</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>一般団体の方は、利用日の<strong>3日前まで</strong>にシステムから手続きしてください。</li>
          <li>土日祝、平日夜間の直前キャンセルは管理人（<span className="text-red-600 underline">080-7896-2363</span>）へ直接ご連絡ください。</li>
          <li>無断キャンセルが続く場合、以後の貸出をお断りすることがあります。</li>
        </ul>
      </div>

      <form onSubmit={handleSearch} className="flex space-x-4 mb-12">
        <input required value={searchName} onChange={(e)=>setSearchName(e.target.value)} className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none font-bold text-lg transition-all" placeholder="代表者氏名を入力" />
        <button className="bg-gray-800 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95">検索</button>
      </form>
      
      {found && (
        <div className="space-y-6 px-2">
          <p className="text-[10px] font-bold text-gray-400 border-b pb-2 uppercase tracking-widest">検索結果</p>
          {found.length === 0 ? (
            <p className="text-center text-gray-400 font-bold italic py-16">予約が見つかりませんでした</p>
          ) : found.map(res => (
            <div key={res.id} className="border-2 border-gray-50 bg-white p-6 rounded-3xl flex justify-between items-center hover:bg-gray-50 transition-all shadow-sm">
              <div>
                <div className="font-bold text-2xl text-gray-900 tracking-tight mb-1">{res.date} <span className="text-blue-600 text-base ml-2">({res.startTime})</span></div>
                <div className="text-xs font-bold text-gray-400 uppercase">{res.place} {res.courts ? `(${res.courts.join('')})` : ''} | {res.status === 'approved' ? '確定' : '申請中'}</div>
              </div>
              <button onClick={()=>handleCancel(res.id)} className="text-red-500 font-bold text-sm border-2 border-red-500 px-6 py-2 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                取消
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 5. 利用ルール
function RulesView() {
  return (
    <div className="max-w-4xl mx-auto bg-white p-10 sm:p-16 rounded-[3.5rem] border shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <h2 className="text-3xl font-bold mb-12 border-b-8 border-blue-500 pb-6 text-blue-900 flex justify-between items-center tracking-tight">
        貸出運用ルール
        <Info className="h-10 w-10 text-blue-100" />
      </h2>
      
      <div className="grid md:grid-cols-2 gap-16">
        <div className="space-y-12">
          <section>
            <h3 className="font-bold flex items-center text-blue-800 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">① 利用時間</h3>
            <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-8 text-sm font-bold leading-loose shadow-inner">
              <div>
                <div className="flex justify-between items-center text-xl mb-3"><span>平日</span><span className="bg-gray-900 text-white px-4 py-1 rounded-xl">8:30 - 21:00</span></div>
                <div className="flex justify-between items-center text-xl"><span>休日</span><span className="bg-gray-900 text-white px-4 py-1 rounded-xl">8:30 - 17:00</span></div>
                <p className="text-[10px] text-gray-400 mt-4 font-bold italic">※平日20:30、休日16:30 最終受付</p>
              </div>
              <div className="pt-6 border-t-2 border-gray-100">
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-2">Closed Days</p>
                <p className="text-2xl text-red-600 font-bold tracking-tight">毎月 第１・第３日曜日</p>
                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">※お盆、正月、GW、会社カレンダー準拠。<br/>※予約状況により臨時休館あり。</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold flex items-center text-blue-800 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">② 予約期間</h3>
            <div className="bg-blue-50 p-8 rounded-[2.5rem] space-y-4 shadow-inner">
              <p className="text-base font-bold text-blue-900 text-center tracking-wide">3ヶ月ごとに予約を受付</p>
              <table className="w-full text-xs bg-white rounded-2xl overflow-hidden border-2 border-blue-100 shadow-xl">
                <thead className="bg-blue-600 text-white">
                  <tr><th className="p-4 border-r border-blue-500">受付開始日</th><th className="p-4 text-center">対象期間</th></tr>
                </thead>
                <tbody className="text-gray-600 font-bold">
                  <tr className="border-b"><td className="p-4 border-r text-center">12月 1日〜</td><td className="p-4 text-center">翌1月〜3月末</td></tr>
                  <tr className="border-b"><td className="p-4 border-r text-center">3月 1日〜</td><td className="p-4 text-center">4月〜6月末</td></tr>
                  <tr className="border-b"><td className="p-4 border-r text-center">6月 1日〜</td><td className="p-4 text-center">7月〜9月末</td></tr>
                  <tr><td className="p-4 border-r text-center">9月 1日〜</td><td className="p-4 text-center">10月〜12月末</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="space-y-8">
          <h3 className="font-bold flex items-center text-blue-800 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">③ 遵守事項</h3>
          <ul className="space-y-5 font-bold text-gray-700">
            {[
              { t: "受付・名簿", c: "入館時は必ずシステム上で名簿（団体・氏名）を提出してください。" },
              { t: "飲食禁止", c: "アリーナ内の食事は厳禁です。食事は2階休憩室または多目的室で。飲み物は可。" },
              { t: "清掃徹底", c: "終了後は用具を元の位置へ戻し、必ずモップ掛けを行ってください。ゴミは各自持ち帰り。" },
              { t: "駐車場", c: "正面・裏・北側以外の路上駐車は厳禁。一方通行を厳守してください。" },
              { t: "速度制限", c: "構内は時速20km制限です。騒音（カーステレオ等）にも十分配慮してください。" },
              { t: "破損報告", c: "施設・備品を破損した場合は直ちに管理人に報告してください。実費弁償の場合があります。" }
            ].map((rule, i) => (
              <li key={i} className="flex items-start bg-gray-50/80 p-5 rounded-[2rem] border-2 border-transparent hover:border-blue-100 hover:bg-white shadow-sm transition-all group">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs mr-4 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform">{i+1}</span>
                <div>
                  <p className="text-blue-900 text-xs font-bold uppercase mb-1 opacity-60 tracking-wider">{rule.t}</p>
                  <p className="leading-relaxed text-base tracking-tight text-gray-800">{rule.c}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}