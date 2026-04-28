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
  Calendar as CalendarIcon,
  BarChart3,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Target
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';

// --- Firebase Configuration (Provided by User) ---
const firebaseConfig = {
  apiKey: "AIzaSyAs5UkQxfGw-d0cKqRXmOEbN05fu44u1kg",
  authDomain: "good-habit-4m.firebaseapp.com",
  projectId: "good-habit-4m",
  storageBucket: "good-habit-4m.firebasestorage.app",
  messagingSenderId: "959375616082",
  appId: "1:959375616082:web:cdd218f8e74c36edf7178b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'good-habit-4m-v2'; // Version 2

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // today, todo, stats, settings
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState({});
  
  const [newInput, setNewInput] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

  // 1. Authentication
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
        setError("인증 실패: Firebase 설정을 확인하세요.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Data Sync
  useEffect(() => {
    if (!user) return;

    const userPath = `artifacts/${appId}/users/${user.uid}`;
    
    const unsubHabits = onSnapshot(collection(db, userPath, 'habits'), (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTasks = onSnapshot(collection(db, userPath, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLogs = onSnapshot(collection(db, userPath, 'logs'), (snap) => {
      const data = {};
      snap.docs.forEach(d => data[d.id] = d.data().completedIds || []);
      setLogs(data);
    });

    return () => { unsubHabits(); unsubTasks(); unsubLogs(); };
  }, [user]);

  // 3. Logic & Handlers
  const toggleComplete = async (itemId, date = selectedDate) => {
    if (!user) return;
    const currentDayLogs = logs[date] || [];
    const newLogs = currentDayLogs.includes(itemId) 
      ? currentDayLogs.filter(id => id !== itemId) 
      : [...currentDayLogs, itemId];
    
    await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/logs`, date), { 
      completedIds: newLogs 
    }, { merge: true });
  };

  const addHabit = async (title) => {
    if (!title.trim()) return;
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/habits`), {
      title,
      createdAt: new Date().toISOString()
    });
  };

  const addTask = async (title, date) => {
    if (!title.trim()) return;
    await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/tasks`), {
      title,
      dueDate: date,
      completed: false
    });
  };

  const deleteItem = async (id, type) => {
    const col = type === 'habit' ? 'habits' : 'tasks';
    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/${col}`, id));
  };

  // 4. Statistics Calculation
  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = -15; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const currentDayStats = useMemo(() => {
    const dayLogs = logs[selectedDate] || [];
    const dayHabitsCount = habits.length;
    const rate = dayHabitsCount > 0 ? Math.round((habits.filter(h => dayLogs.includes(h.id)).length / dayHabitsCount) * 100) : 0;
    
    // Sort habits: uncompleted first
    const sortedHabits = [...habits].sort((a, b) => {
      const aDone = dayLogs.includes(a.id);
      const bDone = dayLogs.includes(b.id);
      return aDone === bDone ? 0 : aDone ? 1 : -1;
    });

    const todayTasks = tasks.filter(t => t.dueDate === selectedDate);

    return { rate, sortedHabits, todayTasks };
  }, [habits, tasks, logs, selectedDate]);

  // Statistics Tab Data
  const weeklyStats = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().split('T')[0];
      const l = logs[ds] || [];
      const r = habits.length > 0 ? Math.round((habits.filter(h => l.includes(h.id)).length / habits.length) * 100) : 0;
      return { day: d.toLocaleDateString('ko-KR', { weekday: 'narrow' }), rate: r };
    });
  }, [logs, habits]);

  // UI Helper
  const TabButton = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
    >
      <div className={`p-2 rounded-xl ${activeTab === id ? 'bg-indigo-50' : ''}`}>
        <Icon size={24} strokeWidth={activeTab === id ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 font-sans max-w-md mx-auto relative shadow-2xl overflow-x-hidden">
      
      {/* Header */}
      <header className="p-6 bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-indigo-600 tracking-tighter">Good Habit 4M</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{activeTab}</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-orange-100 p-2 rounded-xl"><Flame className="text-orange-500 w-4 h-4" /></div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Horizontal Calendar */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
              {dateRange.map(date => {
                const d = new Date(date);
                const isSelected = selectedDate === date;
                const isToday = new Date().toISOString().split('T')[0] === date;
                return (
                  <button 
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 w-14 py-3 rounded-2xl flex flex-col items-center transition-all ${
                      isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : isToday ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-white text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase mb-1">{d.toLocaleDateString('ko-KR', { weekday: 'narrow' })}</span>
                    <span className="text-lg font-black">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Achievement Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Habit Achievement</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-5xl font-black tracking-tighter">{currentDayStats.rate}</h2>
                  <span className="text-2xl font-bold opacity-60">%</span>
                </div>
                <div className="mt-4 w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-white h-full transition-all duration-700 ease-out" style={{ width: `${currentDayStats.rate}%` }} />
                </div>
              </div>
              <Trophy className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
            </div>

            {/* Routines List */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">My Routines</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{habits.length} Items</span>
              </div>
              <div className="space-y-3">
                {currentDayStats.sortedHabits.map(h => {
                  const done = (logs[selectedDate] || []).includes(h.id);
                  return (
                    <div 
                      key={h.id} 
                      onClick={() => toggleComplete(h.id)}
                      className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all active:scale-95 cursor-pointer ${
                        done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-50 shadow-sm hover:border-indigo-100'
                      }`}
                    >
                      <span className={`font-bold transition-all ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{h.title}</span>
                      {done ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <Circle className="text-slate-200 w-6 h-6" />}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Today's Tasks */}
            <section>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Today's Tasks</h3>
              </div>
              <div className="space-y-3">
                {currentDayStats.todayTasks.map(t => {
                  const done = (logs[selectedDate] || []).includes(t.id);
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => toggleComplete(t.id)}
                      className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold ${done ? 'line-through text-slate-300' : 'text-slate-700'}`}>{t.title}</span>
                        <span className="text-[9px] font-bold text-orange-500 uppercase mt-0.5 flex items-center gap-1">
                            <Target size={10} /> Schedule Task
                        </span>
                      </div>
                      {done ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <Circle className="text-slate-200 w-6 h-6" />}
                    </div>
                  );
                })}
                {currentDayStats.todayTasks.length === 0 && <p className="text-center py-6 text-slate-300 text-xs italic">일정된 할 일이 없습니다.</p>}
              </div>
            </section>
          </div>
        )}

        {/* TODO TAB */}
        {activeTab === 'todo' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50">
              <h3 className="font-black text-slate-800 mb-4 text-xs uppercase tracking-tight">Add Future Task</h3>
              <div className="space-y-3">
                <input 
                  type="text"
                  value={newInput.title} 
                  onChange={(e) => setNewInput({...newInput, title: e.target.value})} 
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium" 
                  placeholder="무엇을 해야 하나요?" 
                />
                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={newInput.date} 
                    onChange={(e) => setNewInput({...newInput, date: e.target.value})} 
                    className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-xs font-bold text-slate-500" 
                  />
                  <button 
                    onClick={() => { addTask(newInput.title, newInput.date); setNewInput({ ...newInput, title: '' }); }}
                    className="bg-indigo-600 text-white px-6 rounded-2xl shadow-lg active:scale-90 transition-all font-bold"
                  >추가</button>
                </div>
              </div>
            </div>

            <section>
              <h3 className="text-xs font-black text-slate-400 mb-4 tracking-widest uppercase px-1">Upcoming Tasks</h3>
              <div className="space-y-3">
                {[...tasks].sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(t => (
                  <div key={t.id} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-3xl group">
                    <div>
                      <div className="font-bold text-slate-700">{t.title}</div>
                      <div className="text-[10px] font-bold text-indigo-500 mt-1 flex items-center gap-1">
                        <CalendarIcon size={12} /> {t.dueDate}
                      </div>
                    </div>
                    <button onClick={() => deleteItem(t.id, 'task')} className="text-slate-200 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                  <BarChart3 className="mx-auto mb-2 text-indigo-500" size={24} />
                  <div className="text-2xl font-black text-slate-800">{habits.length}</div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Active Habits</p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={24} />
                  <div className="text-2xl font-black text-slate-800">
                    {Object.values(logs).reduce((acc, curr) => acc + curr.length, 0)}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Completed</p>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500" /> Weekly Trends
              </h3>
              <div className="flex items-end justify-between h-32 px-2">
                {weeklyStats.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full flex justify-center">
                      <div 
                        className="w-3 bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ height: `${Math.max(s.rate, 5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{s.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
                <h4 className="font-bold text-indigo-800 text-sm mb-2">오늘의 한마디</h4>
                <p className="text-xs text-indigo-600/80 leading-relaxed">
                    "습관은 제2의 천성이다." 꾸준함이 비범함을 만듭니다. 오늘도 고생하셨어요!
                </p>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-4 text-xs uppercase tracking-tight">New Habit Routine</h3>
                <div className="flex gap-2">
                    <input 
                        id="habitInput"
                        type="text"
                        className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none text-sm font-medium" 
                        placeholder="매일 반복할 습관 이름..." 
                    />
                    <button 
                        onClick={() => {
                            const input = document.getElementById('habitInput');
                            addHabit(input.value);
                            input.value = '';
                        }}
                        className="bg-indigo-600 text-white px-5 rounded-2xl font-bold"
                    >추가</button>
                </div>
            </div>

            <section>
                <h3 className="text-xs font-black text-slate-400 mb-4 tracking-widest uppercase px-1">Habit List</h3>
                <div className="space-y-3">
                    {habits.map(h => (
                        <div key={h.id} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-3xl">
                            <span className="font-bold text-slate-700">{h.title}</span>
                            <button onClick={() => deleteItem(h.id, 'habit')} className="text-slate-200 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </section>

            <div className="p-4 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">User ID: {user?.uid}</p>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-5 pb-10 flex justify-around max-w-md mx-auto z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        <TabButton id="today" icon={CheckCircle2} label="Today" />
        <TabButton id="todo" icon={ListTodo} label="To Do" />
        <TabButton id="stats" icon={BarChart3} label="Stats" />
        <TabButton id="settings" icon={Settings2} label="Settings" />
      </nav>
    </div>
  );
};

// Start the App
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
