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

// 管理者用パスワード
const ADMIN_PASSWORD = "admin123";

// 備品リスト（資料より抜粋）
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
      showToast('管理者モードでログインしました');
    } else {
      alert('パスワードが正しくありません');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20 text-lg">
      <header className="bg-blue-800 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-3 sm:mb-0">
            <Building className="h-10 w-10 text-blue-200" />
            <div>
              <div className="flex items-center">
                <h1 className="text-2xl font-bold tracking-wider mr-3">KAITEKI体育館 予約</h1>
                {!isAdmin ? (
                  <button onClick={() => setShowLoginModal(true)} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
                    <Lock className="h-5 w-5 text-blue-300" />
                  </button>
                ) : (
                  <button onClick={() => {setIsAdmin(false); setActiveTab('calendar');}} className="flex items-center text-xs bg-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-700 shadow">
                    <LogOut className="h-3 w-3 mr-1" />管理者解除
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-100 opacity-90">三菱ケミカル / ダイヤリックス株式会社</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-blue-900/50 p-1.5 rounded-xl overflow-x-auto w-full sm:w-auto shadow-inner">
            <TabButton icon={<Calendar />} label="状況" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabButton icon={<FileText />} label="予約" isActive={activeTab === 'reserve'} onClick={() => { setActiveTab('reserve'); setPreSelectedDate(''); }} />
            <TabButton icon={<XCircle />} label="取消" isActive={activeTab === 'cancel'} onClick={() => setActiveTab('cancel')} />
            {isAdmin && <TabButton icon={<ShieldCheck className="text-yellow-400" />} label="管理" isActive={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
            <TabButton icon={<Info />} label="ルール" isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative min-h-[600px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
            <p className="text-xl font-bold text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="w-full space-y-10">
            {activeTab === 'calendar' && <CalendarView reservations={reservations} onReserveClick={(d) => {setPreSelectedDate(d); setActiveTab('reserve');}} />}
            {activeTab === 'reserve' && <ReservationForm initialDate={preSelectedDate} reservations={reservations} user={user} onSuccess={() => {showToast('申し込みを送信しました。承認をお待ちください。'); setActiveTab('calendar');}} />}
            {activeTab === 'cancel' && <CancelView reservations={reservations} onSuccess={() => showToast('予約をキャンセルしました')} />}
            {activeTab === 'rules' && <RulesView />}
            {activeTab === 'admin' && isAdmin && <AdminDashboard reservations={reservations} onStatusUpdate={() => showToast('更新しました')} />}
          </div>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100">
            <h3 className="text-2xl font-bold mb-6 flex items-center text-blue-800"><Lock className="mr-3 h-6 w-6"/>管理者ログイン</h3>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full border-2 border-gray-200 p-4 rounded-2xl mb-6 text-center text-2xl tracking-widest focus:border-blue-500 outline-none" placeholder="パスワード" />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 text-gray-500 py-3 font-bold hover:bg-gray-100 rounded-2xl transition-colors">閉じる</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all">ログイン</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-10 duration-500 z-50">
          <CheckSquare className="h-6 w-6 text-green-400" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-800 shadow-md scale-105' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}>
      {React.cloneElement(icon, { className: 'h-5 w-5' })}
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <h2 className="text-3xl font-black text-gray-800 flex items-center"><CalendarDays className="mr-3 h-8 w-8 text-blue-600"/> 予約状況カレンダー</h2>
        <div className="flex space-x-6 text-sm bg-white px-6 py-3 rounded-2xl shadow-sm border font-bold">
          <span className="flex items-center"><span className="w-4 h-4 rounded-full bg-blue-500 mr-2 shadow-sm"></span>承認済</span>
          <span className="flex items-center"><span className="w-4 h-4 rounded-full bg-yellow-400 mr-2 shadow-sm"></span>申請中</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-8 px-4">
            <button onClick={handlePrevMonth} className="p-3 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors"><ChevronLeft className="h-6 w-6 text-blue-600"/></button>
            <span className="font-black text-3xl text-blue-900 tracking-tighter">{currentYear}年 {currentMonth}月</span>
            <button onClick={handleNextMonth} className="p-3 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors"><ChevronRight className="h-6 w-6 text-blue-600"/></button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-gray-400 text-xs font-black mb-4 uppercase tracking-widest">
            <div className="text-red-400">Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div className="text-blue-400">Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {blanks.map(b => <div key={`b-${b}`} className="p-2"></div>)}
            {days.map(d => {
              const dStr = formatDateStr(currentYear, currentMonth, d);
              const dayRes = reservations.filter(r => r.date === dStr);
              const hasApp = dayRes.some(r => r.status === 'approved');
              const hasPen = dayRes.some(r => r.status === 'pending');
              const isToday = formatDateStr(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate()) === dStr;
              return (
                <button key={d} onClick={() => setSelectedDateStr(dStr)} className={`min-h-[5rem] border-2 rounded-2xl flex flex-col items-center justify-between p-2 transition-all ${dStr === selectedDateStr ? 'border-blue-600 bg-blue-50 shadow-lg scale-105 ring-4 ring-blue-100' : 'border-gray-50 hover:border-blue-200 hover:bg-blue-50/50'} ${isToday ? 'bg-orange-50/50' : ''}`}>
                  <span className={`text-lg font-black ${dStr === selectedDateStr ? 'text-blue-800' : (isToday ? 'text-orange-600' : 'text-gray-700')}`}>{d}</span>
                  <div className="flex space-x-1.5 mb-1">
                    {hasApp && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />}
                    {hasPen && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-6 bg-blue-800 text-white font-black flex justify-between items-center text-xl">
            <span>{selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日 の詳細</span>
            <Clock className="h-6 w-6 opacity-60" />
          </div>
          <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
            {selectedDayReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDayReservations.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(res => (
                  <div key={res.id} className={`border-l-8 p-5 rounded-2xl shadow-md bg-white transition-all hover:scale-[1.02] ${res.status === 'approved' ? 'border-blue-500' : 'border-yellow-400'}`}>
                    <div className="text-lg font-black text-gray-900 mb-1 tracking-tight">{res.startTime} - {res.endTime}</div>
                    <div className="text-base font-bold text-blue-700 my-1">{res.place} {res.courts ? `(${res.courts}面)` : ''}</div>
                    <div className="text-sm font-medium text-gray-500">団体: {res.name}</div>
                    <div className={`mt-3 text-xs font-black px-3 py-1 inline-block rounded-full shadow-sm ${res.status === 'approved' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                      {res.status === 'approved' ? '予約確定済' : '承認待ち'}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-10 opacity-60">
                  <CheckSquare className="h-16 w-16" />
                  <p className="text-xl font-bold">予約はありません</p>
                </div>}
          </div>
          <div className="p-6 border-t bg-white">
            <button onClick={() => onReserveClick(selectedDateStr)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95 flex items-center justify-center">
              <Plus className="h-6 w-6 mr-2" /> この日で予約する
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
    name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', place: '', courts: '1', purpose: '' 
  });
  const [equipment, setEquipment] = useState([]);
  const [members, setMembers] = useState([{ name: '', address: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = () => setMembers([...members, { name: '', address: '' }]);
  const handleRemoveMember = (idx) => setMembers(members.filter((_, i) => i !== idx));

  const toggleEquipment = (item) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("認証エラーです。再読み込みしてください。");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations'), {
        date: selectedDate, userType, ...formData, equipment, members, status: 'pending', createdAt: new Date().toISOString(), userId: user.uid
      });
      onSuccess();
    } catch (err) { alert("保存に失敗しました。"); } finally { setIsSubmitting(false); }
  };

  const dailyRes = reservations.filter(res => res.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-10 duration-500 pb-20">
      <h2 className="text-4xl font-black flex items-center text-gray-900 tracking-tighter">
        <div className="bg-blue-600 text-white p-3 rounded-2xl mr-4 shadow-xl"><FileText className="h-8 w-8" /></div>
        施設利用申し込み
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 基本情報 */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-xl space-y-6 h-fit">
          <h3 className="font-black border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><Users className="h-6 w-6 mr-3 text-blue-500"/> ① 基本情報</h3>
          <div className="flex bg-gray-50 p-1.5 rounded-2xl">
            {['employee', 'external'].map(type => (
              <label key={type} className={`flex-1 py-4 rounded-xl text-center cursor-pointer transition-all font-black text-sm ${userType === type ? 'bg-white shadow-lg text-blue-700' : 'text-gray-400 hover:text-gray-500'}`}>
                <input type="radio" checked={userType === type} onChange={() => setUserType(type)} className="hidden" />
                <span>{type === 'employee' ? '三菱ケミカル従業員' : '一般・社外団体'}</span>
              </label>
            ))}
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">利用団体名 *</label>
              <input type="text" required placeholder="団体名（個人の場合は氏名）" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">利用責任者（代表者） *</label>
              <input type="text" required placeholder="代表者氏名" value={formData.repName} onChange={(e)=>setFormData({...formData, repName:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">メールアドレス *</label>
              <input type="email" required placeholder="email@example.com" value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">緊急連絡先 *</label>
              <input type="tel" required placeholder="090-XXXX-XXXX" value={formData.phone} onChange={(e)=>setFormData({...formData, phone:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* 日時・場所 */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-xl space-y-6">
          <h3 className="font-black border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><MapPin className="h-6 w-6 mr-3 text-blue-500"/> ② 日時・場所</h3>
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">利用日 *</label>
              <input type="date" required value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="border-2 border-gray-100 p-4 rounded-2xl w-full font-black text-2xl text-blue-900 outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">開始時間 *</label>
                <input type="time" step="600" required value={formData.startTime} onChange={(e)=>setFormData({...formData, startTime:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-center text-xl font-black outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">終了時間 *</label>
                <input type="time" step="600" required value={formData.endTime} onChange={(e)=>setFormData({...formData, endTime:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-center text-xl font-black outline-none" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 px-2 font-bold italic">※予約は10分単位で行ってください。</p>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">施設選択 *</label>
                <select required value={formData.place} onChange={(e)=>setFormData({...formData, place:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold outline-none">
                  <option value="">場所を選択</option>
                  <option value="体育館">体育館（アリーナ）</option>
                  <option value="多目的室">多目的室</option>
                </select>
              </div>

              {formData.place === '体育館' && (
                <div className="space-y-1 animate-in zoom-in duration-300">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">利用面数（最大3面まで） *</label>
                  <select required value={formData.courts} onChange={(e)=>setFormData({...formData, courts:e.target.value})} className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl w-full text-base font-black text-blue-900 outline-none">
                    <option value="1">1面を利用する</option>
                    <option value="2">2面を利用する</option>
                    <option value="3">3面を利用する</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">利用目的 *</label>
              <textarea required placeholder="例：フレッシュテニス練習" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-base font-bold h-24 outline-none transition-all" />
            </div>
            
            {selectedDate && (
              <div className="bg-orange-50 p-5 rounded-3xl border-2 border-orange-100 shadow-inner">
                <p className="text-xs font-black text-orange-800 mb-3 flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>予約済み時間帯:</p>
                {dailyRes.length > 0 ? (
                  <div className="space-y-2">
                    {dailyRes.map(r => (
                      <div key={r.id} className="text-xs flex justify-between bg-white/70 px-3 py-2 rounded-xl border border-orange-200/50 shadow-sm font-bold">
                        <span className="text-orange-900">{r.startTime}-{r.endTime}</span>
                        <span className="text-orange-700">{r.place} {r.courts ? `(${r.courts}面)` : ''}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-orange-600 font-bold mt-2">※体育館は全6面。他団体の面数に注意してください。</p>
                  </div>
                ) : <p className="text-sm text-orange-600 font-bold italic">この日はまだ空いています</p>}
              </div>
            )}
          </div>
        </div>

        {/* 備品選択 */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-xl space-y-6 lg:col-span-2">
          <h3 className="font-black border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-xl tracking-tight"><CheckSquare className="h-6 w-6 mr-3 text-blue-500"/> ③ 貸出備品（複数選択可）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-2">
            <div className="space-y-4">
              <p className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit uppercase tracking-widest">全員貸出可能</p>
              <div className="grid grid-cols-1 gap-2">
                {equipmentForAll.map(item => (
                  <label key={item} className="flex items-center space-x-3 text-sm font-bold cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                    <input type="checkbox" checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={`space-y-4 ${userType !== 'employee' ? 'opacity-30 grayscale' : ''}`}>
              <p className="text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit uppercase tracking-widest">従業員および家族のみ</p>
              <div className="grid grid-cols-1 gap-2">
                {equipmentForEmployeesOnly.map(item => (
                  <label key={item} className={`flex items-center space-x-3 text-sm font-bold ${userType !== 'employee' ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} p-2 rounded-xl transition-colors`}>
                    <input type="checkbox" disabled={userType !== 'employee'} checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
              {userType !== 'employee' && <p className="text-xs text-red-500 font-black italic">※従業員以外の方は、ラケットやボール類を持参してください。</p>}
            </div>
          </div>
        </div>

        {/* 利用者名簿 */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-xl space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center border-b-2 border-blue-50 pb-3">
            <h3 className="font-black flex items-center text-blue-900 text-xl tracking-tight"><Plus className="h-6 w-6 mr-3 text-blue-500"/> ④ 利用者名簿</h3>
            <button type="button" onClick={handleAddMember} className="bg-blue-50 text-blue-600 font-black px-5 py-2 rounded-full hover:bg-blue-100 transition-colors flex items-center shadow-sm text-sm"><Plus className="h-4 w-4 mr-1"/>行を追加</button>
          </div>
          <p className="text-xs text-gray-500 font-bold leading-relaxed px-2 italic">※必ず氏名を記入してください（見学者含む）。住所は町名まで正確に記入してください。</p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {members.map((m, idx) => (
              <div key={idx} className="flex space-x-3 animate-in slide-in-from-right-4 duration-300 items-center">
                <span className="text-xs font-black text-gray-300 w-6 text-center">{idx + 1}</span>
                <input required type="text" placeholder="氏名" value={m.name} onChange={(e) => {
                  const n = [...members]; n[idx].name = e.target.value; setMembers(n);
                }} className="bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white p-3 rounded-xl flex-1 text-sm font-bold outline-none" />
                <input required type="text" placeholder="住所（町名まで）" value={m.address} onChange={(e) => {
                  const n = [...members]; n[idx].address = e.target.value; setMembers(n);
                }} className="bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white p-3 rounded-xl flex-[2] text-sm font-bold outline-none" />
                {members.length > 1 && (
                  <button type="button" onClick={() => handleRemoveMember(idx)} className="text-red-300 hover:text-red-500 transition-colors p-2"><Trash2 className="h-6 w-6" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-10">
        <button type="submit" disabled={isSubmitting} className="w-full max-w-lg bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 flex items-center justify-center">
          {isSubmitting ? <><Loader2 className="h-8 w-8 animate-spin mr-4"/> 送信中...</> : 'この内容で予約を申し込む'}
        </button>
        <p className="text-sm text-gray-400 font-bold mt-6 px-4 text-center leading-relaxed">
          ※承認された時点で予約が確定します。後ほど「状況」タブからご確認ください。
        </p>
      </div>
    </form>
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
    if (window.confirm('この予約申請を却下し、完全に削除しますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
      onStatusUpdate();
    }
  };

  const pending = reservations.filter(r => r.status === 'pending').sort((a,b)=>a.date.localeCompare(b.date));
  const approved = reservations.filter(r => r.status === 'approved').sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-end justify-between border-b-4 border-blue-50 pb-6">
        <h2 className="text-4xl font-black flex items-center text-blue-900 tracking-tighter">
          <ShieldCheck className="mr-4 h-12 w-12 text-blue-600"/> 予約承認管理
        </h2>
        <div className="text-right">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Requests</p>
          <p className="text-4xl font-black text-blue-600 leading-none">{pending.length}</p>
        </div>
      </div>
      
      <section>
        <h3 className="font-black text-2xl text-yellow-700 mb-6 flex items-center bg-yellow-50 px-6 py-2 rounded-2xl w-fit border border-yellow-200">
          <Clock className="h-7 w-7 mr-3 animate-pulse"/> 承認待ちの申請 ({pending.length})
        </h3>
        <div className="space-y-6">
          {pending.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 text-center text-gray-300 font-black text-2xl">保留中の申請はありません</div>
          ) : pending.map(res => (
            <div key={res.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-yellow-100 shadow-xl flex flex-col md:flex-row justify-between gap-8 hover:border-yellow-400 transition-all group">
              <div className="space-y-3 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest border border-yellow-200">Pending</span>
                  <span className="font-black text-3xl text-gray-900 tracking-tighter">{res.date}</span>
                </div>
                <div className="text-2xl font-black text-blue-800 leading-none">{res.startTime} - {res.endTime}</div>
                <div className="text-lg font-black text-gray-800 py-1 border-b-2 border-blue-50 inline-block">{res.place} {res.courts ? `(${res.courts}面)` : ''}</div>
                <div className="text-base font-bold text-gray-600 pt-2">
                  <div className="flex items-center mb-1"><Building className="h-4 w-4 mr-2 text-gray-300"/>団体: <span className="text-gray-900 ml-1">{res.name}</span></div>
                  <div className="flex items-center"><Users className="h-4 w-4 mr-2 text-gray-300"/>代表: <span className="text-gray-900 ml-1">{res.repName}</span> <span className="ml-4 text-xs font-medium text-gray-400">TEL: {res.phone}</span></div>
                </div>
                <div className="text-sm bg-gray-50 p-4 rounded-2xl text-gray-600 italic mt-4 border border-gray-100 font-medium">
                  <p><strong>目的:</strong> {res.purpose}</p>
                  <p className="mt-2 text-xs"><strong>貸出備品:</strong> {res.equipment?.join(', ') || 'なし'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3 md:space-x-0 md:space-y-3">
                <button onClick={()=>deleteReservation(res.id)} className="w-full sm:w-auto md:w-32 border-2 border-red-500 text-red-500 px-6 py-3 rounded-2xl font-black text-sm hover:bg-red-50 transition-colors">却下・削除</button>
                <button onClick={()=>updateStatus(res.id, 'approved')} className="w-full sm:w-auto md:w-48 bg-green-600 text-white px-8 py-5 rounded-[2rem] font-black text-lg hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95 flex items-center justify-center">
                  <Check className="h-6 w-6 mr-2"/> 承認する
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-black text-xl text-blue-800 mb-6 border-b-2 border-blue-100 pb-2">最近の承認済み一覧 ({approved.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approved.slice(0, 12).map(res => (
            <div key={res.id} className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-md flex justify-between items-center hover:shadow-lg transition-all group">
              <div className="truncate pr-4">
                <div className="font-black text-lg text-gray-900 truncate tracking-tight">{res.date} <span className="text-blue-600 text-sm font-bold">({res.startTime})</span></div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter truncate">{res.place} | {res.name}</div>
              </div>
              <button onClick={()=>updateStatus(res.id, 'pending')} className="text-[10px] font-black text-gray-300 hover:text-red-500 transition-colors border-2 border-transparent hover:border-red-50 p-2 rounded-xl group-hover:opacity-100 opacity-0">撤回</button>
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
    if (window.confirm('本当にキャンセルしますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
      onSuccess();
      setFound(found.filter(f => f.id !== id));
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-2xl animate-in fade-in duration-500">
      <h2 className="text-3xl font-black mb-8 flex items-center text-gray-800 tracking-tighter">
        <div className="bg-red-50 text-red-500 p-3 rounded-2xl mr-4"><XCircle className="h-8 w-8" /></div>
        確認・キャンセル
      </h2>
      
      <div className="bg-yellow-50 p-6 rounded-[2rem] border-2 border-yellow-100 mb-10 text-xs font-bold text-yellow-800 leading-relaxed shadow-inner">
        <p className="text-sm font-black mb-3 flex items-center tracking-tight"><AlertTriangle className="h-5 w-5 mr-2 text-yellow-600"/> キャンセル時の注意事項</p>
        <ul className="list-disc ml-6 space-y-2">
          <li>一般団体の方は、利用日の<strong>3日前まで</strong>にシステムから手続きしてください。</li>
          <li>土日祝、平日夜間の直前キャンセルは管理人（<span className="text-red-600 underline">080-7896-2363</span>）へ直接ご連絡ください。</li>
          <li>無断キャンセルが続く場合、以後の貸出をお断りすることがあります。</li>
        </ul>
      </div>

      <form onSubmit={handleSearch} className="flex space-x-4 mb-12">
        <input required value={searchName} onChange={(e)=>setSearchName(e.target.value)} className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-5 rounded-2xl outline-none font-black text-xl placeholder-gray-300 transition-all" placeholder="代表者氏名を入力" />
        <button className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl active:scale-95">検索</button>
      </form>
      
      {found && (
        <div className="space-y-6">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border-b-2 border-gray-50 pb-2">Results</p>
          {found.length === 0 ? (
            <p className="text-center text-gray-400 font-bold italic py-16 text-lg">該当する予約は見つかりませんでした</p>
          ) : found.map(res => (
            <div key={res.id} className="border-2 border-gray-50 bg-white p-6 rounded-3xl flex justify-between items-center hover:border-red-100 hover:shadow-xl transition-all group">
              <div>
                <div className="font-black text-2xl text-gray-900 tracking-tighter mb-1">{res.date} <span className="text-blue-600 text-base ml-2">({res.startTime})</span></div>
                <div className="text-xs font-black text-gray-400 uppercase tracking-tighter">{res.place} {res.courts ? `(${res.courts}面)` : ''} | {res.status === 'approved' ? '確定済' : '承認待ち'}</div>
              </div>
              <button onClick={()=>handleCancel(res.id)} className="text-red-500 font-black text-sm border-2 border-red-500 px-8 py-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                予約取消
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
    <div className="max-w-4xl mx-auto bg-white p-10 sm:p-16 rounded-[4rem] border-2 border-gray-50 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <h2 className="text-4xl font-black mb-12 border-b-8 border-blue-500 pb-6 text-blue-900 flex justify-between items-center tracking-tighter">
        体育館 貸出運用ルール
        <Info className="h-10 w-10 text-blue-100" />
      </h2>
      
      <div className="grid md:grid-cols-2 gap-16">
        <div className="space-y-10">
          <section>
            <h3 className="font-black flex items-center text-blue-700 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">① 利用時間・休館日</h3>
            <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-8 text-sm font-black leading-loose shadow-inner border border-white">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Time Schedule</p>
                <div className="flex justify-between items-center text-lg mb-2"><span>平日</span><span className="bg-gray-900 text-white px-4 py-1 rounded-xl">8:30 - 21:00</span></div>
                <div className="flex justify-between items-center text-lg"><span>休日</span><span className="bg-gray-900 text-white px-4 py-1 rounded-xl">8:30 - 17:00</span></div>
                <p className="text-[10px] text-gray-400 mt-4 font-bold italic">※平日20:30、休日16:30 最終受付</p>
              </div>
              <div>
                <p className="text-xs text-red-400 uppercase tracking-widest mb-3">Closed Days</p>
                <p className="text-2xl text-red-600 font-black tracking-tighter">毎月 第１・第３日曜日</p>
                <p className="text-[11px] text-gray-400 mt-3 font-bold leading-relaxed">※お盆、正月、GW等は会社カレンダー準拠。<br/>※予約がない場合は休館にすることがあります。</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-black flex items-center text-blue-700 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">② 予約期間</h3>
            <div className="bg-blue-50 p-8 rounded-[2.5rem] space-y-4 shadow-inner">
              <p className="text-sm font-black text-blue-800 text-center uppercase tracking-widest">3ヶ月スパンの予約受付</p>
              <table className="w-full text-xs bg-white rounded-2xl overflow-hidden border-2 border-blue-100 shadow-xl">
                <thead className="bg-blue-600 text-white">
                  <tr><th className="p-4 border-r border-blue-500">受付開始日</th><th className="p-4">予約可能対象月</th></tr>
                </thead>
                <tbody className="text-gray-600 font-black">
                  <tr className="border-b"><td className="p-4 border-r text-center bg-gray-50/50">12月 1日〜</td><td className="p-4 text-center">翌年 1月〜 3月末</td></tr>
                  <tr className="border-b"><td className="p-4 border-r text-center bg-gray-50/50">3月 1日〜</td><td className="p-4 text-center">4月〜 6月末</td></tr>
                  <tr className="border-b"><td className="p-4 border-r text-center bg-gray-50/50">6月 1日〜</td><td className="p-4 text-center">7月〜 9月末</td></tr>
                  <tr><td className="p-4 border-r text-center bg-gray-50/50">9月 1日〜</td><td className="p-4 text-center">10月〜 12月末</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="space-y-8">
          <h3 className="font-black flex items-center text-blue-700 text-2xl mb-6 border-l-8 border-blue-700 pl-4 tracking-tight">③ 利用時の遵守事項</h3>
          <ul className="space-y-5 font-black text-gray-700">
            {[
              { t: "受付・名簿", c: "ご利用時は必ずシステム上で名簿（団体名、所属、氏名等）を提出してください。" },
              { t: "飲食", c: "館内は飲み物可。食事は2階休憩室・多目的室のみ。アリーナ内は食事禁止です。" },
              { t: "清掃・整理", c: "終了後は用具を戻し、モップ掛けを行ってください。ゴミは各自持ち帰り。" },
              { t: "駐車場", c: "駐車場は正面・裏・北側にあります。路上駐車は厳禁。路面表示に従ってください。" },
              { t: "速度制限", c: "構内は時速20km制限です。騒音（カーステレオ等）にも注意してください。" },
              { t: "破損報告", c: "施設・器具を破損した場合は管理人に報告してください。実費弁償の場合があります。" }
            ].map((rule, i) => (
              <li key={i} className="flex items-start bg-gray-50/50 p-5 rounded-[2rem] border-2 border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl transition-all group">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs mr-4 mt-1 flex-shrink-0 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">{i+1}</span>
                <div>
                  <p className="text-blue-800 text-xs font-black uppercase mb-1 tracking-widest">{rule.t}</p>
                  <p className="leading-relaxed text-base">{rule.c}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}