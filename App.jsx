import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client'; // 추가: React를 화면에 그리기 위한 도구
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Settings2,
  Flame,
  Loader2,
  AlertCircle
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
const customAppId = 'good-habit-4m-v1';

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
        setError("Firebase 인증 실패. 익명 로그인이 활성화되어 있는지 확인해주세요.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const habitsRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'habits');
    const unsubHabits = onSnapshot(habitsRef, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Firestore Error:", err);
      setError("데이터를 불러올 수 없습니다. Firestore 규칙이 '테스트 모드'인지 확인하세요.");
    });

    const tasksRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const logsRef = collection(db, 'artifacts', customAppId, 'users', user.uid, 'logs');
    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const data = {};
      snap.docs.forEach(d => data[d.id] = d.data().completedIds || []);
      setLogs(data);
    });

    return () => { unsubHabits(); unsubTasks(); unsubLogs(); };
  }, [user]);

  const addItem = async () => {
    if (!newItemName.trim() || !user) return;
    const colName = newItemType === 'habit' ? 'habits' : 'tasks';
    try {
      await addDoc(collection(db, 'artifacts', customAppId, 'users', user.uid, colName), {
        title: newItemName,
        type: newItemType,
        createdAt: new Date().toISOString(),
        date: newItemType === 'task' ? todayStr : null
      });
      setNewItemName('');
    } catch (err) {
      setError("추가 실패: " + err.message);
    }
  };

  const deleteItem = async (id, type) => {
    const colName = type === 'habit' ? 'habits' : 'tasks';
    await deleteDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, colName, id));
  };

  const toggleComplete = async (itemId) => {
    const currentLogs = logs[todayStr] || [];
    const newLogs = currentLogs.includes(itemId) 
      ? currentLogs.filter(id => id !== itemId) 
      : [...currentLogs, itemId];
    await setDoc(doc(db, 'artifacts', customAppId, 'users', user.uid, 'logs', todayStr), { completedIds: newLogs });
  };

  const stats = useMemo(() => {
    const todayLogs = logs[todayStr] || [];
    const todayTotal = habits.length + tasks.filter(t => t.date === todayStr).length;
    return { dailyRate: todayTotal > 0 ? Math.round((todayLogs.length / todayTotal) * 100) : 0 };
  }, [logs, habits, tasks, todayStr]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mx-auto mb-4" />
        <p className="text-slate-500">서버 연결 중...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white p-6 rounded-2xl shadow-xl text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-sm text-slate-600 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold">다시 시도</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 max-w-md mx-auto shadow-inner">
      <header className="p-6 bg-white border-b sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">Good Habit 4M</h1>
        <div className="bg-orange-100 p-2 rounded-full"><Flame className="text-orange-500 w-5" /></div>
      </header>

      <main className="p-4">
        {activeTab === 'today' ? (
          <div className="space-y-6">
            <div className="bg-indigo-600 p-8 rounded-3xl text-white">
              <p className="text-sm opacity-80">오늘의 달성률</p>
              <h2 className="text-4xl font-bold">{stats.dailyRate}%</h2>
            </div>
            <section>
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase">My Routines</h3>
              {habits.map(h => (
                <div key={h.id} onClick={() => toggleComplete(h.id)} className={`flex items-center justify-between p-5 mb-3 rounded-2xl border ${logs[todayStr]?.includes(h.id) ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                  <span className={logs[todayStr]?.includes(h.id) ? 'line-through text-slate-400' : ''}>{h.title}</span>
                  {logs[todayStr]?.includes(h.id) ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-slate-200" />}
                </div>
              ))}
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border">
              <h3 className="font-bold text-sm mb-4">새 목표 추가</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => setNewItemType('habit')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${newItemType === 'habit' ? 'bg-white shadow-sm' : ''}`}>습관</button>
                <button onClick={() => setNewItemType('task')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${newItemType === 'task' ? 'bg-white shadow-sm' : ''}`}>할 일</button>
              </div>
              <div className="flex gap-2">
                <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1 bg-slate-50 p-3 rounded-xl outline-none" placeholder="입력하세요..." />
                <button onClick={addItem} className="bg-indigo-600 text-white px-4 rounded-xl"><Plus /></button>
              </div>
            </div>
            <section>
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase">Manage List</h3>
              {[...habits, ...tasks].map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 mb-2 bg-white border rounded-xl">
                  <span className="text-sm">{item.title}</span>
                  <button onClick={() => deleteItem(item.id, item.type)} className="text-slate-300"><Trash2 size={18} /></button>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-8 flex justify-around max-w-md mx-auto">
        <button onClick={() => setActiveTab('today')} className={activeTab === 'today' ? 'text-indigo-600' : 'text-slate-300'}><CheckCircle2 size={28} /></button>
        <button onClick={() => setActiveTab('manage')} className={activeTab === 'manage' ? 'text-indigo-600' : 'text-slate-300'}><Settings2 size={28} /></button>
      </nav>
    </div>
  );
};

// --- 추가된 부분: 실제 화면에 그리기 ---
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

export default App;
