import { useEffect, useState } from 'react';
import Login from './login';
import { studentApi, gradeApi, authApi, notificationApi } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modal states
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userRoleToAdd, setUserRoleToAdd] = useState('student');
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showEditSubject, setShowEditSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [showEditGrade, setShowEditGrade] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      const promises = [
        studentApi.get('/'),
        gradeApi.get('/subjects'),
        gradeApi.get('/grades')
      ];
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      // Si admin, charger les enseignants
      if (currentUser?.role === 'admin') {
        promises.push(authApi.get('/users'));
      }
      
      const results = await Promise.all(promises);
      setStudents(results[0].data);
      setSubjects(results[1].data);
      setGrades(results[2].data);
      
      if (currentUser?.role === 'admin' && results[3]) {
        setTeachers(results[3].data.filter(u => u.role === 'teacher'));
      }

      if (currentUser?.role === 'student') {
        const studentProfile = results[0].data.find(s => s.email === currentUser.email);
        const notifId = studentProfile ? studentProfile._id : currentUser.id;
        
        try {
          const notifs = await notificationApi.get(`/notifications/${notifId}`);
          setNotifications(notifs.data);
        } catch (e) {
          console.error("Erreur chargement notifications", e);
        }
        
        if (studentProfile) {
          try {
             const studentGrades = await gradeApi.get(`/grades?student_id=${studentProfile._id}`);
             setGrades(studentGrades.data);
          } catch (e) {
             console.error("Erreur chargement notes", e);
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Decode user from auth or localStorage
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        localStorage.setItem('currentUser', JSON.stringify(payload));
      } catch(e) {}
      loadData();
    }
  }, []);

  if (!localStorage.getItem('token')) {
    return <Login onLogin={(u) => { 
      setUser(u); 
      localStorage.setItem('currentUser', JSON.stringify(u));
      loadData(); 
    }} />;
  }

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Si admin, il faut récupérer le nom du prof sélectionné
    if (user.role === 'admin' && data.teacher_id) {
        const teacher = teachers.find(t => t._id === data.teacher_id);
        if (teacher) data.teacher_name = teacher.name;
    }

    try {
      await gradeApi.post('/subjects', data);
      setShowAddSubject(false);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      // 1. Register in auth-service
      const res = await authApi.post('/register', {
        name: data.firstName ? `${data.firstName} ${data.lastName}` : data.name,
        email: data.email,
        password: data.password,
        role: userRoleToAdd
      });

      // 2. If student, create profile in student-service
      if (userRoleToAdd === 'student') {
        await studentApi.post('/', {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          level: data.level,
          registrationNumber: `STU-${Date.now()}`
        });
      }
      
      setShowAddUser(false);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteStudent = async (id) => {
    if(!window.confirm("Supprimer cet étudiant ?")) return;
    try {
      await studentApi.delete(`/${id}`);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  }

  const handleDeleteTeacher = async (id) => {
    if(!window.confirm("Supprimer ce professeur ?")) return;
    try {
      await authApi.delete(`/users/${id}`);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  }

  const handleAddGrade = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      await gradeApi.post('/grades', data);
      setShowAddGrade(false);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setSelectedSubjects(student.enrolledSubjects || []);
    setShowEditStudent(true);
  };
  
  const toggleSubject = (subId) => {
    const idStr = subId.toString();
    setSelectedSubjects(prev => 
      prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
    );
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.enrolledSubjects = selectedSubjects;
    
    try {
      await studentApi.put(`/${editingStudent._id}`, data);
      setShowEditStudent(false);
      setEditingStudent(null);
      loadData();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Supprimer cette matière ?')) return;
    try {
      await gradeApi.delete(`/subjects/${id}`);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const teacher = teachers.find(t => t._id === data.teacher_id);
    if (teacher) data.teacher_name = teacher.name;
    try {
      await gradeApi.put(`/subjects/${editingSubject.id}`, data);
      setShowEditSubject(false);
      setEditingSubject(null);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteGrade = async (id) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    try {
      await gradeApi.delete(`/grades/${id}`);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditGrade = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      await gradeApi.put(`/grades/${editingGrade.id}`, data);
      setShowEditGrade(false);
      setEditingGrade(null);
      loadData();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const studentProfile = user?.role === 'student' ? students.find(s => s.email === user?.email) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <span className="text-2xl font-extrabold text-slate-800 tracking-tight">EduConnect</span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">Menu Principal</p>
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Tableau de bord
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('teachers')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${activeTab === 'teachers' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <svg className={`w-5 h-5 ${activeTab === 'teachers' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Professeurs
              </button>
            )}
            {user?.role !== 'student' && (
              <button 
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${activeTab === 'students' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <svg className={`w-5 h-5 ${activeTab === 'students' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Étudiants
              </button>
            )}
            <button 
              onClick={() => setActiveTab('subjects')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${activeTab === 'subjects' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'subjects' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Matières
            </button>
            <button 
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all ${activeTab === 'grades' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'grades' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Notes
            </button>
          </nav>
        </div>

        <div className="p-4 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name || user?.email || 'Administrateur'}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user?.role === 'student' ? 'bg-green-100 text-green-700' : user?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {user?.role === 'student' ? 'Élève' : user?.role === 'admin' ? 'Admin' : 'Professeur'}
                </span>
              </p>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('currentUser'); window.location.reload(); }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
              title="Se déconnecter"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && "Tableau de bord"}
              {activeTab === 'teachers' && "Gestion des Professeurs"}
              {activeTab === 'students' && "Gestion des Étudiants"}
              {activeTab === 'subjects' && "Gestion des Matières"}
              {activeTab === 'grades' && "Gestion des Notes"}
            </h1>
          </div>
          <div className="flex gap-3">
            {activeTab === 'teachers' && user?.role === 'admin' && (
              <button onClick={() => {setUserRoleToAdd('teacher'); setShowAddUser(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow font-medium">
                + Nouveau Professeur
              </button>
            )}
            {activeTab === 'students' && user?.role === 'admin' && (
              <button onClick={() => {setUserRoleToAdd('student'); setShowAddUser(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow font-medium">
                + Nouvel Étudiant
              </button>
            )}
            {activeTab === 'subjects' && user?.role === 'admin' && (
              <button onClick={() => setShowAddSubject(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow font-medium">
                + Nouvelle Matière
              </button>
            )}
            {activeTab === 'grades' && (user?.role === 'admin' || user?.role === 'teacher') && (
              <button onClick={() => setShowAddGrade(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow font-medium">
                + Saisir une Note
              </button>
            )}
            
            <button onClick={loadData} className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl shadow-sm transition-all font-medium">
              Actualiser
            </button>
          </div>
        </header>

        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                  <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                 {user?.role !== 'student' && (
                   <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                     <p className="text-sm font-bold text-slate-400 uppercase">Total Étudiants</p>
                     <h3 className="text-4xl font-extrabold text-slate-800">{students.length}</h3>
                   </div>
                 )}
                 <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                   <p className="text-sm font-bold text-slate-400 uppercase">Matières Actives</p>
                   <h3 className="text-4xl font-extrabold text-slate-800">
                     {user?.role === 'student' && studentProfile
                       ? subjects.filter(sub => studentProfile.enrolledSubjects?.includes(sub.id.toString())).length
                       : user?.role === 'teacher'
                         ? subjects.filter(sub => sub.teacher_id === user.id).length
                         : subjects.length
                     }
                   </h3>
                 </div>
                 <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                   <p className="text-sm font-bold text-slate-400 uppercase">Notes Saisies</p>
                   <h3 className="text-4xl font-extrabold text-slate-800">{grades.length}</h3>
                 </div>
               </div>
            )}
            
            {activeTab === 'dashboard' && user?.role === 'student' && (
              <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm mb-10">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Vos Notifications
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                      {notifications.filter(n => !n.read).length} nouvelles
                    </span>
                  )}
                </h3>
                
                {notifications.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl">Vous n'avez aucune notification.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div key={n._id} className={`p-4 rounded-2xl border transition-all ${n.read ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50/50 border-indigo-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                          <p className={`text-sm ${n.read ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>{n.message}</p>
                          {!n.read && (
                            <button 
                              onClick={async () => {
                                await notificationApi.put(`/notifications/${n._id}/read`);
                                loadData();
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 px-3 py-1 rounded-lg shadow-sm hover:shadow"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && user?.role === 'admin' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-bold uppercase">
                      <th className="p-6">Nom</th>
                      <th className="p-6">Email</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map(t => (
                      <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-bold text-slate-800">{t.name}</td>
                        <td className="p-6 text-slate-600">{t.email}</td>
                        <td className="p-6 text-right">
                          <button onClick={() => handleDeleteTeacher(t._id)} className="text-red-600 font-medium text-sm">Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-bold uppercase">
                      <th className="p-6">Nom Complet</th>
                      <th className="p-6">Email</th>
                      <th className="p-6">Niveau</th>
                      <th className="p-6">Matières Assignées</th>
                      {user?.role === 'admin' && <th className="p-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(user?.role === 'teacher' ? students.filter(s => {
                      const teacherSubjects = subjects.filter(sub => sub.teacher_id === user.id);
                      return teacherSubjects.some(sub => 
                        s.enrolledSubjects?.includes(sub.id.toString())
                      );
                    }) : students).map(s => (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-bold text-slate-800">{s.firstName} {s.lastName} <br/><span className="text-xs font-normal text-slate-400">{s.registrationNumber}</span></td>
                        <td className="p-6 text-slate-600">{s.email}</td>
                        <td className="p-6"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{s.level}</span></td>
                        <td className="p-6">
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {(() => {
                              // All subjects the student is enrolled in
                              const studentSubs = subjects.filter(sub =>
                                s.enrolledSubjects?.includes(sub.id.toString())
                              );
                              // If teacher: only show subjects that belong to this teacher
                              const visibleSubs = user?.role === 'teacher'
                                ? studentSubs.filter(sub => sub.teacher_id === user.id)
                                : studentSubs;
                              return visibleSubs.length === 0
                                ? <span className="text-xs text-slate-400 italic">Aucune matière</span>
                                : visibleSubs.map(sub => (
                                    <div key={sub.id} className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-semibold">
                                      {sub.name}
                                    </div>
                                  ));
                            })()}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          {user?.role === 'admin' && (
                            <div className="flex justify-end gap-3">
                              <button onClick={() => openEditStudent(s)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Éditer</button>
                              <button onClick={() => handleDeleteStudent(s._id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Supprimer</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(user?.role === 'student' && studentProfile
                  ? subjects.filter(sub => studentProfile.enrolledSubjects?.includes(sub.id.toString()))
                  : user?.role === 'teacher'
                    ? subjects.filter(sub => sub.teacher_id === user.id)
                    : subjects
                ).map(sub => (
                  <div key={sub.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                    {sub.level && <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-indigo-100">{sub.level}</div>}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200">{sub.code}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{sub.name}</h3>
                    <p className="text-sm text-slate-500 mb-2">{sub.description}</p>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-bold uppercase">Professeur: <span className="text-indigo-600">{sub.teacher_name || 'Non assigné'}</span></p>
                      {user?.role === 'admin' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingSubject(sub); setShowEditSubject(true); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">Éditer</button>
                          <button onClick={() => handleDeleteSubject(sub.id)} className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition">Supprimer</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'grades' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-bold uppercase">
                      <th className="p-6">Matière</th>
                      <th className="p-6">Étudiant (ID)</th>
                      <th className="p-6">Note</th>
                      <th className="p-6">Semestre</th>
                      {(user?.role === 'admin' || user?.role === 'teacher') && <th className="p-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-bold text-slate-800">{g.subject?.name || g.subject_id}</td>
                        <td className="p-6 text-slate-600 text-sm">{g.student_id}</td>
                        <td className="p-6">
                          <span className={`font-extrabold px-3 py-1 rounded-full text-sm ${
                            g.value >= 10 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>{g.value} / 20</span>
                        </td>
                        <td className="p-6 text-slate-500 text-sm">{g.semester}</td>
                        {(user?.role === 'admin' || user?.role === 'teacher') && (
                          <td className="p-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setEditingGrade(g); setShowEditGrade(true); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition">Éditer</button>
                              <button onClick={() => handleDeleteGrade(g.id)} className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition">Supprimer</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Ajouter une Matière</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom de la matière</label><input required name="name" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Niveau Cible</label>
                <select required name="level" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="L1">Licence 1</option>
                  <option value="L2">Licence 2</option>
                  <option value="L3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                </select>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Code</label><input required name="code" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Description</label><textarea name="description" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Assigner un Professeur</label>
                <select required name="teacher_id" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="">Sélectionner...</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddSubject(false)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Ajouter un {userRoleToAdd === 'student' ? 'Étudiant' : 'Professeur'}</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              {userRoleToAdd === 'student' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Prénom</label><input required name="firstName" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom</label><input required name="lastName" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Niveau</label>
                    <select required name="level" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <option value="L1">Licence 1</option>
                      <option value="L2">Licence 2</option>
                      <option value="L3">Licence 3</option>
                      <option value="Master 1">Master 1</option>
                    </select>
                  </div>
                </>
              ) : (
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom Complet</label><input required name="name" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              )}
              
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input required type="email" name="email" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Mot de passe</label><input required type="password" name="password" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddGrade && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Saisir une Note</h2>
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Étudiant</label>
                <select 
                  required 
                  name="student_id" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  value={selectedStudentForGrade}
                  onChange={(e) => setSelectedStudentForGrade(e.target.value)}
                >
                  <option value="">Sélectionner un étudiant...</option>
                  {(user?.role === 'teacher'
                    ? students.filter(s => {
                        const teacherSubjects = subjects.filter(sub => sub.teacher_id === user.id);
                        return teacherSubjects.some(sub =>
                          s.enrolledSubjects?.includes(sub.id.toString())
                        );
                      })
                    : students
                  ).map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.level})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Matière</label>
                <select required name="subject_id" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="">Sélectionner une matière...</option>
                  {subjects.filter(sub => {
                    const isAllowedByRole = user?.role === 'admin' || sub.teacher_id === user?.id;
                    if (!isAllowedByRole) return false;
                    
                    if (!selectedStudentForGrade) return true; // Show all allowed if no student selected yet
                    const student = students.find(s => s._id === selectedStudentForGrade);
                    return student?.enrolledSubjects?.includes(sub.id.toString());
                  }).map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.level})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Note / 20</label>
                  <input required type="number" min="0" max="20" step="0.25" name="value" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Semestre</label>
                  <select required name="semester" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Commentaire (optionnel)</label>
                <input name="comment" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddGrade(false)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditStudent && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Éditer Étudiant</h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Prénom</label><input required defaultValue={editingStudent.firstName} name="firstName" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom</label><input required defaultValue={editingStudent.lastName} name="lastName" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input required defaultValue={editingStudent.email} name="email" type="email" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Niveau</label>
                <select required defaultValue={editingStudent.level} name="level" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="L1">Licence 1</option>
                  <option value="L2">Licence 2</option>
                  <option value="L3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                </select>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Assigner des matières (liées à un prof)</label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-40 overflow-y-auto">
                  {subjects.filter(s => s.teacher_id).length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Aucune matière avec professeur n'est disponible.</p>
                  ) : (
                    subjects.filter(s => s.teacher_id).map(sub => (
                      <label key={sub.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                        <input 
                          type="checkbox" 
                          checked={selectedSubjects.includes(sub.id.toString())}
                          onChange={() => toggleSubject(sub.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700">{sub.name}</span>
                        <span className="text-xs text-indigo-500 bg-indigo-50 px-1.5 rounded ml-auto">{sub.teacher_name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">* Si vous sélectionnez des matières ici, elles remplaceront l'assignation automatique par niveau.</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => {setShowEditStudent(false); setEditingStudent(null);}} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditSubject && editingSubject && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Éditer Matière</h2>
            <form onSubmit={handleEditSubject} className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Nom</label><input required defaultValue={editingSubject.name} name="name" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Code</label><input required defaultValue={editingSubject.code} name="code" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Niveau</label>
                <select defaultValue={editingSubject.level} name="level" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="L1">Licence 1</option>
                  <option value="L2">Licence 2</option>
                  <option value="L3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                </select>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Description</label><textarea defaultValue={editingSubject.description} name="description" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Professeur Assigné</label>
                <select required name="teacher_id" defaultValue={editingSubject.teacher_id} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditSubject(false); setEditingSubject(null); }} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditGrade && editingGrade && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Modifier la Note</h2>
            <form onSubmit={handleEditGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Matière</label>
                <p className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-medium">{editingGrade.subject?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Note / 20</label>
                <input required type="number" min="0" max="20" step="0.25" defaultValue={editingGrade.value} name="value" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Semestre</label>
                <select required name="semester" defaultValue={editingGrade.semester} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Commentaire</label>
                <textarea defaultValue={editingGrade.comment} name="comment" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditGrade(false); setEditingGrade(null); }} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}