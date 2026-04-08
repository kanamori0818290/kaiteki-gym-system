import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckSquare, Info, XCircle, Plus, Trash2, Users, Building, MapPin, Clock, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

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

// appId にスラッシュが含まれていると Firestore のパスエラーになるためサニタイズ（安全化）します
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const safeAppId = String(rawAppId).replace(/\//g, '-');

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

// ユーティリティ関数
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();
const formatDateStr = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// --- メインコンポーネント ---
export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [toastMessage, setToastMessage] = useState(null);
  const [preSelectedDate, setPreSelectedDate] = useState('');
  
  // Firebaseの状態管理
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Firebase認証の初期化
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("認証エラー:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 予約データのリアルタイム取得 (Firestoreから)
  useEffect(() => {
    if (!user) return;

    // パスを安全な配列形式で指定して Invalid collection reference エラーを防ぐ
    const reservationsRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations');
    
    const unsubscribe = onSnapshot(reservationsRef, 
      (snapshot) => {
        const fetchedReservations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReservations(fetchedReservations);
        setIsLoading(false);
      },
      (error) => {
        console.error("データ取得エラー:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGoToReserve = (dateStr) => {
    setPreSelectedDate(dateStr);
    setActiveTab('reserve');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* ヘッダー */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <Building className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold tracking-wider">KAITEKI体育館 予約システム</h1>
              <p className="text-xs text-blue-200">三菱ケミカル株式会社 / ダイヤリックス株式会社</p>
            </div>
          </div>
          <nav className="flex space-x-1 bg-blue-900/50 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
            <TabButton icon={<Calendar />} label="予約状況" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabButton icon={<FileText />} label="新規予約" isActive={activeTab === 'reserve'} onClick={() => { setActiveTab('reserve'); setPreSelectedDate(''); }} />
            <TabButton icon={<XCircle />} label="確認・取消" isActive={activeTab === 'cancel'} onClick={() => setActiveTab('cancel')} />
            <TabButton icon={<Info />} label="利用ルール" isActive={activeTab === 'rules'} onClick={() => setActiveTab('rules')} />
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-75 z-10">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'calendar' && <CalendarView reservations={reservations} onReserveClick={handleGoToReserve} />}
            {activeTab === 'reserve' && <ReservationForm 
              initialDate={preSelectedDate} 
              reservations={reservations} 
              user={user}
              onSuccess={() => { showToast('予約の申し込みを受け付けました。'); setActiveTab('calendar'); }} 
            />}
            {activeTab === 'cancel' && <CancelView 
              reservations={reservations} 
              onSuccess={() => showToast('予約をキャンセルしました。')} 
            />}
            {activeTab === 'rules' && <RulesView />}
          </div>
        )}
      </main>

      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-bounce z-50">
          <CheckSquare className="h-5 w-5" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// --- タブボタン ---
function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
        ${isActive ? 'bg-white text-blue-800 shadow-sm' : 'text-blue-100 hover:bg-blue-700 hover:text-white'}`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4' })}
      <span>{label}</span>
    </button>
  );
}

// --- 1. カレンダービュー (日別空き状況確認) ---
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <CalendarDays className="mr-2 h-6 w-6 text-blue-600"/> 予約状況カレンダー
        </h2>
        <div className="flex space-x-4 text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>承認済</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>申請中</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <button onClick={handlePrevMonth} className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"><ChevronLeft className="h-5 w-5"/></button>
            <span className="font-bold text-xl">{currentYear}年 {currentMonth}月</span>
            <button onClick={handleNextMonth} className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"><ChevronRight className="h-5 w-5"/></button>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-gray-500 text-sm mb-2">
              <div className="text-red-500">日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div className="text-blue-500">土</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanks.map(blank => <div key={`blank-${blank}`} className="p-2"></div>)}
              {days.map(day => {
                const dateStr = formatDateStr(currentYear, currentMonth, day);
                const dayReservations = reservations.filter(res => res.date === dateStr);
                const hasApproved = dayReservations.some(res => res.status === 'approved');
                const hasPending = dayReservations.some(res => res.status === 'pending');
                const isSelected = dateStr === selectedDateStr;
                const isHoliday = new Date(currentYear, currentMonth - 1, day).getDay() === 0;
                const isSaturday = new Date(currentYear, currentMonth - 1, day).getDay() === 6;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`min-h-[4rem] p-1 border rounded-lg flex flex-col items-center justify-start transition-all
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'}
                    `}
                  >
                    <span className={`text-sm font-semibold mb-1 
                      ${isSelected ? 'text-blue-700' : ''}
                      ${!isSelected && isHoliday ? 'text-red-500' : ''}
                      ${!isSelected && isSaturday ? 'text-blue-500' : ''}
                    `}>
                      {day}
                    </span>
                    <div className="flex space-x-1 mt-auto pb-1">
                      {hasApproved && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      {hasPending && <span className="w-2 h-2 rounded-full bg-yellow-400"></span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 bg-blue-800 text-white border-b border-gray-200 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-lg">
              {new Date(selectedDateStr).getMonth() + 1}月{new Date(selectedDateStr).getDate()}日 ({['日','月','火','水','木','金','土'][new Date(selectedDateStr).getDay()]})
            </h3>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            {selectedDayReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDayReservations.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(res => (
                  <div key={res.id} className="border-l-4 border-blue-500 bg-gray-50 p-3 rounded-r-md">
                    <div className="text-sm font-bold text-gray-800 mb-1">{res.startTime} - {res.endTime}</div>
                    <div className="text-sm font-medium text-blue-700 flex items-center"><MapPin className="h-3 w-3 mr-1"/> {res.place}</div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="text-xs text-gray-600">{res.name} ({res.repName})</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {res.status === 'approved' ? '承認済' : '申請中'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                <CheckSquare className="h-10 w-10 mb-2 opacity-50" />
                <p>この日の予約はまだありません。</p>
                <p className="text-sm">終日空いています。</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button 
              onClick={() => onReserveClick(selectedDateStr)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FileText className="h-4 w-4 mr-2" /> この日で新規予約する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 2. 新規予約フォーム ---
function ReservationForm({ initialDate, reservations, user, onSuccess }) {
  const [userType, setUserType] = useState('external');
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [formData, setFormData] = useState({
    name: '', repName: '', email: '', phone: '', startTime: '', endTime: '', place: '', purpose: ''
  });
  const [members, setMembers] = useState([{ name: '', address: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = () => setMembers([...members, { name: '', address: '' }]);
  const handleRemoveMember = (index) => {
    if (members.length > 1) setMembers(members.filter((_, i) => i !== index));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Firebaseへのデータ保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("通信エラーが発生しました。ページをリロードしてください。");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const reservationsRef = collection(db, 'artifacts', safeAppId, 'public', 'data', 'reservations');
      await addDoc(reservationsRef, {
        date: selectedDate,
        userType: userType,
        ...formData,
        members: members,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user.uid
      });
      
      onSuccess();
    } catch (error) {
      console.error("予約の保存に失敗しました:", error);
      alert("予約の保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dailyReservations = reservations.filter(res => res.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <FileText className="mr-2 h-6 w-6 text-blue-600"/> 施設利用申し込み
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center"><Users className="mr-2 h-5 w-5 text-blue-600"/> 基本情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">利用者区分 <span className="text-red-500">*</span></label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded-md hover:bg-gray-50 flex-1 sm:flex-none">
                  <input type="radio" name="userType" value="employee" checked={userType === 'employee'} onChange={() => setUserType('employee')} className="text-blue-600 focus:ring-blue-500 h-4 w-4" />
                  <span className="text-sm font-medium">従業員（家族含む）</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-2 border rounded-md hover:bg-gray-50 flex-1 sm:flex-none">
                  <input type="radio" name="userType" value="external" checked={userType === 'external'} onChange={() => setUserType('external')} className="text-blue-600 focus:ring-blue-500 h-4 w-4" />
                  <span className="text-sm font-medium">従業員以外（社外団体など）</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用団体名 <span className="text-red-500">*</span></label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例: ピックルボール富山" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用責任者（代表者） <span className="text-red-500">*</span></label>
                <input type="text" name="repName" required value={formData.repName} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例: 金森" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">連絡先メールアドレス <span className="text-red-500">*</span></label>
                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="example@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">緊急連絡先（電話番号） <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="090-XXXX-XXXX" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center"><MapPin className="mr-2 h-5 w-5 text-blue-600"/> 利用日時・場所</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用日 <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  required 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border font-bold text-lg" 
                />
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始時間 <span className="text-red-500">*</span></label>
                  <input type="time" name="startTime" required value={formData.startTime} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" />
                </div>
                <span className="mb-2 font-bold">〜</span>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了時間 <span className="text-red-500">*</span></label>
                  <input type="time" name="endTime" required value={formData.endTime} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">利用場所 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {['体育館（1面）', '体育館（2面）', '体育館（3面）', '多目的室'].map(place => (
                    <label key={place} className="border rounded-md p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                      <input type="radio" name="place" value={place} onChange={handleInputChange} className="mb-2 text-blue-600" required />
                      <span className="text-sm font-medium">{place}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用目的 <span className="text-red-500">*</span></label>
                <input type="text" name="purpose" required value={formData.purpose} onChange={handleInputChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" placeholder="例: フレッシュテニスのため" />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center border-b pb-2">
                <Info className="h-5 w-5 mr-2 text-blue-500"/>
                {selectedDate ? `${new Date(selectedDate).getMonth()+1}月${new Date(selectedDate).getDate()}日の空き状況` : '日付を選択して空き状況を確認'}
              </h4>
              
              {selectedDate ? (
                <div className="flex-1 overflow-y-auto">
                  {dailyReservations.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 mb-2">以下の時間・場所は既に予約が入っています。これ以外の時間帯をご指定ください。</p>
                      {dailyReservations.map(res => (
                        <div key={res.id} className="bg-white border border-red-200 rounded-md p-2 flex justify-between items-center shadow-sm">
                          <div>
                            <div className="font-bold text-red-700 text-sm">{res.startTime} - {res.endTime}</div>
                            <div className="text-xs text-gray-600">{res.place}</div>
                          </div>
                          <span className="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded">予約不可</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="font-bold text-green-700">現在のところ予約はありません。</p>
                      <p className="text-sm text-gray-600 mt-1">すべてのお時間・場所をご予約いただけます。</p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <strong>利用可能時間:</strong><br/>
                    平日: 8:30～21:00 (最終受付20:30)<br/>
                    休日: 8:30～17:00 (最終受付16:30)
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4 text-center">
                  左のフォームで利用日を選択すると、その日の予約済み時間帯が表示されます。
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-blue-600"/> 貸出備品・名簿</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">利用備品（複数選択可）</label>
              <div className="space-y-2 bg-gray-50 p-4 rounded-md border">
                <p className="text-sm font-bold text-gray-700">全利用者貸出可能</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {equipmentForAll.map(eq => (
                    <label key={eq} className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm">{eq}</span>
                    </label>
                  ))}
                </div>
                
                <p className="text-sm font-bold text-gray-700 pt-2 border-t border-gray-200">従業員および家族のみ貸出可能</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {equipmentForEmployeesOnly.map(eq => (
                    <label key={eq} className={`flex items-center space-x-2 ${userType !== 'employee' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={userType !== 'employee'} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm">{eq}</span>
                    </label>
                  ))}
                </div>
                {userType !== 'employee' && (
                  <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">※「従業員以外」を選択中のため、これらの用品は借りられません。ご持参をお願いします。</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">利用者名簿 <span className="text-red-500">*</span></label>
                <button type="button" onClick={handleAddMember} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 flex items-center transition-colors">
                  <Plus className="h-4 w-4 mr-1"/> 行を追加
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3 bg-yellow-50 p-2 rounded border border-yellow-100">
                入館時には必ず氏名の記載が必要です（見学者含む）。住所は町名まで入力してください。
              </p>
              
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div key={index} className="flex space-x-2 items-center">
                    <span className="text-gray-400 text-sm w-4 text-right">{index + 1}.</span>
                    <input type="text" placeholder="氏名" required 
                      value={member.name} 
                      onChange={(e) => {
                        const newMembers = [...members];
                        newMembers[index].name = e.target.value;
                        setMembers(newMembers);
                      }} 
                      className="flex-1 border-gray-300 rounded-md shadow-sm p-2 border text-sm focus:ring-blue-500 focus:border-blue-500" />
                    <input type="text" placeholder="住所（町名まで）" 
                      value={member.address} 
                      onChange={(e) => {
                        const newMembers = [...members];
                        newMembers[index].address = e.target.value;
                        setMembers(newMembers);
                      }}
                      className="flex-2 w-1/2 border-gray-300 rounded-md shadow-sm p-2 border text-sm focus:ring-blue-500 focus:border-blue-500" />
                    <button type="button" onClick={() => handleRemoveMember(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors" disabled={members.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end border-t pt-6">
          <button type="submit" disabled={isSubmitting} className={`text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}>
            {isSubmitting ? <span className="flex items-center"><Loader2 className="h-5 w-5 mr-2 animate-spin"/> 送信中...</span> : 'この内容で予約を申し込む'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- 3. 確認・キャンセルビュー ---
function CancelView({ reservations, onSuccess }) {
  const [searchState, setSearchState] = useState('initial'); // initial, found
  const [searchName, setSearchName] = useState('');
  const [foundReservations, setFoundReservations] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const results = reservations.filter(res => res.repName.includes(searchName));
    if (results.length > 0) {
      setFoundReservations(results);
      setSearchState('found');
    } else {
      setErrorMsg('入力された代表者名の予約は見つかりませんでした。');
    }
  };

  const handleCancel = async (id) => {
    if(window.confirm('本当にこの予約をキャンセルしますか？')) {
      setIsDeleting(true);
      try {
        const docRef = doc(db, 'artifacts', safeAppId, 'public', 'data', 'reservations', id);
        await deleteDoc(docRef);
        
        onSuccess();
        
        const remaining = foundReservations.filter(res => res.id !== id);
        setFoundReservations(remaining);
        
        if (remaining.length === 0) {
          setSearchState('initial');
          setSearchName('');
        }
      } catch (error) {
        console.error("削除エラー:", error);
        alert("キャンセルの処理に失敗しました。");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <XCircle className="mr-2 h-6 w-6 text-blue-600"/> 予約の確認・キャンセル
      </h2>

      {searchState === 'initial' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-4">予約時の代表者名を入力してください。</p>
          <form onSubmit={handleSearch} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">代表者名</label>
              <input 
                type="text" 
                required 
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500 text-lg" 
                placeholder="例: 金森" 
              />
            </div>
            {errorMsg && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded">{errorMsg}</p>}
            <button type="submit" className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-gray-900 transition-colors shadow-sm">
              予約を検索する
            </button>
          </form>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-md flex items-start border border-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-bold">キャンセルに関する注意事項</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>社外の方は、利用日の<strong>3日前まで</strong>にキャンセル手続きを行ってください。</li>
                <li>土日祝、平日夜間の直前キャンセルは体育館管理人（080-7896-2363）へ直接ご連絡ください。</li>
                <li>無断キャンセルが続く場合は、以後の貸し出しをお断りすることがあります。</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">「{searchName}」様の予約一覧</h3>
            <button onClick={() => setSearchState('initial')} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors">
              別の名前で再検索
            </button>
          </div>

          {foundReservations.sort((a,b) => new Date(a.date) - new Date(b.date)).map(res => (
            <div key={res.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h3 className="text-lg font-bold flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-500"/>
                  {new Date(res.date).toLocaleDateString('ja-JP')} の予約
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${res.status === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {res.status === 'approved' ? '承認済' : '申請中'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="text-gray-500 text-xs block mb-1">利用日時</span>
                  <span className="font-bold text-lg">{res.startTime} - {res.endTime}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="text-gray-500 text-xs block mb-1">利用場所</span>
                  <span className="font-bold text-lg">{res.place}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-100 md:col-span-2">
                  <span className="text-gray-500 text-xs block mb-1">利用団体名</span>
                  <span className="font-bold">{res.name}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => handleCancel(res.id)} disabled={isDeleting} className={`px-6 py-2 rounded-lg font-bold transition-colors border-2 ${isDeleting ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-red-500 text-red-600 hover:bg-red-50'}`}>
                  {isDeleting ? '処理中...' : 'この予約をキャンセルする'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 4. 利用ルールビュー ---
function RulesView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Info className="mr-2 h-6 w-6 text-blue-600"/> KAITEKI体育館 貸出運用ルール
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800 flex items-center"><Clock className="h-5 w-5 mr-2"/> ① 利用時間・休館日</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-bold text-gray-700 bg-gray-50 p-1 rounded inline-block mb-1">【開館時間帯】</h4>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>平日　８：３０～２１：００（２０：３０最終受付）</li>
                <li>休日　８：３０～１７：００（１６：３０最終受付）</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-700 bg-gray-50 p-1 rounded inline-block mb-1">【休館日】</h4>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li className="font-bold text-red-600">毎月第１・第３日曜日</li>
                <li className="text-gray-500 text-xs mt-2">※お盆、正月、GWなどの大型連休時は、原則会社カレンダーに準ずる。<br/>※会社都合で休館（予約キャンセル）となる場合があります。</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800 flex items-center"><Calendar className="h-5 w-5 mr-2"/> ② 申込・予約期間</h3>
          <div className="space-y-2 text-sm">
            <p>システムより所定の項目を入力しお申し込みください。</p>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-3">
              <h4 className="font-bold mb-2 text-center text-blue-800">３か月ごとに予約を受付</h4>
              <table className="w-full text-xs text-left bg-white rounded border overflow-hidden">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-700">
                    <th className="p-2">受付開始日</th>
                    <th className="p-2">予約可能対象月</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-bold text-blue-600">12月1日～</td><td className="p-2">翌年 1月～3月末</td></tr>
                  <tr className="border-b"><td className="p-2 font-bold text-blue-600">3月1日～</td><td className="p-2">4月～6月末</td></tr>
                  <tr className="border-b"><td className="p-2 font-bold text-blue-600">6月1日～</td><td className="p-2">7月～9月末</td></tr>
                  <tr><td className="p-2 font-bold text-blue-600">9月1日～</td><td className="p-2">10月～12月末</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
          <h3 className="text-lg font-bold border-b pb-2 mb-4 text-blue-800 flex items-center"><AlertTriangle className="h-5 w-5 mr-2"/> ③ ご利用時の遵守事項（抜粋）</h3>
          <ul className="list-decimal ml-5 space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border">
            <li><strong>受付・名簿:</strong> 体育館ご利用時は必ず事前または入館時にシステム上で名簿（団体名、所属、氏名等の記載）を提出願います。</li>
            <li><strong>飲食:</strong> 館内はすべて飲み物可。食事は指定場所（2階の休憩スペース、多目的室）のみ可とし、アリーナ内での食事は禁止です。</li>
            <li><strong>清掃:</strong> 終了後は、使用した用具類は元の場所に戻し、モップ掛けを行ってください。ゴミは各自必ず持ち帰ってください。</li>
            <li><strong>駐車場:</strong> 体育館の駐車場は正面・裏・北側にあります。路上駐車は厳禁です。構内は時速20km制限です。</li>
            <li><strong>騒音防止:</strong> 騒音の発生（カーステレオ、クラクション等）にご注意ください。</li>
            <li><strong>施設損傷:</strong> 施設、器具等を破損した場合、速やかに体育館管理人に報告してください。故意・過失を問わず実費弁償を求める場合があります。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}