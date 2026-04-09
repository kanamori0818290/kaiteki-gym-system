import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, FileText, CheckSquare, Info, XCircle, Plus, Trash2, Users, Building, MapPin, Clock, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Loader2, Lock, LogOut, Check, X, ShieldCheck, Download, Printer, KeyRound, Search, RefreshCw, Ban, Mail, Key, UserCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, writeBatch } from 'firebase/firestore';

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

// --- セキュリティ用パスワード設定 ---
const PORTAL_PASSWORD = "kaiteki-user";
const ADMIN_PASSWORD = "admin123";

// 管理用CCメールアドレス
const ADMIN_CC_EMAIL = "MCJP-DG-RIX_TOYAMA_TAIIKUKAN@mchcgr.com";

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
const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();

const isTimeOverlapping = (start1, end1, start2, end2) => {
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 < end2 && start2 < end1;
};

// --- メインコンポーネント ---
export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [toastMessage, setToastMessage] = useState(null);
  const [preSelectedDate, setPreSelectedDate] = useState('');
  
  const [isPortalAuthorized, setIsPortalAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [closedDays, setClosedDays] = useState([]); // 休館日データ
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
    const unsubRes = onSnapshot(resRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservations(data);
      setIsLoading(false);
    }, (err) => { 
      console.error("Firestore Error:", err); 
      setIsLoading(false); 
    });

    const closedRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'closed_days');
    const unsubClosed = onSnapshot(closedRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClosedDays(data);
    });

    return () => {
      unsubRes();
      unsubClosed();
    };
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

  const handlePortalLogin = (e) => {
    e.preventDefault();
    const input = e.target.portalPass.value;
    if (input === PORTAL_PASSWORD) {
      setIsPortalAuthorized(true);
    } else {
      alert("パスワードが正しくありません。");
    }
  };

  if (!isPortalAuthorized) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center space-y-8 animate-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="bg-blue-100 p-4 rounded-3xl text-blue-700">
              <KeyRound className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-blue-950">KAITEKI体育館</h1>
            <p className="text-gray-500 font-bold">予約システム アクセス認証</p>
          </div>
          <form onSubmit={handlePortalLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block text-left px-4">利用パスワード</label>
              <input 
                name="portalPass"
                type="password" 
                required 
                autoFocus
                className="w-full bg-gray-50 border-4 border-transparent focus:border-blue-500 focus:bg-white p-5 rounded-[2rem] text-center text-2xl tracking-[0.3em] outline-none transition-all shadow-inner" 
                placeholder="••••••" 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-xl transition-all active:scale-95">
              システムに入る
            </button>
          </form>
          <div className="pt-4">
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold italic">
              ※このシステムは三菱ケミカル・ダイヤリックス関係者専用です。<br/>パスワードが不明な場合は各担当者へご確認ください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .print-only { display: block !important; }
          @page { size: A3 landscape; margin: 10mm; }
        }
        .print-only { display: none; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40 no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <Building className="h-8 w-8 text-blue-200" />
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-bold tracking-tight mr-2 font-bold">KAITEKI体育館</h1>
                {!isAdmin ? (
                  <button onClick={() => setShowLoginModal(true)} className="p-1.5 hover:bg-blue-700 rounded-full transition-colors border border-blue-400/30">
                    <Lock className="h-4 w-4 text-blue-300" />
                  </button>
                ) : (
                  <button onClick={() => {setIsAdmin(false); setActiveTab('calendar');}} className="flex items-center text-[10px] bg-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-700 shadow">
                    <LogOut className="h-3 w-3 mr-1" />解除
                  </button>
                )}
              </div>
              <p className="text-[10px] text-blue-200 opacity-80 font-bold">三菱ケミカル / ダイヤリックス株式会社</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-blue-900/50 p-1 rounded-lg overflow-x-auto w-full sm:w-auto shadow-inner">
            <TabButton icon={<Calendar />} label="状況" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabButton icon={<FileText />} label="予約" isActive={activeTab === 'reserve'} onClick={() => { setActiveTab('reserve'); setPreSelectedDate(''); }} />
            <TabButton icon={<XCircle />} label="取消" isActive={activeTab === 'cancel'} onClick={() => setActiveTab('cancel')} />
            {isAdmin && <TabButton icon={<ShieldCheck className="text-yellow-400" />} label="管理" isActive={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
            <TabButton icon={<Info />} label="規約" isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10 py-20">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-base font-bold text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="w-full space-y-8">
            {activeTab === 'calendar' && (
              <CalendarView 
                reservations={reservations} 
                closedDays={closedDays}
                onReserveClick={(d) => {setPreSelectedDate(d); setActiveTab('reserve');}} 
              />
            )}
            {activeTab === 'reserve' && (
              <ReservationForm 
                initialDate={preSelectedDate} 
                reservations={reservations} 
                closedDays={closedDays}
                user={user} 
                onSuccess={(msg) => {showToast(msg || '予約が完了しました。'); setActiveTab('calendar');}} 
              />
            )}
            {activeTab === 'cancel' && <CancelView reservations={reservations} onSuccess={() => { showToast('予約をキャンセルしました'); setActiveTab('calendar'); }} />}
            {activeTab === 'rules' && <RulesView />}
            {activeTab === 'admin' && isAdmin && <AdminDashboard reservations={reservations} closedDays={closedDays} onStatusUpdate={() => showToast('更新しました')} />}
          </div>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm no-print">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center text-blue-800"><Lock className="mr-3 h-6 w-6"/>管理者ログイン</h3>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full border-2 border-gray-100 p-3 rounded-xl mb-6 text-center text-lg tracking-widest focus:border-blue-500 outline-none transition-all shadow-inner" placeholder="パスワード" />
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 text-gray-500 py-2 font-bold hover:bg-gray-100 rounded-xl transition-colors">閉じる</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">ログイン</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-10 z-50 no-print">
          <CheckSquare className="h-5 w-5 text-green-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-900 shadow-md' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}>
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      <span>{label}</span>
    </button>
  );
}

// 1. カレンダービュー
function CalendarView({ reservations, closedDays, onReserveClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateStr(new Date()));
  
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const selectedDayReservations = reservations.filter(res => res.date === selectedDateStr);
  const isSelectedDateClosed = closedDays.some(cd => cd.date === selectedDateStr);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center tracking-tight"><CalendarDays className="mr-2 h-7 w-7 text-blue-600"/> 予約状況カレンダー</h2>
        <div className="flex space-x-4 text-xs bg-white px-4 py-2 rounded-xl shadow-sm border font-bold">
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5 shadow-sm border border-white"></span>予約確定済</span>
          <span className="flex items-center text-red-500"><Ban className="w-3 h-3 mr-1" />休館日</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handlePrevMonth} className="p-2 border rounded-xl hover:bg-gray-50 transition-colors"><ChevronLeft className="h-5 w-5 text-blue-600"/></button>
            <span className="font-bold text-xl text-blue-950">{currentYear}年 {currentMonth}月</span>
            <button onClick={handleNextMonth} className="p-2 border rounded-xl hover:bg-gray-50 transition-colors"><ChevronRight className="h-5 w-5 text-blue-600"/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-gray-400 text-[10px] font-bold mb-3 uppercase tracking-widest">
            <div className="text-red-400">Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div className="text-blue-400">Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {blanks.map(b => <div key={`b-${b}`} className="p-2"></div>)}
            {days.map(d => {
              const dStr = formatDateStr(new Date(currentYear, currentMonth - 1, d));
              const dayRes = reservations.filter(r => r.date === dStr);
              const isClosed = closedDays.some(cd => cd.date === dStr);
              const hasApp = dayRes.length > 0;
              const isToday = formatDateStr(new Date()) === dStr;
              
              return (
                <button 
                  key={d} 
                  onClick={() => setSelectedDateStr(dStr)} 
                  className={`min-h-[4.5rem] border-2 rounded-xl flex flex-col items-center justify-between p-2 transition-all 
                    ${dStr === selectedDateStr ? 'border-blue-600 bg-blue-50 shadow ring-2 ring-blue-100' : 'border-gray-50 hover:border-blue-200 hover:bg-blue-50/50'} 
                    ${isToday ? 'bg-orange-50/50' : ''}
                    ${isClosed ? 'bg-red-50/30 border-red-100' : ''}
                  `}
                >
                  <span className={`text-base font-bold ${isClosed ? 'text-red-500' : dStr === selectedDateStr ? 'text-blue-900' : (isToday ? 'text-orange-600' : 'text-gray-700')}`}>{d}</span>
                  <div className="flex flex-col items-center space-y-0.5">
                    {isClosed && <span className="text-[8px] font-black text-red-500 tracking-tighter">休館</span>}
                    <div className="flex space-x-1 mb-1">
                      {hasApp && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm border border-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-5 bg-blue-800 text-white font-bold flex justify-between items-center text-sm border-b-4 border-blue-900">
            <span>{selectedDateStr.split('-')[1] || ''}月{selectedDateStr.split('-')[2] || ''}日 の詳細</span>
            <Clock className="h-5 w-5 opacity-60" />
          </div>
          <div className="p-5 flex-1 overflow-y-auto bg-gray-50/50 space-y-4">
            {isSelectedDateClosed && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-xl flex items-start space-x-3 text-red-700 animate-in slide-in-from-top-2">
                <Ban className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-black text-sm uppercase tracking-widest">休館日</p>
                  <p className="text-xs font-bold leading-relaxed">{closedDays.find(cd => cd.date === selectedDateStr)?.reason || 'この日は施設をご利用いただけません。'}</p>
                </div>
              </div>
            )}
            
            {selectedDayReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDayReservations.sort((a,b)=>(a.startTime || "").localeCompare(b.startTime || "")).map(res => (
                  <div key={res.id} className="border-l-8 border-blue-500 p-4 rounded-xl shadow bg-white transition-all hover:scale-[1.02]">
                    <div className="text-base font-bold text-gray-900 mb-1 tracking-tight">{res.startTime || '--:--'} - {res.endTime || '--:--'}</div>
                    <div className="text-xs font-bold text-blue-700 my-1 bg-blue-50 px-2 py-0.5 rounded inline-block">
                      {res.place} {res.courts ? `(${Array.isArray(res.courts) ? res.courts.join('') : res.courts})` : ''}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 border-t pt-2 mt-2 truncate">団体: <span className="text-gray-700">{res.name}</span></div>
                    <div className="mt-2 text-[9px] font-black px-3 py-0.5 inline-block rounded-full shadow-sm uppercase bg-blue-600 text-white">
                      予約確定済
                    </div>
                  </div>
                ))}
              </div>
            ) : !isSelectedDateClosed && <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 py-10 opacity-50 grayscale">
                  <CheckSquare className="h-12 w-12" />
                  <p className="text-sm font-bold">予約はありません</p>
                </div>}
          </div>
          <div className="p-5 border-t bg-white">
            <button 
              disabled={isSelectedDateClosed}
              onClick={() => onReserveClick(selectedDateStr)} 
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 flex items-center justify-center shadow-lg 
                ${isSelectedDateClosed ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}
              `}
            >
              <Plus className="h-5 w-5 mr-2" /> {isSelectedDateClosed ? '予約不可（休館日）' : 'この日で予約'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. 予約フォーム
function ReservationForm({ initialDate, reservations, closedDays, user, onSuccess }) {
  const [userType, setUserType] = useState('external');
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [formData, setFormData] = useState({ 
    name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', purpose: '', deletePass: '', userCount: ''
  });
  const [selectedFacilities, setSelectedFacilities] = useState(['体育館']);
  const [selectedCourts, setSelectedCourts] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState('');

  const closedDateStrs = useMemo(() => closedDays.map(cd => cd.date), [closedDays]);
  const isSelectedDateClosed = closedDateStrs.includes(selectedDate);

  const targetDates = useMemo(() => {
    if (!selectedDate) return [];
    let dates = [selectedDate];
    if (isRecurring && recurringEndDate) {
      let current = new Date(selectedDate);
      const end = new Date(recurringEndDate);
      while (true) {
        current.setDate(current.getDate() + 7);
        if (current > end) break;
        dates.push(formatDateStr(current));
      }
    }
    return dates;
  }, [selectedDate, isRecurring, recurringEndDate]);

  const partitionedDates = useMemo(() => {
    const valid = [];
    const closed = [];
    targetDates.forEach(d => {
      if (closedDateStrs.includes(d)) {
        closed.push(d);
      } else {
        valid.push(d);
      }
    });
    return { valid, closed };
  }, [targetDates, closedDateStrs]);

  const hasClosedDayInTargets = partitionedDates.closed.length > 0;

  const getOccupiedCourts = (date) => {
    if (!date || !formData.startTime || !formData.endTime || !selectedFacilities.includes('体育館')) return [];
    return reservations
      .filter(r => r.date === date && r.place.includes('体育館') && r.courts)
      .filter(r => isTimeOverlapping(formData.startTime, formData.endTime, r.startTime, r.endTime))
      .flatMap(r => Array.isArray(r.courts) ? r.courts : []);
  };

  const occupiedCourts = getOccupiedCourts(selectedDate);

  const toggleFacility = (facility) => {
    setSelectedFacilities(prev => 
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
    if (facility === '体育館' && selectedFacilities.includes('体育館')) {
      setSelectedCourts([]);
    }
  };

  const toggleCourt = (court) => {
    if (occupiedCourts.includes(court)) return;
    setSelectedCourts(prev => {
      if (prev.includes(court)) return prev.filter(c => c !== court);
      if (prev.length >= 3) {
        alert("最大3面までしか一度に予約できません。");
        return prev;
      }
      return [...prev, court].sort();
    });
  };

  const toggleEquipment = (item) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("認証エラーです");
    if (selectedFacilities.length === 0) return alert("利用する施設を選択してください。");
    if (!formData.deletePass) return alert("取り消し用パスワードを設定してください。");
    
    if (!isRecurring && isSelectedDateClosed) return alert("休館日のため予約できません。");
    if (isRecurring && partitionedDates.valid.length === 0) {
      return alert("選択された期間の全ての日付が休館日のため、予約を送信できません。");
    }

    if (selectedFacilities.includes('体育館') && selectedCourts.length === 0) return alert("コート(A-F)を選んでください。");
    if (targetDates.length > 20) return alert("定期予約は最大20回分までまとめて申請可能です。");

    for (const d of partitionedDates.valid) {
      if (selectedFacilities.includes('体育館')) {
        const occ = getOccupiedCourts(d);
        const conflict = selectedCourts.some(c => occ.includes(c));
        if (conflict) return alert(`${d} に指定のコートが既に予約されています。`);
      }
      if (selectedFacilities.includes('多目的室')) {
        const roomConflict = reservations.some(r => 
          r.date === d && r.place.includes('多目的室') &&
          isTimeOverlapping(formData.startTime, formData.endTime, r.startTime, r.endTime)
        );
        if (roomConflict) return alert(`${d} の多目的室は既に予約されています。`);
      }
    }
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const resCollection = collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations');
      
      partitionedDates.valid.forEach(d => {
        const newDocRef = doc(resCollection);
        batch.set(newDocRef, {
          date: d, 
          userType, 
          ...formData, 
          place: selectedFacilities.join(', '), 
          courts: selectedFacilities.includes('体育館') ? selectedCourts : null,
          equipment, 
          status: 'approved', // 初めから承認済み
          createdAt: new Date().toISOString(), 
          userId: user.uid,
          isRecurring: isRecurring
        });
      });

      await batch.commit();

      let successMsg = '予約が完了しました。';
      if (partitionedDates.closed.length > 0) {
        successMsg = `一部の日程を除いて予約が完了しました。以下の休館日は除外されました：\n${partitionedDates.closed.join(', ')}`;
      }
      onSuccess(successMsg);
    } catch (err) { 
      alert("保存に失敗しました。"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-500 pb-10">
      <h2 className="text-3xl font-bold flex items-center text-gray-900 tracking-tight">
        <div className="bg-blue-600 text-white p-2.5 rounded-2xl mr-4 shadow-lg"><FileText className="h-7 w-7" /></div>
        施設利用申し込み
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border shadow-lg space-y-6 h-fit">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-lg tracking-tight"><Users className="h-6 w-6 mr-3 text-blue-500"/> ① 利用者情報</h3>
          <div className="flex bg-gray-50 p-1 rounded-2xl shadow-inner">
            {['employee', 'external'].map(type => (
              <label key={type} className={`flex-1 py-3.5 rounded-xl text-center cursor-pointer transition-all font-bold text-xs ${userType === type ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-500'}`}>
                <input type="radio" checked={userType === type} onChange={() => setUserType(type)} className="hidden" />
                <span>{type === 'employee' ? '従業員' : '一般・団体'}</span>
              </label>
            ))}
          </div>
          <div className="space-y-4">
            <InputField label="利用団体名 *" value={formData.name} onChange={(v)=>setFormData({...formData, name:v})} placeholder="団体名を入力" />
            <InputField label="利用責任者氏名 *" value={formData.repName} onChange={(v)=>setFormData({...formData, repName:v})} placeholder="代表者名" />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="使用人数 *" type="number" value={formData.userCount} onChange={(v)=>setFormData({...formData, userCount:v})} placeholder="名" />
              <InputField label="取消用パスワード *" type="password" value={formData.deletePass} onChange={(v)=>setFormData({...formData, deletePass:v})} placeholder="数字4桁など" />
            </div>
            <InputField label="メール *" type="email" value={formData.email} onChange={(v)=>setFormData({...formData, email:v})} placeholder="example@email.com" />
            <InputField label="緊急連絡先 *" type="tel" value={formData.phone} onChange={(v)=>setFormData({...formData, phone:v})} placeholder="090-XXXX-XXXX" />
            <p className="text-[9px] text-gray-400 font-bold px-2">※取消用パスワードは予約の取り消しに必要です。</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border shadow-lg space-y-6">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-lg tracking-tight"><MapPin className="h-6 w-6 mr-3 text-blue-500"/> ② 日時と場所</h3>
          <div className="space-y-5">
            <div className="space-y-2 px-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">利用日 *</label>
                <button 
                  type="button" 
                  onClick={() => setIsRecurring(!isRecurring)} 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all ${isRecurring ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isRecurring ? 'animate-spin-slow' : ''}`} />
                  定期予約{isRecurring ? 'ON' : 'OFF'}
                </button>
              </div>
              <input type="date" required value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className={`border-2 p-4 rounded-2xl w-full font-bold text-lg outline-none transition-all ${isSelectedDateClosed ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-100 text-blue-900 focus:border-blue-500'}`} />
              {isSelectedDateClosed && <p className="text-red-500 text-xs font-black flex items-center gap-1 mt-1 px-1"><Ban className="w-3 h-3" /> 休館日のため予約できません</p>}
            </div>

            {isRecurring && (
              <div className="space-y-2 px-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest px-1 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> 定期予約の終了日 *
                </label>
                <input type="date" required value={recurringEndDate} onChange={(e)=>setRecurringEndDate(e.target.value)} className={`border-2 p-4 rounded-2xl w-full font-bold text-lg text-indigo-900 outline-none transition-all ${hasClosedDayInTargets ? 'border-amber-400 bg-amber-50' : 'border-indigo-100 focus:border-indigo-500'}`} />
                {hasClosedDayInTargets && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2 space-y-1">
                    <p className="text-amber-700 text-[10px] font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 休館日が含まれています（自動除外）</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 px-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">開始 *</label>
                <input type="time" step="600" required value={formData.startTime} onChange={(e)=>setFormData({...formData, startTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">終了 *</label>
                <input type="time" step="600" required value={formData.endTime} onChange={(e)=>setFormData({...formData, endTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-3 px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">利用施設 (複数選択可) *</label>
                <div className="flex gap-4">
                  {['体育館', '多目的室'].map(facility => (
                    <label key={facility} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm ${selectedFacilities.includes(facility) ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                      <input type="checkbox" checked={selectedFacilities.includes(facility)} onChange={() => toggleFacility(facility)} className="hidden" />
                      {selectedFacilities.includes(facility) ? <CheckSquare className="h-4 w-4" /> : <div className="h-4 w-4 border-2 border-gray-200 rounded" />}
                      {facility}
                    </label>
                  ))}
                </div>
              </div>

              {selectedFacilities.includes('体育館') && (
                <div className="space-y-4 animate-in zoom-in duration-300 px-2">
                  <label className="text-xs font-bold text-blue-800 flex justify-between px-1">
                    <span>コート選択 (最大3面) *</span>
                    <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">選択中: {selectedCourts.length}/3</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 p-5 bg-gray-100 rounded-[2rem] shadow-inner border-2 border-white">
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
                </div>
              )}
            </div>
            <div className="space-y-2 px-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">利用目的 *</label>
              <textarea required placeholder="例：バレー練習" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-sm font-bold h-20 outline-none transition-all shadow-inner" />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6 lg:col-span-2">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-lg tracking-tight"><CheckSquare className="h-7 w-7 mr-3 text-blue-500"/> ③ 貸出備品</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
            <div className="space-y-4">
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit tracking-wider border border-blue-100 uppercase">All Users</p>
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
              <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit tracking-wider border border-red-100 uppercase">Employees Only</p>
              <div className="grid grid-cols-1 gap-2">
                {equipmentForEmployeesOnly.map(item => (
                  <label key={item} className={`flex items-center space-x-3 text-sm font-bold ${userType !== 'employee' ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} p-2 rounded-xl transition-colors`}>
                    <input type="checkbox" disabled={userType !== 'employee'} checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-10 space-y-6">
        <button 
          type="submit" 
          disabled={isSubmitting || (partitionedDates.valid.length === 0)} 
          className="w-full max-w-lg bg-blue-600 text-white py-5 rounded-[2rem] font-bold text-xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? <><Loader2 className="animate-spin mr-3"/> 送信中...</> : 
           (partitionedDates.valid.length === 0) ? '休館日のため予約不可' : 
           isRecurring ? `定期予約を一括確定する` : '予約を確定する'}
        </button>
      </div>
    </form>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">{label}</label>
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
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-bold text-xl transition-all shadow flex items-center justify-center relative
        ${occupied ? 'bg-red-50 text-red-300 border-2 border-red-100 cursor-not-allowed opacity-60' : 
          active ? 'bg-blue-600 text-white shadow-blue-400/40 border-2 border-blue-400 scale-105' : 'bg-white text-gray-500 border-2 border-gray-100 hover:border-blue-400 hover:text-blue-500'}
      `}
    >
      {label}
      {occupied && <X className="absolute h-3 w-3 text-red-300 bottom-1 right-1" />}
    </button>
  );
}

// 3. 予約取消画面
function CancelView({ reservations, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [inputDeletePass, setInputDeletePass] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const results = reservations.filter(res => 
      (res.phone && res.phone.includes(searchTerm)) || 
      (res.repName && res.repName.includes(searchTerm)) || 
      (res.name && res.name.includes(searchTerm))
    );
    setFilteredResults(results);
  };

  const handleCancel = async (targetRes) => {
    if (!inputDeletePass) return alert("取消用パスワードを入力してください。");
    if (targetRes.deletePass !== inputDeletePass) return alert("パスワードが正しくありません。");

    if (window.confirm('この予約を取り消しますか？')) {
      try {
        await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', targetRes.id));
        onSuccess();
        setInputDeletePass('');
      } catch (err) {
        alert("削除に失敗しました。");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center justify-center">
          <XCircle className="mr-3 h-8 w-8 text-red-500" /> 予約の取り消し
        </h2>
        <p className="text-sm text-gray-500 font-bold">電話番号または氏名で検索してください</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl">
        <form onSubmit={handleSearch} className="relative group mb-8">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="電話番号または責任者名を入力" className="w-full pl-6 pr-14 py-4 bg-gray-50 border-4 border-transparent focus:border-red-400 focus:bg-white rounded-[2rem] text-lg font-bold outline-none transition-all shadow-inner" />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 shadow-lg active:scale-95 transition-all">
            <Search className="h-6 w-6" />
          </button>
        </form>

        <div className="space-y-4">
          {filteredResults.length > 0 && (
            <div className="bg-red-50 p-4 rounded-2xl mb-4 border border-red-100 flex items-center gap-3">
              <Key className="h-5 w-5 text-red-500" />
              <input type="password" placeholder="取消用パスワードを入力" value={inputDeletePass} onChange={(e) => setInputDeletePass(e.target.value)} className="bg-white border-2 border-red-200 rounded-xl px-4 py-2 flex-1 text-sm font-bold outline-none focus:border-red-500" />
            </div>
          )}
          {filteredResults.length > 0 ? (
            filteredResults.sort((a,b) => a.date.localeCompare(b.date)).map(res => (
              <div key={res.id} className="bg-white p-6 rounded-3xl border-2 border-gray-50 shadow-md flex justify-between items-center group hover:border-red-100 transition-all">
                <div className="space-y-1">
                  <div className="font-black text-lg text-gray-900">{res.date} <span className="text-red-500 ml-2">({res.startTime}-{res.endTime})</span></div>
                  <div className="text-xs font-bold text-gray-500">{res.place} {res.courts ? `(${res.courts.join('')})` : ''} | {res.name}</div>
                </div>
                <button onClick={() => handleCancel(res)} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                  <Trash2 className="h-6 w-6" />
                </button>
              </div>
            ))
          ) : searchTerm && (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <AlertTriangle className="h-10 w-10 mx-auto opacity-20" />
              <p className="font-bold">該当する予約が見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. 管理者ダッシュボード
function AdminDashboard({ reservations, closedDays, onStatusUpdate }) {
  const [printWeekStart, setPrintWeekStart] = useState(formatDateStr(new Date()));
  const [showPrintView, setShowPrintView] = useState(false);
  
  const [closedStart, setClosedStart] = useState('');
  const [closedEnd, setClosedEnd] = useState('');
  const [closedReason, setClosedReason] = useState('');

  const deleteReservation = async (id) => {
    if (window.confirm('管理者権限でこの予約を削除しますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
      onStatusUpdate();
    }
  };

  const launchEmailToReservedUsers = (targetDates) => {
    const reservedUsersInPeriod = reservations.filter(r => targetDates.includes(r.date) && r.email);
    if (reservedUsersInPeriod.length === 0) return;
    const uniqueEmails = [...new Set(reservedUsersInPeriod.map(u => u.email))];
    const toField = uniqueEmails.join(',');
    const periodDisplay = targetDates.length > 1 ? `${targetDates[0]} 〜 ${targetDates[targetDates.length - 1]}` : targetDates[0];
    const subject = encodeURIComponent("【重要】KAITEKI体育館 施設休館に伴う予約キャンセルのお知らせ");
    const body = encodeURIComponent(`予約責任者様\n\n施設休館に伴う予約取り消しのお知らせです。\n\n【休館期間】\n${periodDisplay}\n${closedReason ? `【理由】\n${closedReason}\n` : ''}\n本件に関するお問い合わせは管理担当までお願いいたします。\n`);
    window.location.href = `mailto:${toField}?cc=${ADMIN_CC_EMAIL}&subject=${subject}&body=${body}`;
  };

  const addClosedPeriod = async (e) => {
    e.preventDefault();
    if (!closedStart) return;
    const targetDates = [closedStart];
    if (closedEnd && closedEnd !== closedStart) {
      let current = new Date(closedStart);
      const end = new Date(closedEnd);
      while (true) {
        current.setDate(current.getDate() + 1);
        if (current > end) break;
        targetDates.push(formatDateStr(current));
      }
    }
    try {
      const batch = writeBatch(db);
      const closedRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'closed_days');
      targetDates.forEach(d => {
        if (!closedDays.some(cd => cd.date === d)) {
          const newDocRef = doc(closedRef);
          batch.set(newDocRef, { date: d, reason: closedReason, createdAt: new Date().toISOString() });
        }
      });
      await batch.commit();
      launchEmailToReservedUsers(targetDates);
      setClosedStart(''); setClosedEnd(''); setClosedReason('');
      onStatusUpdate();
    } catch (err) { alert("保存失敗"); }
  };

  const removeClosedDay = async (id) => {
    if (window.confirm('休館設定を解除しますか？')) {
      await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'closed_days', id));
      onStatusUpdate();
    }
  };

  const exportToCSV = () => {
    const headers = ["利用日", "開始", "終了", "場所", "コート", "団体名", "代表者", "使用人数", "電話番号"];
    const rows = reservations.map(r => [
      r.date, r.startTime, r.endTime, r.place, 
      r.courts ? r.courts.join('') : '-',
      r.name, r.repName, r.userCount || '-', r.phone
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `kaiteki_gym_reservations.csv`);
    link.click();
  };

  const sortedReservations = [...reservations].sort((a,b)=>a.date.localeCompare(b.date));

  if (showPrintView) {
    return <WeeklyPrintView reservations={reservations} closedDays={closedDays} weekStartStr={printWeekStart} onBack={() => setShowPrintView(false)} />;
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto py-4 no-print">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 pb-6 border-blue-100 gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center text-blue-950 tracking-tight">
            <ShieldCheck className="mr-3 h-10 w-10 text-blue-600"/> 管理者メニュー
          </h2>
          <p className="text-xs font-bold text-gray-500 mt-1">予約管理とデータの出力を行います</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg active:scale-95 transition-all">
          <Download className="h-4 w-4" /><span>CSV出力(Excel用)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-xl space-y-4 h-fit">
          <h3 className="font-bold text-lg flex items-center text-blue-900"><Printer className="h-5 w-5 mr-2" /> 週間予定表の作成 (A3印刷用)</h3>
          <div className="flex flex-wrap items-center gap-4">
            <input type="date" value={printWeekStart} onChange={(e)=>setPrintWeekStart(e.target.value)} className="border p-2 rounded-xl text-sm font-bold" />
            <button onClick={()=>setShowPrintView(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 shadow flex items-center space-x-2">
              <Printer className="h-4 w-4" /><span>印刷プレビュー</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border-2 border-red-50 shadow-xl space-y-4">
          <h3 className="font-bold text-lg flex items-center text-red-900"><Ban className="h-5 w-5 mr-2" /> 休館日の期間設定</h3>
          <form onSubmit={addClosedPeriod} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={closedStart} onChange={(e)=>setClosedStart(e.target.value)} className="w-full border p-2 rounded-xl text-sm font-bold" />
              <input type="date" value={closedEnd} onChange={(e)=>setClosedEnd(e.target.value)} className="w-full border p-2 rounded-xl text-sm font-bold" />
            </div>
            <input type="text" placeholder="理由（任意）" value={closedReason} onChange={(e)=>setClosedReason(e.target.value)} className="w-full border p-2 rounded-xl text-sm font-bold" />
            <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg transition-all active:scale-95">休館日を登録 & 連絡メール作成</button>
          </form>
          <div className="pt-4 border-t border-red-50">
             <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {closedDays.sort((a,b)=>a.date.localeCompare(b.date)).map(cd => (
                <div key={cd.id} className="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-100">
                  <span className="text-[11px] font-bold text-red-700">{cd.date} <span className="text-gray-400 font-normal ml-2">{cd.reason}</span></span>
                  <button onClick={()=>removeClosedDay(cd.id)} className="text-red-300 hover:text-red-600 p-1"><X className="h-4 w-4"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <section>
        <h3 className="font-bold text-xl text-blue-900 mb-6 border-b-2 border-blue-50 pb-2 flex items-center">
           <Calendar className="mr-2 h-6 w-6" /> 全予約リスト（{reservations.length}件）
        </h3>
        <div className="space-y-4">
          {sortedReservations.length === 0 ? <p className="text-center text-gray-300 py-10 font-bold">予約データはありません</p> : sortedReservations.map(res => (
            <div key={res.id} className="bg-white p-6 rounded-3xl border shadow-md flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-1">
                <div className="font-black text-xl">{res.date} <span className="text-blue-600 ml-2">({res.startTime}-{res.endTime})</span></div>
                <div className="text-sm font-bold text-gray-600">{res.place} {res.courts ? `(${res.courts.join('')})` : ''} | {res.name}</div>
                <div className="text-xs text-gray-400 italic flex items-center gap-4">
                  <span>目的: {res.purpose}</span>
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {res.userCount}名</span>
                  <span>代表: {res.repName} ({res.phone})</span>
                </div>
              </div>
              <button onClick={()=>deleteReservation(res.id)} className="px-6 py-2 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 rounded-xl transition-colors">削除</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 印刷用週間ビュー
function WeeklyPrintView({ reservations, closedDays, weekStartStr, onBack }) {
  const weekStart = new Date(weekStartStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return formatDateStr(d);
  });
  const courts = ['E', 'D', 'F', 'A', 'B', 'C'];
  const closedDateStrs = closedDays.map(cd => cd.date);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print bg-white p-6 rounded-2xl shadow-xl border-2 border-blue-100">
        <div className="flex items-center space-x-3">
          <Printer className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold">週間予定表 印刷プレビュー</h3>
            <p className="text-xs text-gray-500 font-bold">A3 / 横向き設定を推奨</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button onClick={onBack} className="px-6 py-2 font-bold text-gray-500 border rounded-xl hover:bg-gray-50">管理画面に戻る</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">印刷する</button>
        </div>
      </div>
      <div className="bg-white p-2 border-2 border-black min-h-[800px] font-sans text-xs">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold border-b-2 border-black inline-block px-10 pb-1 uppercase tracking-widest">KAITEKI体育館 週間利用予定表</h2>
          <p className="text-sm font-bold mt-2">期間: {weekDays[0]} 〜 {weekDays[6]}</p>
        </div>
        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black p-2 w-16">コート</th>
              {weekDays.map(d => {
                const dateObj = new Date(d);
                const dayLabels = ['日','月','火','水','木','金','土'];
                return (
                  <th key={d} className={`border-2 border-black p-2 text-center ${dateObj.getDay() === 0 ? 'text-red-500' : dateObj.getDay() === 6 ? 'text-blue-500' : ''}`}>
                    {d.split('-')[1]}/{d.split('-')[2]} ({dayLabels[dateObj.getDay()]})
                    {closedDateStrs.includes(d) && <div className="text-[8px] text-red-500 font-black">【休館日】</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {courts.map(c => (
              <tr key={c} className="h-28">
                <td className="border-2 border-black p-2 text-center font-bold bg-gray-50 text-base">
                  {c}<br/><span className="text-[8px] text-gray-400 font-normal">{(['E','D','F'].includes(c)) ? '用具側' : '入口側'}</span>
                </td>
                {weekDays.map(d => {
                  const isClosed = closedDateStrs.includes(d);
                  const dayCourts = reservations
                    .filter(r => r.date === d && r.place.includes('体育館') && r.courts && r.courts.includes(c))
                    .sort((a,b)=>a.startTime.localeCompare(b.startTime));
                  return (
                    <td key={d} className={`border-2 border-black p-1 align-top relative ${isClosed ? 'bg-gray-100' : ''}`}>
                      {isClosed ? <div className="flex items-center justify-center h-full"><Ban className="w-8 h-8 text-gray-300" /></div> : (
                        <div className="space-y-1">
                          {dayCourts.map(res => (
                            <div key={res.id} className="border border-gray-300 p-1 rounded bg-gray-50/50 leading-tight">
                              <div className="font-bold text-blue-900 border-b border-gray-200 mb-1">{res.startTime}-{res.endTime}</div>
                              <div className="font-bold">{res.name} {res.userCount ? `(${res.userCount}名)` : ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="h-24">
              <td className="border-2 border-black p-2 text-center font-bold bg-gray-50 text-sm">多目的室</td>
              {weekDays.map(d => {
                  const isClosed = closedDateStrs.includes(d);
                  const rooms = reservations
                    .filter(r => r.date === d && r.place.includes('多目的室'))
                    .sort((a,b)=>a.startTime.localeCompare(b.startTime));
                  return (
                    <td key={d} className={`border-2 border-black p-1 align-top ${isClosed ? 'bg-gray-100' : ''}`}>
                      {isClosed ? <div className="flex items-center justify-center h-full text-gray-300 font-bold uppercase tracking-widest text-[8px]">Closed</div> : (
                        <div className="space-y-1">
                          {rooms.map(res => (
                            <div key={res.id} className="border border-gray-300 p-1 rounded bg-gray-50/50 leading-tight">
                              <div className="font-bold text-green-800 border-b border-gray-200 mb-1">{res.startTime}-{res.endTime}</div>
                              <div className="font-bold">{res.name} {res.userCount ? `(${res.userCount}名)` : ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
              })}
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-between items-end text-[10px] font-bold text-gray-400">
          <div>出力日時: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// 5. 利用ルール
function RulesView() {
  return (
    <div className="max-w-4xl mx-auto bg-white p-10 sm:p-16 rounded-[3.5rem] border shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <h2 className="text-3xl font-bold mb-12 border-b-8 border-blue-500 pb-6 text-blue-900 flex justify-between items-center tracking-tight">
        体育館 貸出運用ルール
        <Info className="h-10 w-10 text-blue-100" />
      </h2>
      <div className="grid md:grid-cols-2 gap-16 text-gray-800">
        <div className="space-y-12 font-bold">
          <section>
            <h3 className="flex items-center text-blue-800 text-2xl mb-8 border-l-[10px] border-blue-700 pl-6 tracking-tight font-black">① 利用時間・休館</h3>
            <div className="bg-gray-50 p-8 rounded-[3rem] space-y-8 shadow-inner border-2 border-white leading-relaxed">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xl"><span>平日</span><span className="bg-gray-900 text-white px-5 py-1.5 rounded-2xl shadow-xl font-mono">8:30 - 21:00</span></div>
                <div className="flex justify-between items-center text-xl"><span>休日</span><span className="bg-gray-900 text-white px-5 py-1.5 rounded-2xl shadow-xl font-mono">8:30 - 17:00</span></div>
              </div>
              <div className="pt-8 border-t-2 border-gray-100 space-y-4">
                <p className="text-2xl text-red-600 font-black tracking-tighter leading-none">毎月 第１・第３日曜日</p>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed font-bold">※お盆、正月、GW、会社カレンダー準拠。</p>
              </div>
            </div>
          </section>
          <section>
            <h3 className="flex items-center text-blue-800 text-2xl mb-8 border-l-[10px] border-blue-700 pl-6 tracking-tight font-black">② 予約期間</h3>
            <div className="bg-blue-50 p-8 rounded-[3rem] space-y-6 shadow-inner border-2 border-white">
              <p className="text-base font-black text-blue-950 text-center tracking-wide leading-none">3ヶ月周期での予約受付</p>
              <table className="w-full text-xs bg-white rounded-3xl overflow-hidden border-4 border-blue-100 shadow-xl">
                <thead className="bg-blue-600 text-white">
                  <tr><th className="p-4 border-r border-blue-500">受付開始日</th><th className="p-4">対象期間</th></tr>
                </thead>
                <tbody className="text-gray-700 font-black">
                  <tr className="border-b-2 border-blue-50"><td className="p-4 border-r text-center bg-gray-50/50">12/1〜</td><td className="p-4 text-center">翌1月〜3月末</td></tr>
                  <tr className="border-b-2 border-blue-50"><td className="p-4 border-r text-center bg-gray-50/50">3/1〜</td><td className="p-4 text-center">4月〜6月末</td></tr>
                  <tr className="border-b-2 border-blue-50"><td className="p-4 border-r text-center bg-gray-50/50">6/1〜</td><td className="p-4 text-center">7月〜9月末</td></tr>
                  <tr><td className="p-4 border-r text-center bg-gray-50/50">9/1〜</td><td className="p-4 text-center">10月〜12月末</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <section className="space-y-10">
          <h3 className="flex items-center text-blue-800 text-2xl mb-8 border-l-[10px] border-blue-700 pl-6 tracking-tight font-black">③ 遵守事項</h3>
          <ul className="space-y-6 font-bold text-gray-700">
            {[
              { t: "予約確定", c: "予約は即時に確定されます。変更がある場合は速やかに取り消しを行ってください。" },
              { t: "飲食禁止", c: "アリーナ内は食事厳禁。食事は2階休憩スペースか多目的室で。" },
              { t: "清掃徹底", c: "終了後は用具を戻し、必ずモップ掛けを行ってください。ゴミは各自持ち帰り。" },
              { t: "駐車場", c: "指定場所のみ駐車可。路上駐車禁止。路面表示、一方通行を遵守。" },
              { t: "速度制限", c: "構内は時速20km制限。騒音にも十分配慮してください。" },
              { t: "破損報告", c: "破損した場合は直ちに管理人に報告。実費弁償の場合があります。" }
            ].map((rule, i) => (
              <li key={i} className="flex items-start bg-gray-50/80 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all">
                <span className="bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-xs mr-5 mt-1 flex-shrink-0 shadow shadow-blue-200 font-black">{i+1}</span>
                <div>
                  <p className="text-blue-900 text-[10px] font-black uppercase mb-1 opacity-60 tracking-widest">{rule.t}</p>
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