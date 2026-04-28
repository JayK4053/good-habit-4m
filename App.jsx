import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Settings2,
  Flame,
  Loader2,
  AlertCircle,
  Calendar
} from 'lucide-react';

// Firebase 라이브러리 임포트
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';

// --- Firebase 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyAs5UkQxfGw-d0cKqRXmOEbN05fu44u1kg",
  authDomain: "good-habit-4m.firebaseapp.com",
  projectId: "good-habit-4m",
  storageBucket: "good-habit-4m.firebasestorage.app",
  messagingSenderId: "959375616082",
  appId: "1:959375616082:web:cdd218f8e74c36edf7178b"
};

// 서비스 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'good-habit-4m-v1';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState({});
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('habit');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. 인증 처리
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          await signInAnonymously(auth);
        } else {
          setUser(currentUser);
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setError("인증에 실패했습니다. Firebase 콘솔에서 'Anonymous' 로그인을 켰는지 확인해주세요.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. 데이터 동기화
  useEffect(() => {
    if (!user) return;

    const habitsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'habits');
    const tasksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'logs');

    const unsubHabits = onSnapshot(habitsRef, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => setError("데이터를 가져올 수 없습니다: " + err.message));

    const unsubTasks = onSnapshot(tasksRef, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const data = {};
      snap.docs.forEach(d => data[d.id] = d.data().completedIds || []);
      setLogs(data);
    });

    return () => { unsubHabits(); unsubTasks(); unsubLogs(); };
  }, [user]);

  // 3. 기능 함수
  const addItem = async () => {
    if (!newItemName.trim() || !user) return;
    const colName = newItemType === 'habit' ? 'habits' : 'tasks';
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, colName), {
        title: newItemName,
        type: newItemType,
        createdAt: new Date().toISOString(),
        date: newItemType === 'task' ? todayStr : null
      });
      setNewItemName('');
    } catch (err) {
      setError("저장 실패: Firestore가 활성화되어 있는지 확인하세요.");
    }
  };

  const deleteItem = async (id, type) => {
    if (!user) return;
    const colName = type === 'habit' ? 'habits' : 'tasks';
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, id));
  };

  const toggleComplete = async (itemId) => {
    if (!user) return;
    const currentLogs = logs[todayStr] || [];
    const newLogs = currentLogs.includes(itemId) 
      ? currentLogs.filter(id => id !== itemId) 
      : [...currentLogs, itemId];
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', todayStr), { 
        completedIds: newLogs 
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // 4. 통계 및 필터링
  const stats = useMemo(() => {
    const todayLogs = logs[todayStr] || [];
    const activeTasks = tasks.filter(t => t.date === todayStr);
    const todayTotal = habits.length + activeTasks.length;
    const dailyRate = todayTotal > 0 ? Math.round((todayLogs.length / todayTotal) * 100) : 0;
    return { dailyRate, activeTasks };
  }, [logs, habits, tasks, todayStr]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mx-auto mb-4" />
        <p className="text-slate-500 font-medium font-sans">Good Habit 4M 불러오는 중...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm text-center border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800 mb-2">알림</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed font-sans">{error}</p>
        <button 
          onClick={() => { setError(null); window.location.reload(); }} 
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold"
        >
          다시 시작
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans max-w-md mx-auto relative shadow-2xl">
      <header className="p-6 bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-indigo-600 tracking-tight">Good Habit 4M</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Focus on your better life</p>
        </div>
        <div className="bg-orange-100 p-2.5 rounded-2xl">
          <Flame className="text-orange-500 w-5 h-5" />
        </div>
      </header>

      <main className="p-5 space-y-8">
        {activeTab === 'today' ? (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Today's Progress</p>
                  <h2 className="text-5xl font-black tracking-tighter">{stats.dailyRate}<span className="text-2xl ml-1 opacity-60">%</span></h2>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats.dailyRate}%` }} 
                />
              </div>
            </div>

            {/* 습관 섹션 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">My Routines</h3>
              </div>
              {habits.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-300 text-sm italic">
                  등록된 습관이 없습니다.
                </div>
              ) : (
                habits.map(h => (
                  <div key={h.id} onClick={() => toggleComplete(h.id)} className={`flex items-center justify-between p-5 mb-3 rounded-3xl border transition-all active:scale-95 cursor-pointer ${logs[todayStr]?.includes(h.id) ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className={`font-bold ${logs[todayStr]?.includes(h.id) ? 'line-through text-slate-300' : 'text-slate-700'}`}>{h.title}</span>
                    {logs[todayStr]?.includes(h.id) ? <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle2 className="text-white w-5 h-5" /></div> : <Circle className="text-slate-200 w-6 h-6" />}
                  </div>
                ))
              )}
            </section>

            {/* 오늘 할 일 섹션 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Today's Tasks</h3>
              </div>
              {stats.activeTasks.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-300 text-sm italic">
                  오늘 할 일이 없습니다.
                </div>
              ) : (
                stats.activeTasks.map(t => (
                  <div key={t.id} onClick={() => toggleComplete(t.id)} className={`flex items-center justify-between p-5 mb-3 rounded-3xl border transition-all active:scale-95 cursor-pointer ${logs[todayStr]?.includes(t.id) ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className={`font-bold ${logs[todayStr]?.includes(t.id) ? 'line-through text-slate-300' : 'text-slate-700'}`}>{t.title}</span>
                    {logs[todayStr]?.includes(t.id) ? <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle2 className="text-white w-5 h-5" /></div> : <Circle className="text-slate-200 w-6 h-6" />}
                  </div>
                ))
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <h3 className="font-black text-slate-800 mb-5 text-sm uppercase tracking-tight">Add New Goal</h3>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button onClick={() => setNewItemType('habit')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newItemType === 'habit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>매일 습관</button>
                <button onClick={() => setNewItemType('task')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newItemType === 'task' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>오늘 할 일</button>
              </div>
              <div className="flex gap-3">
                <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium" placeholder={newItemType === 'habit' ? "습관 입력..." : "할 일 입력..."} />
                <button onClick={addItem} className="bg-indigo-600 text-white px-6 rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={24} strokeWidth={3} /></button>
              </div>
            </div>

            <section>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Management</h3>
              {[...habits, ...tasks].reverse().map(item => (
                <div key={item.id} className="flex justify-between items-center p-5 mb-3 bg-white border border-slate-50 rounded-3xl shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-slate-700">{item.title}</div>
                    <div className={`text-[9px] font-black uppercase mt-1 px-2 py-0.5 rounded-md inline-block ${item.type === 'habit' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'}`}>{item.type}</div>
                  </div>
                  <button onClick={() => deleteItem(item.id, item.type)} className="p-3 text-slate-200 hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-5 pb-10 flex justify-around max-w-md mx-auto z-30 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'today' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <CheckCircle2 size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Today</span>
        </button>
        <button onClick={() => setActiveTab('manage')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'manage' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <Settings2 size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Settings</span>
        </button>
      </nav>
    </div>
  );
};

// 화면에 그리기 명령 (안전하게 처리)
const startApp = () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
};

if (document.readyState === 'complete') {
  startApp();
} else {
  window.addEventListener('load', startApp);
}

export default App;
