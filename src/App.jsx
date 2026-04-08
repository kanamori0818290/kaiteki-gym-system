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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <Building className="h-7 w-7 text-blue-200" />
            <div>
              <div className="flex items-center">
                <h1 className="text-lg font-bold tracking-wider mr-2">KAITEKI体育館 予約システム</h1>
                {!isAdmin ? (
                  <button onClick={() => setShowLoginModal(true)} className="p-1 hover:bg-blue-700 rounded transition-colors">
                    <Lock className="h-4 w-4 text-blue-300" />
                  </button>
                ) : (
                  <button onClick={() => {setIsAdmin(false); setActiveTab('calendar');}} className="flex items-center text-[10px] bg-red-600 px-2 py-0.5 rounded ml-1 hover:bg-red-700 transition-colors">
                    <LogOut className="h-3 w-3 mr-1" />管理者解除
                  </button>
                )}
              </div>
              <p className="text-[10px] text-blue-200 opacity-80">三菱ケミカル株式会社 / ダイヤリックス株式会社</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-blue-900/50 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            <TabButton icon={<Calendar />} label="予約状況" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabButton icon={<FileText />} label="新規予約" isActive={activeTab === 'reserve'} onClick={() => { setActiveTab('reserve'); setPreSelectedDate(''); }} />
            <TabButton icon={<XCircle />} label="確認・取消" isActive={activeTab === 'cancel'} onClick={() => setActiveTab('cancel')} />
            {isAdmin && <TabButton icon={<ShieldCheck className="text-yellow-400" />} label="承認管理" isActive={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
            <TabButton icon={<Info />} label="利用ルール" isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'calendar' && <CalendarView reservations={reservations} onReserveClick={(d) => {setPreSelectedDate(d); setActiveTab('reserve');}} />}
            {activeTab === 'reserve' && <ReservationForm initialDate={preSelectedDate} reservations={reservations} user={user} onSuccess={() => {showToast('申し込みを送信しました。承認をお待ちください。'); setActiveTab('calendar');}} />}
            {activeTab === 'cancel' && <CancelView reservations={reservations} onSuccess={() => showToast('予約をキャンセルしました')} />}
            {activeTab === 'rules' && <RulesView />}
            {activeTab === 'admin' && isAdmin && <AdminDashboard reservations={reservations} onStatusUpdate={() => showToast('更新しました')} />}
          </div>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center"><Lock className="mr-2 h-5 w-5 text-blue-600"/>管理者ログイン</h3>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full border p-2 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500" placeholder="パスワードを入力" />
              <div className="flex space-x-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 border p-2 rounded hover:bg-gray-50 transition-colors">キャンセル</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 transition-colors">ログイン</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-bounce z-50">
          <CheckSquare className="h-5 w-5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${isActive ? 'bg-white text-blue-800 shadow-sm' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-blue-600"/> 予約状況</h2>
        <div className="flex space-x-4 text-xs bg-white px-4 py-2 rounded-lg shadow-sm border">
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>承認済</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>申請中</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-2 border rounded hover:bg-gray-50"><ChevronLeft className="h-5 w-5"/></button>
            <span className="font-bold text-xl">{currentYear}年 {currentMonth}月</span>
            <button onClick={handleNextMonth} className="p-2 border rounded hover:bg-gray-50"><ChevronRight className="h-5 w-5"/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-gray-400 text-[10px] font-bold mb-2">
            <div className="text-red-400">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-400">土</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => <div key={`b-${b}`} className="p-2"></div>)}
            {days.map(d => {
              const dStr = formatDateStr(currentYear, currentMonth, d);
              const dayRes = reservations.filter(r => r.date === dStr);
              const hasApp = dayRes.some(r => r.status === 'approved');
              const hasPen = dayRes.some(r => r.status === 'pending');
              return (
                <button key={d} onClick={() => setSelectedDateStr(dStr)} className={`min-h-[3.5rem] border rounded-lg flex flex-col items-center justify-between p-1 transition-all ${dStr === selectedDateStr ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <span className="text-xs font-bold">{d}</span>
                  <div className="flex space-x-1 mb-1">
                    {hasApp && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                    {hasPen && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full min-h-[400px]">
          <div className="p-4 bg-blue-800 text-white font-bold flex justify-between items-center text-sm">
            <span>{selectedDateStr} の詳細</span>
            <Clock className="h-4 w-4 opacity-70" />
          </div>
          <div className="p-4 flex-1 overflow-y-auto bg-gray-50/50">
            {selectedDayReservations.length > 0 ? (
              <div className="space-y-3">
                {selectedDayReservations.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(res => (
                  <div key={res.id} className={`border-l-4 p-3 rounded shadow-sm bg-white ${res.status === 'approved' ? 'border-blue-500' : 'border-yellow-400'}`}>
                    <div className="text-xs font-bold text-gray-800">{res.startTime}-{res.endTime}</div>
                    <div className="text-xs font-medium text-blue-700 my-1">{res.place}</div>
                    <div className="text-[10px] text-gray-600">団体: {res.name}</div>
                    <div className={`mt-2 text-[9px] font-bold px-2 py-0.5 inline-block rounded ${res.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {res.status === 'approved' ? '予約済' : '承認待ち'}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-gray-400 text-sm mt-10 italic">この日は空いています</p>}
          </div>
          <div className="p-4 border-t bg-white">
            <button onClick={() => onReserveClick(selectedDateStr)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">この日で新規予約</button>
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
  const [formData, setFormData] = useState({ name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', place: '', purpose: '' });
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
    if (!user) return alert("認証エラーです");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations'), {
        date: selectedDate, userType, ...formData, equipment, members, status: 'pending', createdAt: new Date().toISOString(), userId: user.uid
      });
      onSuccess();
    } catch (err) { alert("保存に失敗しました"); } finally { setIsSubmitting(false); }
  };

  const dailyRes = reservations.filter(res => res.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <h2 className="text-2xl font-bold flex items-center"><FileText className="mr-2 text-blue-600"/>施設利用申し込み</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本情報 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 h-fit">
          <h3 className="font-bold border-b pb-2 flex items-center text-gray-700 text-sm"><Users className="h-4 w-4 mr-2"/> ① 基本情報</h3>
          <div className="flex space-x-2">
            {['employee', 'external'].map(type => (
              <label key={type} className={`flex-1 border p-3 rounded-lg text-center cursor-pointer transition-all ${userType === type ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-100' : 'hover:bg-gray-50 text-gray-400'}`}>
                <input type="radio" checked={userType === type} onChange={() => setUserType(type)} className="hidden" />
                <span className="text-xs">{type === 'employee' ? '三菱ケミカル従業員' : '一般（社外団体）'}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <input type="text" required placeholder="利用団体名 *" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="border p-2 rounded-lg w-full text-sm" />
            <input type="text" required placeholder="利用責任者（代表者） *" value={formData.repName} onChange={(e)=>setFormData({...formData, repName:e.target.value})} className="border p-2 rounded-lg w-full text-sm" />
            <input type="email" required placeholder="連絡先メールアドレス *" value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})} className="border p-2 rounded-lg w-full text-sm" />
            <input type="tel" required placeholder="緊急連絡先（電話番号） *" value={formData.phone} onChange={(e)=>setFormData({...formData, phone:e.target.value})} className="border p-2 rounded-lg w-full text-sm" />
          </div>
        </div>

        {/* 日時・場所 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold border-b pb-2 flex items-center text-gray-700 text-sm"><MapPin className="h-4 w-4 mr-2"/> ② 利用日時・場所</h3>
          <input type="date" required value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="border p-2 rounded-lg w-full font-bold" />
          <div className="flex items-center space-x-2">
            <input type="time" required value={formData.startTime} onChange={(e)=>setFormData({...formData, startTime:e.target.value})} className="border p-2 rounded-lg flex-1 text-center" />
            <span className="text-gray-400">〜</span>
            <input type="time" required value={formData.endTime} onChange={(e)=>setFormData({...formData, endTime:e.target.value})} className="border p-2 rounded-lg flex-1 text-center" />
          </div>
          <select required value={formData.place} onChange={(e)=>setFormData({...formData, place:e.target.value})} className="w-full border p-2 rounded-lg text-sm font-medium">
            <option value="">利用場所を選択してください *</option>
            {['体育館（1面）', '体育館（2面）', '体育館（全面）', '多目的室'].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <textarea required placeholder="利用目的（例：フレッシュテニス練習） *" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose:e.target.value})} className="w-full border p-2 rounded-lg text-sm h-20" />
          
          {selectedDate && (
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
              <p className="text-[10px] font-bold text-orange-800 mb-2 uppercase flex items-center"><AlertTriangle className="h-3 w-3 mr-1"/>現在の予約済み状況:</p>
              {dailyRes.length > 0 ? (
                <div className="space-y-1">
                  {dailyRes.map(r => (
                    <div key={r.id} className="text-[10px] flex justify-between bg-white/60 px-2 py-1 rounded border border-orange-200/50">
                      <span className="font-bold">{r.startTime}-{r.endTime}</span>
                      <span>{r.place}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[10px] text-orange-600 italic">空き枠です</p>}
            </div>
          )}
        </div>

        {/* 備品選択 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 lg:col-span-2">
          <h3 className="font-bold border-b pb-2 flex items-center text-gray-700 text-sm"><CheckSquare className="h-4 w-4 mr-2"/> ③ 貸出備品（複数選択可）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-blue-800 mb-2 underline decoration-blue-200">全員貸出可能</p>
              <div className="space-y-2">
                {equipmentForAll.map(item => (
                  <label key={item} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                    <input type="checkbox" checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="rounded text-blue-600" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={userType !== 'employee' ? 'opacity-40 grayscale' : ''}>
              <p className="text-[10px] font-bold text-red-800 mb-2 underline decoration-red-200">従業員およびその家族のみ貸出可能</p>
              <div className="space-y-2">
                {equipmentForEmployeesOnly.map(item => (
                  <label key={item} className={`flex items-center space-x-2 text-xs ${userType !== 'employee' ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} p-1 rounded transition-colors`}>
                    <input type="checkbox" disabled={userType !== 'employee'} checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="rounded text-red-600" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              {userType !== 'employee' && <p className="text-[10px] text-red-500 font-bold mt-2">※従業員以外の方は、これらの用品は各自持参してください。</p>}
            </div>
          </div>
        </div>

        {/* 利用者名簿 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold flex items-center text-gray-700 text-sm"><Plus className="h-4 w-4 mr-2"/> ④ 利用者名簿</h3>
            <button type="button" onClick={handleAddMember} className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-full hover:bg-blue-100 transition-colors flex items-center"><Plus className="h-3 w-3 mr-1"/>行を追加</button>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed italic">※体育館ご利用時は必ず提出願います（見学者含む）。住所は町名まで正確に記入してください。</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {members.map((m, idx) => (
              <div key={idx} className="flex space-x-2 animate-in slide-in-from-right-2 duration-300">
                <span className="text-[10px] font-bold text-gray-300 w-4 flex items-center justify-center">{idx + 1}</span>
                <input required type="text" placeholder="氏名" value={m.name} onChange={(e) => {
                  const n = [...members]; n[idx].name = e.target.value; setMembers(n);
                }} className="border p-2 rounded-lg flex-1 text-sm" />
                <input required type="text" placeholder="住所（町名まで）" value={m.address} onChange={(e) => {
                  const n = [...members]; n[idx].address = e.target.value; setMembers(n);
                }} className="border p-2 rounded-lg flex-[2] text-sm" />
                {members.length > 1 && (
                  <button type="button" onClick={() => handleRemoveMember(idx)} className="text-red-300 hover:text-red-500 transition-colors p-2"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 flex items-center justify-center">
        {isSubmitting ? <><Loader2 className="animate-spin mr-3"/> 送信中...</> : 'この内容で予約を申し込む'}
      </button>
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold flex items-center text-blue-800"><ShieldCheck className="mr-2 h-8 w-8"/> 予約承認管理（管理者専用）</h2>
      
      <section>
        <h3 className="font-bold mb-4 text-yellow-700 border-b-2 border-yellow-200 pb-2 flex items-center"><Clock className="h-5 w-5 mr-2"/> 承認待ちの申請 ({pending.length})</h3>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed text-center text-gray-400 italic">新しい申請はありません</div>
          ) : pending.map(res => (
            <div key={res.id} className="bg-white p-6 rounded-2xl border border-yellow-200 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Pending</span>
                  <span className="font-bold text-xl">{res.date} <span className="text-blue-600 text-sm ml-1 font-black">({res.startTime}-{res.endTime})</span></span>
                </div>
                <div className="text-sm font-black text-gray-800 underline decoration-blue-200">{res.place} | 団体: {res.name}</div>
                <div className="text-xs text-gray-600">代表: {res.repName} (TEL: {res.phone})</div>
                <div className="text-[11px] bg-gray-50 p-3 rounded-lg text-gray-500 italic mt-2">
                  <p><strong>目的:</strong> {res.purpose}</p>
                  <p className="mt-1"><strong>備品:</strong> {res.equipment?.join(', ') || 'なし'}</p>
                  <p className="mt-1"><strong>名簿:</strong> {res.members?.map(m => m.name).join(', ')} ({res.members?.length}名)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={()=>deleteReservation(res.id)} className="flex-1 md:flex-none border border-red-500 text-red-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors">却下・削除</button>
                <button onClick={()=>updateStatus(res.id, 'approved')} className="flex-1 md:flex-none bg-green-600 text-white px-10 py-2 rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg transition-transform active:scale-95 flex items-center justify-center">
                  <Check className="h-5 w-5 mr-1"/>承認する
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-bold mb-4 text-blue-800 border-b-2 border-blue-100 pb-2">承認済み予約一覧 ({approved.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approved.map(res => (
            <div key={res.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
              <div className="truncate pr-2">
                <div className="font-bold text-sm truncate">{res.date} <span className="text-blue-500 font-medium ml-1">({res.startTime})</span></div>
                <div className="text-[10px] text-gray-500 truncate">{res.place} | {res.name}</div>
              </div>
              <button onClick={()=>updateStatus(res.id, 'pending')} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors underline opacity-0 group-hover:opacity-100">未承認に戻す</button>
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
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2rem] border shadow-xl shadow-gray-200/50 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800"><XCircle className="mr-2 text-red-500"/> 予約の確認・キャンセル</h2>
      
      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-8 text-[11px] text-yellow-800 leading-relaxed">
        <p className="font-bold mb-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> キャンセル時の注意事項</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>従業員以外の方は、利用日の<strong>3日前まで</strong>にキャンセル手続きをお願いします。</li>
          <li>土日祝、平日夜間のキャンセルは体育館管理人（080-7896-2363）へ連絡してください。</li>
          <li>キャンセルが続く場合は、以後の貸し出しをお断りすることがあります。</li>
        </ul>
      </div>

      <form onSubmit={handleSearch} className="flex space-x-3 mb-10">
        <input required value={searchName} onChange={(e)=>setSearchName(e.target.value)} className="flex-1 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="代表者氏名を入力" />
        <button className="bg-gray-800 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-colors shadow-lg active:scale-95">検索</button>
      </form>
      
      {found && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-gray-400 border-b pb-1 uppercase tracking-widest">検索結果</p>
          {found.length === 0 ? (
            <p className="text-center text-gray-400 italic py-10">該当する予約は見つかりませんでした</p>
          ) : found.map(res => (
            <div key={res.id} className="border-2 border-gray-50 p-5 rounded-2xl flex justify-between items-center hover:bg-gray-50 transition-all group">
              <div>
                <div className="font-bold text-gray-800">{res.date} <span className="text-blue-600 ml-1">({res.startTime}-{res.endTime})</span></div>
                <div className="text-xs text-gray-500 font-medium">{res.place} | {res.status === 'approved' ? '予約確定済' : '承認待ち'}</div>
              </div>
              <button onClick={()=>handleCancel(res.id)} className="text-red-500 font-black text-xs border-2 border-red-500 px-5 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
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
    <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-[2.5rem] border shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <h2 className="text-3xl font-black mb-10 border-b-4 border-blue-500 pb-4 text-blue-900">KAITEKI体育館 貸出運用ルール</h2>
      
      <div className="grid md:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div>
            <h3 className="font-bold flex items-center text-blue-700 text-lg mb-3 border-l-4 border-blue-700 pl-3">① 利用時間・休館日</h3>
            <div className="bg-gray-50 p-4 rounded-2xl space-y-4 text-xs font-medium leading-relaxed">
              <div>
                <p className="font-black text-gray-700 border-b pb-1 mb-2 tracking-tighter">【開館時間帯】</p>
                <p>平日　８：３０～２１：００（２０：３０最終受付）</p>
                <p>休日　８：３０～１７：００（１６：３０最終受付）</p>
              </div>
              <div>
                <p className="font-black text-gray-700 border-b pb-1 mb-2 tracking-tighter">【休館日】</p>
                <p className="text-red-600 font-bold">毎月 第１・第３日曜日</p>
                <p className="text-[10px] text-gray-400 mt-2">※お盆、正月、GWなどは会社カレンダーに準じます。</p>
                <p className="text-[10px] text-gray-400">※会社都合で急遽休館（予約キャンセル）となる場合があります。</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold flex items-center text-blue-700 text-lg mb-3 border-l-4 border-blue-700 pl-3">② 申込・予約期間</h3>
            <div className="bg-blue-50 p-4 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-blue-800 text-center">３か月ごとに予約を受付</p>
              <table className="w-full text-[10px] bg-white rounded-lg overflow-hidden border border-blue-100">
                <thead className="bg-blue-600 text-white">
                  <tr><th className="p-2 border-r border-blue-500">受付開始日</th><th className="p-2">予約可能対象月</th></tr>
                </thead>
                <tbody className="text-gray-600 font-bold">
                  <tr className="border-b"><td className="p-2 border-r text-center">12月 1日〜</td><td className="p-2">翌年 1月〜 3月末</td></tr>
                  <tr className="border-b"><td className="p-2 border-r text-center">3月 1日〜</td><td className="p-2">4月〜 6月末</td></tr>
                  <tr className="border-b"><td className="p-2 border-r text-center">6月 1日〜</td><td className="p-2">7月〜 9月末</td></tr>
                  <tr><td className="p-2 border-r text-center">9月 1日〜</td><td className="p-2">10月〜 12月末</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="font-bold flex items-center text-blue-700 text-lg border-l-4 border-blue-700 pl-3">③ 利用時の遵守事項</h3>
          <ul className="text-xs space-y-4 font-bold text-gray-600">
            {[
              { t: "受付・名簿", c: "ご利用時は必ずシステム上で名簿（団体名、所属、氏名等）を提出してください。" },
              { t: "飲食", c: "館内は飲み物可。食事は指定場所（2階休憩スペース、多目的室）のみ可とし、アリーナ内での食事は禁止です。" },
              { t: "清掃・整理", c: "終了後は用具を元の場所に戻し、モップ掛けを行ってください。ゴミは各自必ず持ち帰り願います。" },
              { t: "駐車場", c: "駐車場は正面・裏・北側にあります。路上駐車は厳禁。駐車場内は一方通行を守ってください。" },
              { t: "速度制限", c: "構内は時速20km制限です。騒音（カーステレオ等）にもご注意ください。" },
              { t: "破損報告", c: "施設・器具を破損した場合は速やかに管理人に報告してください。実費弁償を求める場合があります。" }
            ].map((rule, i) => (
              <li key={i} className="flex items-start bg-gray-50/50 p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-white transition-all shadow-sm">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] mr-3 mt-0.5 flex-shrink-0 shadow-lg shadow-blue-100">{i+1}</span>
                <div>
                  <p className="text-blue-800 text-[10px] font-black uppercase mb-1">{rule.t}</p>
                  <p className="leading-relaxed text-gray-500 font-medium">{rule.c}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}