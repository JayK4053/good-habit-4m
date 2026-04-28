import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  BarChart3, 
  Settings2,
  Calendar,
  Flame,
  Loader2
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

// --- [매우 중요] 본인의 Firebase 설정값으로 교체하세요 ---
// Firebase Console에서 프로젝트 생성 후 발급받은 값을 여기에 넣어야 데이터가 저장됩니다.
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
const customAppId = 'good-habit-4m-v1';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('habit');

  const todayStr = new Date().toISOString().split('T')[0];

  // 익명 로그인 설정
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("로그인 실패:", err);
        }
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 실시간 데이터 동기화
  useEffect(() => {
    if (!user) return;
    
    // 습관 목록 가져오기
    const habitsRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'habits');
    const unsubHabits = onSnapshot(habitsRef, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 오늘 할 일 목록 가져오기
    const tasksRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 완료 로그 가져오기
    const logsRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'logs');
    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const data = {};
      snap.docs.forEach(d => data[d.id] = d.data().completedIds || []);
      setLogs(data);
    });

    return () => { unsubHabits(); unsubTasks(); unsubLogs(); };
  }, [user]);

  // 새로운 항목 추가
  const addItem = async () => {
    if (!newItemName.trim() || !user) return;
    const colName = newItemType === 'habit' ? 'habits' : 'tasks';
    await addDoc(collection(db, 'artifacts', customAppId, 'users', user.uid, colName), {
      title: newItemName,
      type: newItemType,
      createdAt: new Date().toISOString(),
      date: newItemType === 'task' ? todayStr : null
    });
    setNewItemName('');
  };

  // 항목 삭제
  const deleteItem = async (id, type) => {
    const colName = type === 'habit' ? 'habits' : 'tasks';
    await deleteDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, colName, id));
  };

  // 완료 체크 토글
  const toggleComplete = async (itemId) => {
    const currentLogs = logs[todayStr] || [];
    const newLogs = currentLogs.includes(itemId) 
      ? currentLogs.filter(id => id !== itemId) 
      : [...currentLogs, itemId];
    await setDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, 'logs', todayStr), { completedIds: newLogs });
  };

  // 통계 계산
  const stats = useMemo(() => {
    const todayLogs = logs[todayStr] || [];
    const todayTotal = habits.length + tasks.filter(t => t.date === todayStr).length;
    const dailyRate = todayTotal > 0 ? Math.round((todayLogs.length / todayTotal) * 100) : 0;
    return { dailyRate };
  }, [logs, habits, tasks, todayStr]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans max-w-md mx-auto">
      <header className="p-6 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">Good Habit 4M</h1>
        <div className="bg-orange-100 p-2 rounded-full">
          <Flame className="text-orange-500 w-5 h-5" />
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'today' && (
          <div className="space-y-6">
            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100">
              <p className="text-sm opacity-80 mb-1">오늘의 달성률</p>
              <h2 className="text-4xl font-bold">{stats.dailyRate}%</h2>
              <div className="mt-4 w-full bg-indigo-400/30 h-2 rounded-full overflow-hidden">
                <div className="bg-white h-full transition-all duration-700" style={{ width: `${stats.dailyRate}%` }} />
              </div>
            </div>

            <section>
              <h3 className="text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">My Routines</h3>
              {habits.map(h => (
                <div 
                  key={h.id} 
                  onClick={() => toggleComplete(h.id)} 
                  className={`flex items-center justify-between p-5 mb-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                    logs[todayStr]?.includes(h.id) ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <span className={`font-medium ${logs[todayStr]?.includes(h.id) ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {h.title}
                  </span>
                  {logs[todayStr]?.includes(h.id) 
                    ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> 
                    : <Circle className="text-slate-200 w-6 h-6" />
                  }
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-center py-10 text-slate-300 text-sm italic">습관을 등록해보세요.</p>
              )}
            </section>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">새로운 목표 추가</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button 
                  onClick={() => setNewItemType('habit')} 
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newItemType === 'habit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >매일 습관</button>
                <button 
                  onClick={() => setNewItemType('task')} 
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newItemType === 'task' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >오늘 할 일</button>
              </div>
              <div className="flex gap-2">
                <input 
                  value={newItemName} 
                  onChange={(e) => setNewItemName(e.target.value)} 
                  className="flex-1 bg-slate-50 border-none p-3 rounded-xl outline-none text-sm" 
                  placeholder={newItemType === 'habit' ? "예: 물 2L 마시기" : "예: 독서하기"} 
                />
                <button onClick={addItem} className="bg-indigo-600 text-white px-4 rounded-xl shadow-lg shadow-indigo-100 active:scale-90 transition-all">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <section>
              <h3 className="text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">List Management</h3>
              {[...habits, ...tasks].map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 mb-2 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{item.title}</div>
                    <div className="text-[10px] text-indigo-500 font-bold uppercase mt-0.5">{item.type}</div>
                  </div>
                  <button onClick={() => deleteItem(item.id, item.type)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 pb-8 flex justify-around max-w-md mx-auto shadow-2xl">
        <button 
          onClick={() => setActiveTab('today')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'today' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
        >
          <CheckCircle2 size={24} />
          <span className="text-[10px] font-bold">Today</span>
        </button>
        <button 
          onClick={() => setActiveTab('manage')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'manage' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
        >
          <Settings2 size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
