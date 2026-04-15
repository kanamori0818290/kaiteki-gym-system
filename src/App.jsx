import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, FileText, CheckSquare, Info, XCircle, Plus, Trash2, Users, Building, MapPin, Clock, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Loader2, Lock, LogOut, Check, X, ShieldCheck, Download, Printer, KeyRound, Search, RefreshCw, Ban, Mail, Key, UserCheck, MousePointerClick } from 'lucide-react';
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
const ADMIN_CC_EMAIL = "MCJP-DG-RIX_TOYAMA_TAIIKUKAN@mchcgr.com";

// --- 初期登録団体リスト ---
const INITIAL_GROUPS = [
  // 会社の部活（次年度の3/31まで）
  { name: 'MCCバレー', type: 'mcc' },
  { name: 'MCC卓球', type: 'mcc' },
  { name: 'MCCバドミントン', type: 'mcc' },
  // 従業員利用（3ヶ月先まで）
  { name: '佐野（富山北FC）', type: 'employee' },
  { name: '朝岡（FC ALVA)', type: 'employee' },
  { name: '斉藤（和合ハンドボール）', type: 'employee' },
  { name: '斉藤（ターミガンズ ジュニア）', type: 'employee' },
  { name: '金森（ピックルボール富山）', type: 'employee' },
  { name: '金森（神明フレッシュテニス）', type: 'employee' },
  { name: '亀畑', type: 'employee' },
  { name: '林田（hayashuda)', type: 'employee' },
  { name: '吉岡（富山ドリームズ）', type: 'employee' },
  { name: '梅田', type: 'employee' },
  { name: '古金(BC)', type: 'employee' },
  // 一般・外部（2ヶ月先まで）
  { name: 'BRABBTS', type: 'external' },
  { name: '富山ダルク', type: 'external' },
  { name: 'Rey華繚乱', type: 'external' },
  { name: 'SDバスケ', type: 'external' },
  { name: '岩瀬中バスケ', type: 'external' },
  { name: '富山北FC', type: 'external' },
  { name: 'HAGIURAバレー', type: 'external' },
  { name: '富山北部VC', type: 'external' },
  { name: '北中女子ソフトテニス部', type: 'external' }
];

// --- 貸出備品（全団体・個人共通で利用可能） ---
const equipmentForAll = [
  'バドミントン用器具（ポール・ネット）',
  'ビーチボールバレー用器具（ポール・ネット・審判台）',
  'バレーボール用器具（ポール・ネット・審判台）',
  '卓球用器具（台・ネット）',
  'フットサル用器具（ゴール）',
  'バドミントン用品（ラケット、シャトル）',
  '各種ボール（ビーチ、バスケ、ドッジ、バレー、卓球）',
  '卓球ラケット'
];

// --- タイムライン用の定数 ---
const TIME_SLOTS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", 
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", 
  "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
];
const END_TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];
// コートの並び順を用具側(D,E,F) → 入口側(A,B,C) に変更
const RESOURCES = [
  { id: 'D', name: 'コートD (用具側)', type: '体育館' },
  { id: 'E', name: 'コートE (用具側)', type: '体育館' },
  { id: 'F', name: 'コートF (用具側)', type: '体育館' },
  { id: 'A', name: 'コートA (入口側)', type: '体育館' },
  { id: 'B', name: 'コートB (入口側)', type: '体育館' },
  { id: 'C', name: 'コートC (入口側)', type: '体育館' },
  { id: '多目的室', name: '多目的室', type: '多目的室' },
];

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

// 時間計算ユーティリティ（分単位で計算）
const calculateDurationMinutes = (start, end) => {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  return (eH * 60 + eM) - (sH * 60 + sM);
};

// --- サブコンポーネント ---

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-blue-900 shadow-md' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      <span>{label}</span>
    </button>
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

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">{label}</label>
      <input 
        type={type} 
        required 
        placeholder={placeholder} 
        value={value} 
        onChange={(e)=>onChange(e.target.value)} 
        className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3.5 rounded-2xl w-full text-base font-bold outline-none transition-all shadow-inner" 
      />
    </div>
  );
}

// タイムライングリッドセレクター
function TimeGridSelector({ selectedDate, reservations, currentStartTime, currentEndTime, currentFacilities, currentCourts, onSelectionChange }) {
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const occupiedMap = useMemo(() => {
    const map = {};
    RESOURCES.forEach((res, rIndex) => {
      TIME_SLOTS.forEach((t, cIndex) => {
        const start = t;
        const end = END_TIMES[cIndex];
        const isOccupied = reservations.some(r => {
          if (r.date !== selectedDate) return false;
          if (r.status === 'cancelled') return false; 
          if (!isTimeOverlapping(start, end, r.startTime, r.endTime)) return false;
          if (res.type === '体育館' && r.place.includes('体育館') && r.courts && r.courts.includes(res.id)) return true;
          if (res.type === '多目的室' && r.place.includes('多目的室')) return true;
          return false;
        });
        map[`${rIndex}-${cIndex}`] = isOccupied;
      });
    });
    return map;
  }, [selectedDate, reservations]);

  const dragRect = useMemo(() => {
    if (!isDragging || !dragStart || !dragCurrent) return null;
    const minR = Math.min(dragStart.r, dragCurrent.r);
    const maxR = Math.max(dragStart.r, dragCurrent.r);
    const minC = Math.min(dragStart.c, dragCurrent.c);
    const maxC = Math.max(dragStart.c, dragCurrent.c);
    
    let conflict = false;
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (occupiedMap[`${r}-${c}`]) {
          conflict = true;
          break;
        }
      }
    }
    return { minR, maxR, minC, maxC, conflict };
  }, [isDragging, dragStart, dragCurrent, occupiedMap]);

  const handleMouseDown = (r, c, occupied) => {
    if (occupied) return;
    setIsDragging(true);
    setDragStart({ r, c });
    setDragCurrent({ r, c });
  };

  const handleMouseEnter = (r, c) => {
    if (isDragging) {
      setDragCurrent({ r, c });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragRect && !dragRect.conflict) {
      const facilities = new Set();
      const courts = [];
      for (let r = dragRect.minR; r <= dragRect.maxR; r++) {
        const res = RESOURCES[r];
        facilities.add(res.type);
        if (res.type === '体育館') courts.push(res.id);
      }
      
      onSelectionChange({
        startTime: TIME_SLOTS[dragRect.minC],
        endTime: END_TIMES[dragRect.maxC],
        facilities: Array.from(facilities),
        courts: courts
      });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <div className="overflow-x-auto border-2 border-blue-100 rounded-2xl bg-white shadow-inner select-none relative max-w-full pb-2">
      <table className="w-full text-xs min-w-[1000px] border-collapse bg-white">
        <thead>
          <tr>
            <th className="sticky left-0 bg-blue-50 z-20 p-2 border-b-2 border-r-2 border-blue-100 text-blue-900 font-bold min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-left">
              施設 / コート
            </th>
            {TIME_SLOTS.map((t, i) => (
              <th key={t} className="border-b-2 border-r border-blue-50 p-1 font-mono text-gray-500 font-bold min-w-[40px] text-[10px] text-center">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody onMouseLeave={() => setIsDragging(false)} onMouseUp={handleMouseUp}>
          {RESOURCES.map((resource, rIndex) => (
            <tr key={resource.id}>
              <td className="sticky left-0 bg-white z-10 p-2 border-b border-r-2 border-gray-100 font-bold text-gray-700 whitespace-nowrap text-xs shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                {resource.name}
              </td>
              {TIME_SLOTS.map((t, cIndex) => {
                const isOccupied = occupiedMap[`${rIndex}-${cIndex}`];
                let cellClass = "border-b border-r border-gray-100 p-0 h-8 transition-colors ";
                
                if (isOccupied) {
                  cellClass += "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] bg-gray-200 cursor-not-allowed ";
                } else {
                  cellClass += "cursor-crosshair hover:bg-blue-50 ";
                }

                if (dragRect && rIndex >= dragRect.minR && rIndex <= dragRect.maxR && cIndex >= dragRect.minC && cIndex <= dragRect.maxC) {
                  cellClass += dragRect.conflict ? "bg-red-400 opacity-80 " : "bg-blue-400 opacity-80 ";
                } else if (!isDragging && !isOccupied) {
                  const isSelected = 
                    currentStartTime <= TIME_SLOTS[cIndex] && 
                    currentEndTime >= END_TIMES[cIndex] &&
                    (
                      (resource.type === '体育館' && currentFacilities.includes('体育館') && currentCourts.includes(resource.id)) ||
                      (resource.type === '多目的室' && currentFacilities.includes('多目的室'))
                    );
                  if (isSelected) cellClass += "bg-blue-600 shadow-inner ";
                }

                return (
                  <td 
                    key={t}
                    className={cellClass}
                    onMouseDown={() => handleMouseDown(rIndex, cIndex, isOccupied)}
                    onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                  >
                     <div className="w-full h-full"></div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [closedDays, setClosedDays] = useState([]);
  const [groups, setGroups] = useState([]); // 団体マスタ
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
    
    // 予約データの取得
    const resRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations');
    const unsubRes = onSnapshot(resRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservations(data);
      setIsLoading(false);
    }, (err) => { 
      console.error("Firestore Error:", err); 
      setIsLoading(false); 
    });

    // 休館日データの取得
    const closedRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'closed_days');
    const unsubClosed = onSnapshot(closedRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClosedDays(data);
    });

    // 団体マスタの取得と初期化
    const groupsRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'groups');
    const unsubGroups = onSnapshot(groupsRef, (snapshot) => {
      if (snapshot.empty) {
        // 初期データをFirebaseに登録する
        const batch = writeBatch(db);
        INITIAL_GROUPS.forEach(g => {
          const docRef = doc(groupsRef);
          batch.set(docRef, { ...g, createdAt: new Date().toISOString() });
        });
        batch.commit();
      } else {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 名前順でソート
        setGroups(data.sort((a,b) => a.name.localeCompare(b.name, 'ja')));
      }
    });

    return () => {
      unsubRes();
      unsubClosed();
      unsubGroups();
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40 print:hidden">
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

      {/* 印刷時はコンテナの余白をなくし、最大幅制限を解除 */}
      <main className="max-w-6xl mx-auto px-4 py-6 relative min-h-[500px] print:max-w-none print:px-0 print:py-0 print:m-0">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10 py-20 print:hidden">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-base font-bold text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="w-full space-y-8 print:space-y-0">
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
                groups={groups}
                user={user} 
                onSuccess={(msg) => {showToast(msg || '予約が完了しました。'); setActiveTab('calendar');}} 
              />
            )}
            {activeTab === 'cancel' && <CancelView reservations={reservations} onSuccess={() => { showToast('予約をキャンセルしました'); setActiveTab('calendar'); }} />}
            {activeTab === 'rules' && <RulesView />}
            {activeTab === 'admin' && isAdmin && <AdminDashboard reservations={reservations} closedDays={closedDays} groups={groups} onStatusUpdate={() => showToast('更新しました')} />}
          </div>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:hidden">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-10 z-50 print:hidden">
          <CheckSquare className="h-5 w-5 text-green-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

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
  
  // キャンセル済みの予約はカレンダーから除外して枠を空ける
  const selectedDayReservations = reservations.filter(res => res.date === selectedDateStr && res.status !== 'cancelled');
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
              // キャンセル以外の予約をカウント
              const dayRes = reservations.filter(r => r.date === dStr && r.status !== 'cancelled');
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
                      {res.place} {res.courts ? `(${Array.isArray(res.courts) ? res.courts.join(', ') : res.courts})` : ''}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 border-t pt-2 mt-2 truncate">
                      団体: <span className="text-gray-700">{res.name}</span>
                    </div>
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

function ReservationForm({ initialDate, reservations, closedDays, groups, user, onSuccess }) {
  const [userType, setUserType] = useState(''); 
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [formData, setFormData] = useState({ 
    groupId: '', name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', purpose: '', deletePass: '', userCount: ''
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
      .filter(r => r.date === date && r.place.includes('体育館') && r.courts && r.status !== 'cancelled') 
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
      // 制限解除: 6面まですべて選択可能
      return [...prev, court].sort();
    });
  };

  const toggleEquipment = (item) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("認証エラーです");
    if (!formData.groupId) return alert("利用団体を選択してください。");
    if (selectedFacilities.length === 0) return alert("利用する施設を選択してください。");
    if (!formData.deletePass) return alert("取り消し用パスワードを設定してください。");
    
    if (!isRecurring && isSelectedDateClosed) return alert("休館日のため予約できません。");
    if (isRecurring && partitionedDates.valid.length === 0) {
      return alert("選択された期間の全ての日付が休館日のため、予約を送信できません。");
    }

    if (selectedFacilities.includes('体育館') && selectedCourts.length === 0) return alert("コート(A-F)を選んでください。");
    if (targetDates.length > 20) return alert("定期予約は最大20回分までまとめて申請可能です。");

    // --- ルール制約チェック1: 予約可能期間の制限 ---
    // 年度単位（次年度の3月31日まで）の設定
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    // 現在の月が1〜3月の場合はその年の3/31が年度末、4〜12月の場合は来年の3/31が年度末
    const endOfCurrentFiscalYear = new Date(currentMonth <= 3 ? currentYear : currentYear + 1, 2, 31); 
    // さらに「次年度」の末日まで許可（約1年間先まで）
    const mccMaxDate = new Date(endOfCurrentFiscalYear.getFullYear() + 1, 2, 31);

    const employeeMaxDate = new Date();
    employeeMaxDate.setMonth(employeeMaxDate.getMonth() + 3);
    
    const externalMaxDate = new Date();
    externalMaxDate.setMonth(externalMaxDate.getMonth() + 2);

    for (const d of partitionedDates.valid) {
      const targetDateObj = new Date(d);
      if (userType === 'mcc' && targetDateObj > mccMaxDate) {
        return alert(`会社の部活（MCC等）の予約は、次年度の3月末（${formatDateStr(mccMaxDate)}）まで可能です。`);
      }
      if (userType === 'employee' && targetDateObj > employeeMaxDate) {
        return alert(`従業員の予約は、本日より3ヶ月先（${formatDateStr(employeeMaxDate)}）まで可能です。`);
      }
      if (userType === 'external' && targetDateObj > externalMaxDate) {
        return alert(`一般・団体（近隣校区等）の予約は、本日より2ヶ月先（${formatDateStr(externalMaxDate)}）まで可能です。`);
      }
    }

    // --- ルール制約チェック2: 重複チェック ---
    for (const d of partitionedDates.valid) {
      if (selectedFacilities.includes('体育館')) {
        const occ = getOccupiedCourts(d);
        const conflict = selectedCourts.some(c => occ.includes(c));
        if (conflict) return alert(`${d} に指定のコートが既に予約されています。`);
      }
      if (selectedFacilities.includes('多目的室')) {
        const roomConflict = reservations.some(r => 
          r.date === d && r.place.includes('多目的室') && r.status !== 'cancelled' &&
          isTimeOverlapping(formData.startTime, formData.endTime, r.startTime, r.endTime)
        );
        if (roomConflict) return alert(`${d} の多目的室は既に予約されています。`);
      }
    }
    
    // --- ルール制約チェック3: 月間20時間制限 ＆ 6面全面予約の月1回制限 ---
    const newBookingMinutes = calculateDurationMinutes(formData.startTime, formData.endTime);
    const isSixCourts = selectedFacilities.includes('体育館') && selectedCourts.length === 6;

    // 定期予約を考慮し、月ごとに新規予約回数を集計
    const monthlyNewBookings = {};
    partitionedDates.valid.forEach(d => {
      const monthStr = d.substring(0, 7); // "YYYY-MM"
      monthlyNewBookings[monthStr] = (monthlyNewBookings[monthStr] || 0) + 1;
    });

    for (const monthStr of Object.keys(monthlyNewBookings)) {
      const newCount = monthlyNewBookings[monthStr];
      const additionalMinutes = newBookingMinutes * newCount;

      // 既存の「同月・同団体」の予約を取得（キャンセル済みも含めて集計する！）
      const existingResInMonth = reservations.filter(r => {
        // 「個人利用」の場合は、団体名＋代表者名でユニーク判定して集計する
        if (formData.name.includes('個人')) {
          return r.name === formData.name && r.repName === formData.repName && r.date.startsWith(monthStr);
        }
        return r.groupId === formData.groupId && r.date.startsWith(monthStr);
      });
      
      let currentTotalMinutes = 0;
      let currentSixCourtCount = 0;

      existingResInMonth.forEach(r => {
        currentTotalMinutes += calculateDurationMinutes(r.startTime, r.endTime);
        if (r.place.includes('体育館') && r.courts && r.courts.length === 6) {
          currentSixCourtCount++;
        }
      });

      // 20時間(1200分)上限チェック
      if (currentTotalMinutes + additionalMinutes > 20 * 60) {
        return alert(`【${monthStr}】の予約上限（月間20時間）を超過します。\n・現在の消費枠: ${currentTotalMinutes / 60}時間 (※キャンセル分含む)\n・今回追加: ${additionalMinutes / 60}時間`);
      }

      // 6面全面予約 月1回上限チェック
      if (isSixCourts && (currentSixCourtCount + newCount > 1)) {
        return alert(`【${monthStr}】において、6面（全面）予約は月1回までしかできません。（現在の6面予約枠消費: ${currentSixCourtCount}回）`);
      }
    }

    // すべてのチェックを通過したら保存処理へ
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
          status: 'approved',
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
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">利用団体 *</label>
              <select
                required
                value={formData.groupId}
                onChange={(e) => {
                  const g = groups.find(group => group.id === e.target.value);
                  if (g) {
                    setFormData({...formData, groupId: g.id, name: g.name});
                    setUserType(g.type);
                  } else {
                    setFormData({...formData, groupId: '', name: ''});
                    setUserType('');
                  }
                }}
                className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3.5 rounded-2xl w-full text-base font-bold outline-none transition-all shadow-inner text-gray-800"
              >
                <option value="">-- 事前登録された団体を選択 --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {userType && (
              <div className="flex items-center gap-2 px-3 py-1 animate-in fade-in">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${userType === 'mcc' ? 'bg-purple-100 text-purple-700' : userType === 'employee' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {userType === 'mcc' ? '会社の部活 (次年度3月末まで可)' : userType === 'employee' ? '従業員 (3ヶ月先まで予約可)' : '一般・団体 (2ヶ月先まで予約可)'}
                </span>
              </div>
            )}

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

        <div className="bg-white p-8 rounded-3xl border shadow-lg space-y-6 lg:col-span-2">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-lg tracking-tight"><MapPin className="h-6 w-6 mr-3 text-blue-500"/> ② 日時と場所</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              <div className="space-y-2">
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
                <div className="space-y-2 animate-in slide-in-from-top-2">
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
            </div>

            <div className="space-y-3 px-2 pt-2 animate-in fade-in duration-500">
              <label className="text-xs font-bold text-blue-700 flex items-center gap-2">
                <MousePointerClick className="w-5 h-5" /> 
                スケジュールアシスタント（ドラッグ＆ドロップで予約）
              </label>
              <p className="text-[10px] text-gray-500 font-bold mb-2">※ 以下の表で予約したい「時間」と「場所」をマウスでなぞると、自動で入力されます。</p>
              
              {selectedDate && !isSelectedDateClosed ? (
                <TimeGridSelector 
                  selectedDate={selectedDate}
                  reservations={reservations}
                  currentStartTime={formData.startTime}
                  currentEndTime={formData.endTime}
                  currentFacilities={selectedFacilities}
                  currentCourts={selectedCourts}
                  onSelectionChange={({ startTime, endTime, facilities, courts }) => {
                    setFormData(prev => ({ ...prev, startTime, endTime }));
                    setSelectedFacilities(facilities);
                    setSelectedCourts(courts);
                  }}
                />
              ) : (
                <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-8 text-center text-gray-400 font-bold">
                  {isSelectedDateClosed ? '休館日のためタイムラインは表示されません' : '利用日を選択するとタイムラインが表示されます'}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t-2 border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-4">手動入力（微調整用）</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">開始 *</label>
                  <input type="time" step="600" required value={formData.startTime} onChange={(e)=>setFormData({...formData, startTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">終了 *</label>
                  <input type="time" step="600" required value={formData.endTime} onChange={(e)=>setFormData({...formData, endTime:e.target.value})} className="bg-gray-50 p-4 rounded-2xl w-full text-center text-lg font-bold border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none" />
                </div>
              </div>

              <div className="space-y-4 pt-6">
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
                      <span>コート選択 * <span className="text-[10px] font-normal text-blue-500 ml-2">※全面(6面)予約は月1回まで</span></span>
                      <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">選択中: {selectedCourts.length}/6</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 p-5 bg-gray-100 rounded-[2rem] shadow-inner border-2 border-white">
                      {/* 順番変更：A,B,C（入口側）を上に */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">入口側</p>
                        <div className="flex space-x-3 justify-center">
                          {['A', 'B', 'C'].map(c => (
                            <CourtButton key={c} label={c} active={selectedCourts.includes(c)} occupied={occupiedCourts.includes(c)} onClick={() => toggleCourt(c)} />
                          ))}
                        </div>
                      </div>
                      <div className="my-1 border-b border-gray-200 w-2/3 mx-auto"></div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest">用具側</p>
                        <div className="flex space-x-3 justify-center">
                          {['D', 'E', 'F'].map(c => (
                            <CourtButton key={c} label={c} active={selectedCourts.includes(c)} occupied={occupiedCourts.includes(c)} onClick={() => toggleCourt(c)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2 px-2 pt-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">利用目的 *</label>
              <textarea required placeholder="例：バレー練習" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose:e.target.value})} className="bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl w-full text-sm font-bold h-20 outline-none transition-all shadow-inner" />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6 lg:col-span-2">
          <h3 className="font-bold border-b-2 border-blue-50 pb-3 flex items-center text-blue-900 text-lg tracking-tight"><CheckSquare className="h-7 w-7 mr-3 text-blue-500"/> ③ 貸出備品</h3>
          <div className="px-2">
            <p className="text-xs font-bold text-gray-500 mb-4">すべての団体・個人で利用可能な備品です。（複数選択可）</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipmentForAll.map(item => (
                <label key={item} className="flex items-center space-x-3 text-sm font-bold cursor-pointer hover:bg-blue-50 p-3 rounded-xl transition-colors border border-gray-100">
                  <input type="checkbox" checked={equipment.includes(item)} onChange={() => toggleEquipment(item)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span>{item}</span>
                </label>
              ))}
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

function CancelView({ reservations, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [inputDeletePass, setInputDeletePass] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const results = reservations.filter(res => 
      res.status !== 'cancelled' && 
      ((res.phone && res.phone.includes(searchTerm)) || 
       (res.repName && res.repName.includes(searchTerm)) || 
       (res.name && res.name.includes(searchTerm)))
    );
    setFilteredResults(results);
  };

  const handleCancel = async (targetRes) => {
    if (!inputDeletePass) return alert("取消用パスワードを入力してください。");
    if (targetRes.deletePass !== inputDeletePass) return alert("パスワードが正しくありません。");

    if (window.confirm('この予約を取り消しますか？\n\n※注意：取り消しをおこなった場合でも、当月の【月間利用枠(20時間)】としてはカウントされ続けます。')) {
      try {
        await updateDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', targetRes.id), {
          status: 'cancelled'
        });
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
                  <div className="text-xs font-bold text-gray-500">{res.place} {res.courts ? `(${res.courts.join(', ')})` : ''} | {res.name}</div>
                  <div className="text-[10px] text-red-400 font-bold">責任者: {res.repName}</div>
                </div>
                <button onClick={() => handleCancel(res)} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                  <Trash2 className="h-6 w-6" />
                </button>
              </div>
            ))
          ) : searchTerm && (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <AlertTriangle className="h-10 w-10 mx-auto opacity-20" />
              <p className="font-bold">有効な予約が見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ reservations, closedDays, groups, onStatusUpdate }) {
  const [printWeekStart, setPrintWeekStart] = useState(formatDateStr(new Date()));
  const [showPrintView, setShowPrintView] = useState(false);
  
  const [closedStart, setClosedStart] = useState('');
  const [closedEnd, setClosedEnd] = useState('');
  const [closedReason, setClosedReason] = useState('');

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('external');

  // キャンセル処理（ペナルティの有無を選択）
  const cancelReservation = async (id, isHardDelete) => {
    if (isHardDelete) {
      if (window.confirm('この予約データを完全に削除しますか？\n（※利用者のペナルティ枠からも消去され、枠が戻ります）')) {
        await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id));
        onStatusUpdate();
      }
    } else {
      if (window.confirm('この予約を「キャンセル済」として処理しますか？\n（※月20時間の利用枠は消費したままになります）')) {
        await updateDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id), {
          status: 'cancelled'
        });
        onStatusUpdate();
      }
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      await addDoc(collection(db, 'artifacts', safeAppId, 'public', 'data', 'groups'), {
        name: newGroupName,
        type: newGroupType,
        createdAt: new Date().toISOString()
      });
      setNewGroupName('');
      onStatusUpdate();
    } catch (err) { alert("団体の追加に失敗しました"); }
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm('この団体を削除しますか？\n※既存の予約データには影響しませんが、新規予約時に選択できなくなります。')) {
      try {
        await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'groups', id));
        onStatusUpdate();
      } catch (err) { alert("削除に失敗しました"); }
    }
  };

  const launchEmailToReservedUsers = (targetDates) => {
    const reservedUsersInPeriod = reservations.filter(r => targetDates.includes(r.date) && r.email && r.status !== 'cancelled');
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
    const headers = ["ステータス", "利用日", "開始", "終了", "場所", "コート", "団体名", "代表者", "使用人数", "電話番号"];
    const rows = reservations.map(r => [
      r.status === 'cancelled' ? 'キャンセル済' : '有効',
      r.date, r.startTime, r.endTime, r.place, 
      r.courts ? r.courts.join(', ') : '-',
      r.name, r.repName, r.userCount || '-', r.phone
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.body.appendChild(document.createElement("a"));
    link.href = URL.createObjectURL(blob);
    link.download = `kaiteki_gym_reservations.csv`;
    link.click();
    document.body.removeChild(link);
  };

  const sortedReservations = [...reservations].sort((a,b)=>a.date.localeCompare(b.date));

  if (showPrintView) {
    return <WeeklyPrintView reservations={reservations} closedDays={closedDays} weekStartStr={printWeekStart} onBack={() => setShowPrintView(false)} />;
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto py-4 print:hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 pb-6 border-blue-100 gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center text-blue-950 tracking-tight">
            <ShieldCheck className="mr-3 h-10 w-10 text-blue-600"/> 管理者メニュー
          </h2>
          <p className="text-xs font-bold text-gray-500 mt-1">システムの設定とデータの出力を行います</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg active:scale-95 transition-all">
          <Download className="h-4 w-4" /><span>CSV出力(Excel用)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* 新機能：登録団体管理 */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-50 shadow-xl space-y-4 lg:col-span-2">
          <h3 className="font-bold text-lg flex items-center text-indigo-900"><Users className="h-5 w-5 mr-2" /> 利用団体の管理 (事前登録)</h3>
          
          <form onSubmit={handleAddGroup} className="flex flex-col sm:flex-row gap-2">
            <input type="text" required placeholder="新規団体名・個人名など" value={newGroupName} onChange={(e)=>setNewGroupName(e.target.value)} className="flex-1 border p-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" />
            <select value={newGroupType} onChange={(e)=>setNewGroupType(e.target.value)} className="border p-3 rounded-xl text-sm font-bold bg-white outline-none focus:border-indigo-500">
              <option value="external">一般・団体</option>
              <option value="employee">従業員</option>
              <option value="mcc">会社の部活 (MCC)</option>
            </select>
            <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg transition-all active:scale-95 whitespace-nowrap">追加</button>
          </form>

          <div className="pt-4 border-t border-indigo-50">
             <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
              {groups.map(g => (
                <div key={g.id} className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{g.name}</span>
                    <span className={`text-[10px] font-black w-fit px-2 py-0.5 rounded uppercase mt-1 ${g.type === 'mcc' ? 'bg-purple-100 text-purple-700' : g.type === 'employee' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {g.type === 'mcc' ? '会社の部活' : g.type === 'employee' ? '従業員' : '一般・団体'}
                    </span>
                  </div>
                  <button onClick={()=>handleDeleteGroup(g.id)} className="text-indigo-300 hover:text-red-600 p-2 transition-colors"><Trash2 className="h-4 w-4"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

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
            <div key={res.id} className={`bg-white p-6 rounded-3xl border shadow-md flex flex-col md:flex-row justify-between gap-4 transition-all ${res.status === 'cancelled' ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex-1 space-y-1">
                <div className="font-black text-xl">
                  {res.date} <span className="text-blue-600 ml-2">({res.startTime}-{res.endTime})</span>
                  {res.status === 'cancelled' && <span className="ml-3 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">キャンセル済（枠消費）</span>}
                </div>
                <div className="text-sm font-bold text-gray-600">{res.place} {res.courts ? `(${res.courts.join(', ')})` : ''} | {res.name}</div>
                <div className="text-xs text-gray-400 italic flex items-center gap-4">
                  <span>目的: {res.purpose}</span>
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {res.userCount}名</span>
                  <span>代表: {res.repName} ({res.phone})</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[120px]">
                <button onClick={()=>cancelReservation(res.id, false)} className="px-4 py-2 bg-yellow-50 text-yellow-700 font-bold text-xs hover:bg-yellow-100 rounded-xl transition-colors border border-yellow-200">取消(枠消費)</button>
                <button onClick={()=>cancelReservation(res.id, true)} className="px-4 py-2 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 rounded-xl transition-colors border border-red-200">完全削除(枠戻す)</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- 印刷用タイムラインビュー ---
function WeeklyPrintView({ reservations, closedDays, weekStartStr, onBack }) {
  const weekStart = new Date(weekStartStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return formatDateStr(d);
  });
  
  const courts = ['A', 'B', 'C', 'D', 'E', 'F'];
  const closedDateStrs = closedDays.map(cd => cd.date);
  const dayLabels = ['日','月','火','水','木','金','土'];

  // 印刷時に背景色と線を強制出力するためのCSS
  // @page { size: landscape; } を追加し、印刷ダイアログで最初から横向きになるように設定
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: landscape; margin: 10mm; }
      @media print { 
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
        body { background-color: white !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex justify-between items-center print:hidden bg-white p-6 rounded-2xl shadow-xl border-2 border-blue-100">
        <div className="flex items-center space-x-3">
          <Printer className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold">週間予定表 印刷プレビュー (タイムライン形式)</h3>
            <p className="text-xs text-gray-500 font-bold">自動的に横向きで印刷されます。</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button onClick={onBack} className="px-6 py-2 font-bold text-gray-500 border rounded-xl hover:bg-gray-50">管理画面に戻る</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">印刷する</button>
        </div>
      </div>

      <div className="bg-white p-4 min-h-[800px] font-sans print:p-0 print:min-h-0 print:shadow-none print:border-none">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold border-b-2 border-black inline-block px-10 pb-1 uppercase tracking-widest">KAITEKI体育館 週間利用予定表</h2>
          <p className="text-sm font-bold mt-2">期間: {weekDays[0]} 〜 {weekDays[6]}</p>
        </div>
        
        <table className="w-full table-fixed border-collapse border border-gray-800 text-[10px]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-800 p-1 w-[8%]">日付</th>
              <th className="border border-gray-800 p-1 w-[12%]">施設 / コート</th>
              {TIME_SLOTS.map(t => (
                <th key={t} className="border border-gray-800 p-0.5 font-mono text-[8px] sm:text-[9px]">
                  {t.replace(/^0/, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map(d => {
              const dateObj = new Date(d);
              const isClosed = closedDateStrs.includes(d);
              const dayLabel = `${d.split('-')[1]}/${d.split('-')[2]} (${dayLabels[dateObj.getDay()]})`;
              const dayColor = dateObj.getDay() === 0 ? 'text-red-600' : dateObj.getDay() === 6 ? 'text-blue-600' : 'text-gray-900';

              return (
                <React.Fragment key={d}>
                  {RESOURCES.map((res, rIndex) => {
                    return (
                      <tr key={`${d}-${res.id}`}>
                        {/* 日付セルを結合 */}
                        {rIndex === 0 && (
                          <td rowSpan={RESOURCES.length} className={`border border-gray-800 p-1 text-center font-bold bg-gray-50 ${dayColor} whitespace-nowrap`}>
                            {dayLabel}
                            {isClosed && <div className="text-[8px] text-red-500 mt-1 font-black">休館日</div>}
                          </td>
                        )}
                        <td className="border border-gray-800 p-1 font-bold bg-gray-50 text-gray-700 whitespace-nowrap text-center">
                          {res.id === '多目的室' ? res.name : `コート${res.id} `}
                          {res.id !== '多目的室' && <span className="text-[7px] text-gray-400">({['A','B','C'].includes(res.id) ? '入口' : '用具'})</span>}
                        </td>
                        
                        {/* タイムラインのセル */}
                        {(() => {
                          const cells = [];
                          let cIndex = 0;
                          while (cIndex < TIME_SLOTS.length) {
                            const start = TIME_SLOTS[cIndex];
                            const end = END_TIMES[cIndex];

                            if (isClosed) {
                              cells.push(<td key={start} className="border border-gray-400 bg-gray-200/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]"></td>);
                              cIndex++;
                              continue;
                            }

                            const matchingRes = reservations.find(r => {
                              if (r.date !== d || r.status === 'cancelled') return false;
                              if (!isTimeOverlapping(start, end, r.startTime, r.endTime)) return false;
                              if (res.type === '体育館' && r.place.includes('体育館') && r.courts && r.courts.includes(res.id)) return true;
                              if (res.type === '多目的室' && r.place.includes('多目的室')) return true;
                              return false;
                            });

                            if (matchingRes) {
                              // 連続するスロットをカウント
                              let span = 1;
                              let nextIndex = cIndex + 1;
                              while (nextIndex < TIME_SLOTS.length) {
                                const nextStart = TIME_SLOTS[nextIndex];
                                const nextEnd = END_TIMES[nextIndex];
                                if (isTimeOverlapping(nextStart, nextEnd, matchingRes.startTime, matchingRes.endTime)) {
                                  span++;
                                  nextIndex++;
                                } else {
                                  break;
                                }
                              }

                              const bgColor = matchingRes.userType === 'mcc' ? 'bg-purple-200' : matchingRes.userType === 'employee' ? 'bg-blue-200' : 'bg-green-200';
                              const borderColor = matchingRes.userType === 'mcc' ? 'border-purple-400' : matchingRes.userType === 'employee' ? 'border-blue-400' : 'border-green-400';
                              
                              cells.push(
                                <td key={start} colSpan={span} className={`border border-gray-800 ${bgColor} p-0 relative`}>
                                  <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden">
                                    <span className={`font-bold text-gray-800 leading-tight text-center break-words ${span > 1 ? 'text-[9px]' : 'text-[7px]'}`}>
                                      {matchingRes.name}
                                    </span>
                                  </div>
                                </td>
                              );
                              cIndex += span;
                            } else {
                              cells.push(<td key={start} className="border border-gray-300"></td>);
                              cIndex++;
                            }
                          }
                          return cells;
                        })()}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {/* 印刷用の凡例 */}
        <div className="mt-4 flex justify-between items-end text-[10px] font-bold text-gray-600">
          <div className="flex space-x-4">
            <span className="flex items-center"><span className="w-3 h-3 bg-purple-200 border border-purple-400 inline-block mr-1"></span>会社の部活</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-blue-200 border border-blue-400 inline-block mr-1"></span>従業員</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-green-200 border border-green-400 inline-block mr-1"></span>一般・団体</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-gray-200 border border-gray-400 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] inline-block mr-1"></span>休館</span>
          </div>
          <div>出力日時: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

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
                <div className="flex justify-between items-center text-xl"><span>土日・祝日</span><span className="bg-gray-900 text-white px-5 py-1.5 rounded-2xl shadow-xl font-mono">8:30 - 17:00</span></div>
              </div>
              <div className="pt-8 border-t-2 border-gray-100 space-y-4">
                <p className="text-base text-blue-600 font-black tracking-tighter leading-none">日曜日もご予約・ご利用いただけます。</p>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed font-bold">※お盆、正月、GWなど会社カレンダーによる休館日があります。休館日はカレンダーでご確認ください。</p>
              </div>
            </div>
          </section>
          <section>
            <h3 className="flex items-center text-blue-800 text-2xl mb-8 border-l-[10px] border-blue-700 pl-6 tracking-tight font-black">② 予約可能期間・制限</h3>
            <div className="bg-blue-50 p-8 rounded-[3rem] space-y-6 shadow-inner border-2 border-white">
              <p className="text-sm font-black text-blue-950 tracking-wide leading-none mb-4">利用者区分によって予約開始日が異なります。</p>
              
              <div className="bg-white p-4 rounded-2xl border-2 border-purple-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-black">会社の部活</span>
                  <span className="text-sm font-bold text-gray-800">次年度の3月末まで</span>
                </div>
                <p className="text-[10px] text-gray-500">現在から次年度の3月31日まで一括してご予約いただけます。</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-black">従業員</span>
                  <span className="text-sm font-bold text-gray-800">3ヶ月先まで予約可能</span>
                </div>
                <p className="text-[10px] text-gray-500">本日より3ヶ月先の同日までご予約いただけます。</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-black">一般・団体</span>
                  <span className="text-sm font-bold text-gray-800">2ヶ月先まで予約可能</span>
                </div>
                <p className="text-[10px] text-gray-500">本日より2ヶ月先の同日までご予約いただけます。</p>
              </div>
              
              <div className="mt-4 space-y-3 pt-4 border-t-2 border-blue-100/50">
                 <p className="text-xs font-black text-red-600 border-l-4 border-red-500 pl-2">【月間利用制限】 全団体共通：月20時間まで</p>
                 <p className="text-xs font-black text-red-600 border-l-4 border-red-500 pl-2">【全面予約制限】 体育館6面の全面予約は月1回まで</p>
                 <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                   <p className="text-[10px] text-red-800 font-bold leading-relaxed">
                     <AlertTriangle className="inline w-3 h-3 mr-1 mb-0.5"/>
                     キャンセルした場合も、ペナルティとして当月の利用可能枠（20時間）を消費します。計画的なご予約をお願いいたします。
                   </p>
                 </div>
              </div>
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