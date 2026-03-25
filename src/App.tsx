/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Settings, 
  Search, 
  HelpCircle, 
  Plus, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Wind, 
  Moon, 
  Footprints,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  AlertTriangle,
  X,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  LogOut,
  LogIn,
  User as UserIcon,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Firebase ---
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType, loginWithEmail, signupWithEmail } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Chart.js Registration ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Types ---
type Page = 'dashboard' | 'patients' | 'reports' | 'alerts' | 'settings' | 'add-patient' | 'profile';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  ward: string;
  room: string;
  lastCheck: string;
  heartRate: number;
  spo2: number;
  sleepScore: number;
  steps: number;
  status: 'Stable' | 'Critical' | 'Monitoring';
  diagnosis: string;
  physician: string;
  admissionDate: string;
  bloodType: string;
  medications: Medication[];
  notes?: string;
  vitalsHistory?: { timestamp: string, heartRate: number, spo2: number }[];
  createdBy?: string;
}

interface Medication {
  name: string;
  dosage: string;
  schedule: string;
  time: string;
  status: 'Taken' | 'Scheduled' | 'Inactive';
}

interface Report {
  id: string;
  name: string;
  date: string;
  type: 'Institutional' | 'Clinical' | 'Compliance';
}

interface Alert {
  id: string;
  patientName: string;
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
  time: string;
  timestamp: Date;
}

// --- Mock Data ---
const MOCK_PATIENTS: Patient[] = [
  {
    id: 'P-1024',
    name: 'Sunita Sharma',
    age: 42,
    gender: 'Female',
    ward: 'Ward 4B',
    room: '12',
    lastCheck: '12 mins ago',
    heartRate: 78,
    spo2: 98,
    sleepScore: 88,
    steps: 4200,
    status: 'Stable',
    diagnosis: 'Post-Op Recovery',
    physician: 'Dr. Anil Verma',
    admissionDate: '2023-10-20',
    bloodType: 'A+',
    medications: [
      { name: 'Amoxicillin', dosage: '500mg', schedule: 'Twice daily • After meals', time: '09:00 AM', status: 'Taken' },
      { name: 'Warfarin', dosage: '5mg', schedule: 'Once daily • Evening', time: '08:00 PM', status: 'Scheduled' },
      { name: 'Ibuprofen', dosage: '200mg', schedule: 'As needed • Pain relief', time: 'PRN', status: 'Inactive' },
    ]
  },
  {
    id: 'P-1025',
    name: 'Rajesh Kumar',
    age: 67,
    gender: 'Male',
    ward: 'ICU',
    room: '04',
    lastCheck: '2 mins ago',
    heartRate: 112,
    spo2: 91,
    sleepScore: 45,
    steps: 120,
    status: 'Critical',
    diagnosis: 'Acute Myocardial Infarction',
    physician: 'Dr. Meera Reddy',
    admissionDate: '2023-10-24',
    bloodType: 'O-',
    medications: []
  },
  {
    id: 'P-1026',
    name: 'Priya Nair',
    age: 29,
    gender: 'Female',
    ward: 'Ward 4B',
    room: '08',
    lastCheck: '45 mins ago',
    heartRate: 64,
    spo2: 99,
    sleepScore: 92,
    steps: 8400,
    status: 'Monitoring',
    diagnosis: 'Observation',
    physician: 'Dr. Anil Verma',
    admissionDate: '2023-10-25',
    bloodType: 'B+',
    medications: []
  },
  {
    id: 'P-1027',
    name: 'Arjun Mehta',
    age: 55,
    gender: 'Male',
    ward: 'Ward 4B',
    room: '21',
    lastCheck: '1 hour ago',
    heartRate: 72,
    spo2: 97,
    sleepScore: 76,
    steps: 3100,
    status: 'Stable',
    diagnosis: 'Type 2 Diabetes Management',
    physician: 'Dr. Meera Reddy',
    admissionDate: '2023-10-22',
    bloodType: 'A-',
    medications: []
  },
  {
    id: 'P-1028',
    name: 'Vikram Singh',
    age: 81,
    gender: 'Male',
    ward: 'ICU',
    room: '02',
    lastCheck: 'Just now',
    heartRate: 88,
    spo2: 89,
    sleepScore: 32,
    steps: 50,
    status: 'Critical',
    diagnosis: 'Respiratory Failure',
    physician: 'Dr. Anil Verma',
    admissionDate: '2023-10-26',
    bloodType: 'AB+',
    medications: []
  },
  {
    id: 'P-1029',
    name: 'Anita Desai',
    age: 34,
    gender: 'Female',
    ward: 'Ward 4B',
    room: '15',
    lastCheck: '15 mins ago',
    heartRate: 72,
    spo2: 99,
    sleepScore: 85,
    steps: 5600,
    status: 'Stable',
    diagnosis: 'Asthma Management',
    physician: 'Dr. Anil Verma',
    admissionDate: '2023-10-27',
    bloodType: 'O+',
    medications: []
  },
  {
    id: 'P-1030',
    name: 'Suresh Raina',
    age: 48,
    gender: 'Male',
    ward: 'ICU',
    room: '05',
    lastCheck: '5 mins ago',
    heartRate: 95,
    spo2: 92,
    sleepScore: 52,
    steps: 300,
    status: 'Critical',
    diagnosis: 'Congestive Heart Failure',
    physician: 'Dr. Meera Reddy',
    admissionDate: '2023-10-28',
    bloodType: 'B-',
    medications: []
  },
  {
    id: 'P-1031',
    name: 'Karan Johar',
    age: 51,
    gender: 'Male',
    ward: 'Ward 4B',
    room: '18',
    lastCheck: '30 mins ago',
    heartRate: 82,
    spo2: 96,
    sleepScore: 70,
    steps: 2500,
    status: 'Stable',
    diagnosis: 'Hypertension',
    physician: 'Dr. Anil Verma',
    admissionDate: '2023-10-29',
    bloodType: 'A+',
    medications: []
  },
  {
    id: 'P-1032',
    name: 'Deepika Padukone',
    age: 38,
    gender: 'Female',
    ward: 'Ward 4B',
    room: '22',
    lastCheck: '10 mins ago',
    heartRate: 68,
    spo2: 98,
    sleepScore: 90,
    steps: 7200,
    status: 'Stable',
    diagnosis: 'Post-Op Observation',
    physician: 'Dr. Meera Reddy',
    admissionDate: '2023-10-30',
    bloodType: 'O-',
    medications: []
  },
];

const MOCK_ALERTS: Alert[] = [
  { id: 'A-1', patientName: 'Rajesh Kumar', severity: 'Critical', message: 'Heart rate exceeded 110 bpm', time: '2 mins ago', timestamp: new Date() },
  { id: 'A-2', patientName: 'Vikram Singh', severity: 'Critical', message: 'SpO2 levels dropped below 90%', time: 'Just now', timestamp: new Date() },
  { id: 'A-3', patientName: 'Arjun Mehta', severity: 'Warning', message: 'Blood pressure elevated', time: '15 mins ago', timestamp: new Date() },
  { id: 'A-4', patientName: 'Sunita Sharma', severity: 'Info', message: 'Scheduled medication taken', time: '1 hour ago', timestamp: new Date() },
];

const MOCK_REPORTS: Report[] = [
  { id: 'R-001', name: 'Monthly Patient Outcome Summary', date: 'Oct 24, 2023', type: 'Institutional' },
  { id: 'R-002', name: 'Cardiology Unit Daily Vitals', date: 'Oct 26, 2023', type: 'Clinical' },
  { id: 'R-003', name: 'Medication Adherence Audit', date: 'Oct 26, 2023', type: 'Compliance' },
];

// --- Components ---

const Sidebar = ({ activePage, setActivePage, onEmergency }: { 
  activePage: Page, 
  setActivePage: (p: Page) => void,
  onEmergency: () => void
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
  <aside className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-gray-200">

    {/* Logo */}
    <div className="px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
          <Activity size={22} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 tracking-wide">
            MEDICAL CENTER
          </h2>
          <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">
            Critical Care Unit
          </p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-3 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id as Page)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200
              ${isActive
                ? "bg-blue-50 text-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Icon size={18} className={isActive ? "text-blue-600" : ""} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>

    {/* Bottom Section */}
    <div className="px-4 pb-6 space-y-4">

      {/* Emergency Button */}
      <button
        onClick={onEmergency}
        className="w-full py-3 rounded-lg bg-red-600 text-white text-xs font-semibold tracking-widest uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-red-700 transition"
      >
        <AlertTriangle size={14} />
        Emergency Alert
      </button>

      {/* Soft Divider */}
      <div className="h-px bg-gray-100"></div>

      {/* Footer */}
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-gray-400">
        <p>© 2026 • Clinical Precision</p>
        <p className="mt-2 text-gray-400">Developed by Tarunaditya Kumar</p>
      </div>

    </div>

  </aside>
);
    
};

const TopBar = ({ title, searchQuery, setSearchQuery, onLogout, userAvatar, userName, setActivePage }: { title: string, searchQuery: string, setSearchQuery: (s: string) => void, onLogout: () => void, userAvatar: string, userName: string, setActivePage: (p: Page) => void }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="w-full h-16 border-b border-outline-variant/15 bg-surface-container-lowest flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-lg font-bold text-primary tracking-tight">{title}</h1>
        <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/10 w-full max-w-md">
          <Search size={16} className="text-on-surface-variant mr-2" />
          <input 
            type="text" 
            placeholder="Search patients, records or vitals..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm text-on-surface w-full placeholder:text-on-surface-variant/50"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <Bell size={20} />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <HelpCircle size={20} />
          </button>
        </div>
        <div className="h-8 w-px bg-outline-variant/20 mx-2"></div>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 hover:bg-surface-container-low p-1 rounded-lg transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-on-surface">{userName || 'Doctor'}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Attending Physician</p>
            </div>
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-surface-container-lowest shadow-sm bg-surface-container-low">
              <img 
                src={userAvatar} 
                alt="Doctor Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)}
                ></div>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/15 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-outline-variant/10">
                    <p className="text-sm font-bold text-on-surface">{userName || 'Doctor'}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Attending Physician</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        setActivePage('profile');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                    >
                      <Users size={16} />
                      <span>View Profile</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActivePage('settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                    >
                      <Settings size={16} />
                      <span>Account Settings</span>
                    </button>
                    <div className="h-px bg-outline-variant/10 my-1"></div>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error hover:bg-error/5 rounded-lg transition-colors"
                    >
                      <X size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

// --- Views ---

const DashboardView = ({ setActivePage, patients, setSelectedPatient, darkMode }: { 
  setActivePage: (p: Page) => void, 
  patients: Patient[],
  setSelectedPatient: (p: Patient | null) => void,
  darkMode: boolean
}) => {
  const [liveHeartRate, setLiveHeartRate] = useState([72, 75, 82, 78, 85, 90, 82, 78, 80, 82, 85, 82]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveHeartRate(prev => {
        const next = [...prev.slice(1), 75 + Math.floor(Math.random() * 15)];
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const avgSpo2 = Math.round(patients.reduce((acc, p) => acc + p.spo2, 0) / (patients.length || 1));
    const avgSleep = Math.round(patients.reduce((acc, p) => acc + p.sleepScore, 0) / (patients.length || 1));
    const totalSteps = patients.reduce((acc, p) => acc + p.steps, 0);
    const avgSteps = Math.round(totalSteps / (patients.length || 1));

    return [
      { label: 'Heart Rate', value: liveHeartRate[liveHeartRate.length - 1], unit: 'bpm', icon: Heart, color: 'text-primary', chartColor: darkMode ? '#4285F4' : '#004ac6' },
      { label: 'Blood Oxygen', value: avgSpo2, unit: '%', icon: Wind, color: 'text-secondary', chartColor: darkMode ? '#34A853' : '#006c49' },
      { label: 'Sleep Score', value: avgSleep, unit: '/ 100', icon: Moon, color: 'text-tertiary', chartColor: darkMode ? '#FBBC04' : '#943700' },
      { label: 'Steps Today', value: totalSteps.toLocaleString(), unit: '', icon: Footprints, color: 'text-on-surface-variant', chartColor: darkMode ? '#94a3b8' : '#64748b' },
    ];
  }, [patients, liveHeartRate, darkMode]);

  const chartData = {
    labels: Array.from({ length: 12 }, (_, i) => `${i * 2}h`),
    datasets: [
      {
        label: 'Heart Rate',
        data: liveHeartRate,
        borderColor: darkMode ? '#4285F4' : '#004ac6',
        backgroundColor: darkMode ? 'rgba(66, 133, 244, 0.2)' : 'rgba(0, 74, 198, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        enabled: true,
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        titleColor: darkMode ? '#ffffff' : '#1e293b',
        bodyColor: darkMode ? '#cbd5e1' : '#64748b',
        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
      } 
    },
    layout: {
      padding: {
        bottom: 5
      }
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex gap-8">
        <div className="flex-1 space-y-8">
          {/* Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-surface-container-low p-5 rounded-xl border border-transparent hover:border-primary/10 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">{stat.label}</span>
                  <stat.icon className={cn(stat.color, "w-5 h-5")} />
                </div>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-black text-on-surface">{stat.value}</h3>
                  <span className="text-xs text-on-surface-variant font-medium">{stat.unit}</span>
                </div>
                <div className="mt-4 h-10 w-full opacity-50">
                  <Line 
                    data={{
                      labels: [1, 2, 3, 4, 5, 6, 7],
                      datasets: [{ data: [65, 59, 80, 81, 56, 55, 40], borderColor: stat.chartColor, tension: 0.4, pointRadius: 0 }]
                    }} 
                    options={chartOptions} 
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Real-Time Chart */}
          <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">Real-Time Heart Rate</h2>
                <p className="text-sm text-on-surface-variant">Monitoring Ward A-12 | Active Telemetry</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">Live</span>
                <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-[10px] font-bold rounded-full uppercase">Last 24h</span>
              </div>
            </div>
            <div className="h-64 w-full">
              <Line data={chartData} options={{
                ...chartOptions,
                scales: {
                  x: { 
                    grid: { display: false }, 
                    ticks: { 
                      font: { size: 10 },
                      color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                    } 
                  },
                  y: { 
                    grid: { 
                      color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                    }, 
                    ticks: { 
                      font: { size: 10 },
                      color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                    } 
                  }
                }
              }} />
            </div>
          </section>

          {/* Recent Patients */}
          <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-on-surface">Recent Patients</h2>
              <button 
                onClick={() => setActivePage('patients')}
                className="text-primary text-xs font-bold hover:underline"
              >
                View All Patients
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Age</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Last Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {patients.slice(0, 3).map((patient) => (
                    <tr 
                      key={patient.id} 
                      onClick={() => {
                        setSelectedPatient(patient);
                        setActivePage('patients');
                      }}
                      className="hover:bg-surface-container-low/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{patient.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{patient.age}</td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          patient.status === 'Stable' ? "bg-secondary-container text-on-secondary-container" :
                          patient.status === 'Critical' ? "bg-error-container text-on-error-container" :
                          "bg-primary-fixed text-on-primary-fixed"
                        )}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant text-right">{patient.lastCheck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Panel */}
        <aside className="hidden xl:flex flex-col w-80 space-y-8">
          <section className="bg-primary text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-6">Quick Vitals Summary</h2>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-60">Avg System SpO2</p>
                <p className="text-4xl font-black">
                  {(patients.reduce((acc, p) => acc + p.spo2, 0) / (patients.length || 1)).toFixed(1)}
                  <span className="text-xl opacity-60">%</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-3 rounded-lg">
                  <p className="text-[9px] font-bold uppercase opacity-70 mb-1">Critical</p>
                  <p className="text-xl font-bold">{patients.filter(p => p.status === 'Critical').length.toString().padStart(2, '0')}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg">
                  <p className="text-[9px] font-bold uppercase opacity-70 mb-1">Stable</p>
                  <p className="text-xl font-bold">{patients.filter(p => p.status === 'Stable').length.toString().padStart(2, '0')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low p-6 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Today's Schedule</h2>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">4 TOTAL</span>
            </div>
            <div className="space-y-4">
              {[
                { time: '09:00', title: 'Ward Round A', desc: 'Intensive Care Unit' },
                { time: '10:30', title: 'Patient Transfer', desc: 'Radiology Dept.' },
                { time: '13:00', title: 'Staff Briefing', desc: 'Conference Room B' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-on-surface">{item.time}</span>
                    <div className="w-px flex-1 bg-outline-variant/20 my-1 group-last:hidden"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[10px] text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-low/40 backdrop-blur-md p-6 rounded-xl border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-primary w-5 h-5" />
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest">Security Status</h3>
            </div>
            <p className="text-[10px] leading-relaxed text-on-surface-variant mb-4">
              All patient data is encrypted using hospital-grade AES-256 protocols. Your session is monitored for compliance.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter">Encrypted Connection</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const PatientsView = ({ 
  patients, 
  selectedPatient, 
  setSelectedPatient, 
  searchQuery, 
  addNotification,
  onDeletePatient,
  onUpdatePatient,
  isAdmin
}: {
  patients: Patient[],
  selectedPatient: Patient | null,
  setSelectedPatient: (p: Patient | null) => void,
  searchQuery: string,
  addNotification: (m: string, t?: 'info' | 'error' | 'success') => void,
  onDeletePatient: (id: string) => Promise<void>,
  onUpdatePatient: (id: string, data: Partial<Patient>) => Promise<void>,
  isAdmin: boolean
}) => {
  const [filter, setFilter] = useState('All');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  const handleSaveNotes = async () => {
    if (!selectedPatient) return;
    try {
      await onUpdatePatient(selectedPatient.id, { notes: editedNotes });
      setSelectedPatient({ ...selectedPatient, notes: editedNotes });
      setIsEditingNotes(false);
      addNotification("Notes updated successfully", "success");
    } catch (error) {
      addNotification("Failed to update notes", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeletePatient(id);
      setSelectedPatient(null);
      addNotification("Patient record deleted", "success");
    } catch (error) {
      addNotification("Failed to delete patient record", "error");
    }
  };

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (filter !== 'All') {
      result = result.filter(p => p.status === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q)
      );
    }
    return result;
  }, [patients, filter, searchQuery]);

  return (
    <div className="flex h-full overflow-hidden">
      <section className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">Patient Directory</h2>
              <p className="text-sm text-on-surface-variant">Active monitoring for Ward 4B and ICU.</p>
            </div>
            <div className="flex bg-surface-container-low p-1 rounded-lg self-start sm:self-auto">
              {['All', 'Stable', 'Critical', 'Monitoring'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded transition-all",
                    filter === f ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/15">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Age</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Ward</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Last Check</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Heart Rate</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">SpO2</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    onClick={() => setSelectedPatient(patient)}
                    className={cn(
                      "group hover:bg-surface-container-low cursor-pointer transition-colors",
                      selectedPatient?.id === patient.id && "bg-surface-container-low"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-on-surface">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{patient.age}</td>
                    <td className="px-6 py-4 text-sm font-medium text-on-surface">{patient.ward} - {patient.room}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{patient.lastCheck}</td>
                    <td className="px-6 py-4 font-mono text-sm text-on-surface">
                      <span className={cn(patient.heartRate > 100 && "text-error font-bold")}>{patient.heartRate}</span>
                      <span className="text-[10px] text-on-surface-variant ml-1">bpm</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-on-surface">
                      <span className={cn(patient.spo2 < 92 && "text-error font-bold")}>{patient.spo2}</span>
                      <span className="text-[10px] text-on-surface-variant ml-1">%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        patient.status === 'Stable' ? "bg-secondary-container text-on-secondary-container" :
                        patient.status === 'Critical' ? "bg-error-container text-on-error-container" :
                        "bg-primary-fixed text-on-primary-fixed"
                      )}>
                        {patient.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedPatient && (
          <motion.aside 
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[420px] bg-surface-container-lowest border-l border-outline-variant/15 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-50 shadow-2xl"
          >
            <div className="p-8 space-y-8 relative">
              <button 
                onClick={() => setSelectedPatient(null)}
                className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full transition-all"
              >
                <X size={20} />
              </button>

              {/* Profile Header */}
              <div className="flex flex-col items-center text-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{selectedPatient.name}</h3>
                  <p className="text-sm text-on-surface-variant">{selectedPatient.age} Years • {selectedPatient.gender} • {selectedPatient.ward}</p>
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-surface-container text-primary text-xs font-bold rounded-lg uppercase tracking-wide">
                    {selectedPatient.diagnosis}
                  </div>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Heart Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-on-surface">{selectedPatient.heartRate} <span className="text-xs font-normal text-on-surface-variant">bpm</span></p>
                  <div className="mt-2 w-full h-8 flex items-end gap-0.5">
                    {[3, 4, 6, 5, 7, 4, 5, 6, 3, 4].map((h, i) => (
                      <div key={i} className="w-1 bg-primary/40 rounded-full" style={{ height: `${h * 10}%` }}></div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind size={14} className="text-secondary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">SpO2</span>
                  </div>
                  <p className="text-2xl font-bold text-on-surface">{selectedPatient.spo2} <span className="text-xs font-normal text-on-surface-variant">%</span></p>
                  <p className="text-[10px] text-secondary font-semibold mt-2 flex items-center gap-1">
                    <TrendingUp size={10} /> Optimal Range
                  </p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon size={14} className="text-tertiary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Sleep Score</span>
                  </div>
                  <p className="text-2xl font-bold text-on-surface">{selectedPatient.sleepScore} <span className="text-xs font-normal text-on-surface-variant">/100</span></p>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Footprints size={14} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Steps</span>
                  </div>
                  <p className="text-2xl font-bold text-on-surface">{selectedPatient.steps.toLocaleString()}</p>
                </div>
              </div>

              {/* Medication Schedule */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Medication Schedule</h4>
                  <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline">View All</span>
                </div>
                <div className="space-y-3">
                  {selectedPatient.medications.length > 0 ? selectedPatient.medications.map((med, idx) => (
                    <div key={idx} className={cn(
                      "flex items-start gap-4 p-3 rounded-lg border border-outline-variant/10",
                      med.status === 'Scheduled' && "bg-surface-container-low/40",
                      med.status === 'Inactive' && "opacity-50"
                    )}>
                      <div className="w-10 h-10 bg-primary-fixed rounded flex items-center justify-center shrink-0">
                        <Activity className="text-primary w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-on-surface">{med.name} {med.dosage}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">{med.schedule}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-on-surface">{med.time}</p>
                        <span className={cn(
                          "text-[8px] uppercase font-black",
                          med.status === 'Taken' ? "text-secondary" : "text-on-surface-variant"
                        )}>{med.status}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-on-surface-variant italic text-center py-4">No active medications recorded.</p>
                  )}
                </div>
              </div>

              {/* Patient Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Clinical Notes</h4>
                  {!isEditingNotes ? (
                    <button 
                      onClick={() => {
                        setEditedNotes(selectedPatient.notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSaveNotes}
                        className="text-[10px] font-bold text-secondary hover:underline"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setIsEditingNotes(false)}
                        className="text-[10px] font-bold text-on-surface-variant hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5 min-h-[100px]">
                  {isEditingNotes ? (
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full bg-transparent text-sm text-on-surface focus:outline-none resize-none min-h-[100px]"
                      placeholder="Add clinical notes here..."
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                      {selectedPatient.notes || "No clinical notes available for this patient."}
                    </p>
                  )}
                </div>
              </div>

              {/* Vitals History */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Vitals History</h4>
                <div className="space-y-2">
                  {selectedPatient.vitalsHistory && selectedPatient.vitalsHistory.length > 0 ? (
                    selectedPatient.vitalsHistory.slice().reverse().map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg text-xs">
                        <span className="text-on-surface-variant font-medium">{new Date(v.timestamp).toLocaleDateString()}</span>
                        <div className="flex gap-4">
                          <span className="text-on-surface font-bold">HR: {v.heartRate}</span>
                          <span className="text-on-surface font-bold">SpO2: {v.spo2}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-on-surface-variant italic text-center py-2">No history records found.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => addNotification("Generating full clinical report...", "info")}
                  className="w-full py-4 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary-container transition-colors shadow-lg shadow-primary/10 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download Full Patient Report
                </button>

                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(selectedPatient.id)}
                    className="w-full py-4 bg-error/10 text-error text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Patient Record
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReportsView = ({ patients, addNotification, darkMode }: { patients: Patient[], addNotification: (m: string, t?: 'info' | 'error' | 'success') => void, darkMode: boolean }) => {
  const totalPatients = patients.length;
  const criticalCases = patients.filter(p => p.status === 'Critical').length;
  const avgHeartRate = Math.round(patients.reduce((acc, p) => acc + p.heartRate, 0) / (patients.length || 1));
  const avgSpo2 = (patients.reduce((acc, p) => acc + p.spo2, 0) / (patients.length || 1)).toFixed(1);

  const occupancyData = useMemo(() => {
    const wards = [
      { label: 'Ward 4A', max: 160, color: 'bg-primary' },
      { label: 'ICU', max: 26, color: 'bg-error' },
      { label: 'Ward 4B', max: 180, color: 'bg-secondary' },
      { label: 'Acute Care', max: 176, color: 'bg-primary-fixed-dim' },
    ];
    
    return wards.map(w => ({
      ...w,
      value: patients.filter(p => p.ward.includes(w.label) || (w.label === 'ICU' && p.ward === 'ICU')).length
    }));
  }, [patients]);

  const vitalsTrendData = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Heart Rate',
        data: Array.from({ length: 30 }, () => 70 + Math.random() * 15),
        borderColor: darkMode ? '#4285F4' : '#004ac6',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Blood Oxygen',
        data: Array.from({ length: 30 }, () => 96 + Math.random() * 3),
        borderColor: darkMode ? '#34A853' : '#006c49',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto overflow-y-auto custom-scrollbar h-full">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Reports & Analytics</h2>
          <p className="text-on-surface-variant mt-1">Institutional performance and diagnostic trend analysis.</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/10 self-start sm:self-auto">
          <Calendar size={18} className="text-primary" />
          <span className="text-sm font-semibold">Last 30 Days</span>
          <MoreVertical size={16} className="text-outline" />
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients', value: totalPatients.toLocaleString(), trend: '+12%', trendUp: true, sub: 'vs last month' },
          { label: 'Critical Cases', value: criticalCases.toString(), trend: '+3%', trendUp: false, sub: 'increase in ICU', color: 'text-error' },
          { label: 'Avg Heart Rate', value: `${avgHeartRate} bpm`, trend: 'Stable', trendUp: true, sub: 'within range' },
          { label: 'Avg Blood Oxygen', value: `${avgSpo2}%`, trend: '+0.5%', trendUp: true, sub: 'improvement' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-surface-container-lowest p-6 rounded-xl border-none shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">{stat.label}</p>
              <h3 className={cn("text-3xl font-black", stat.color || "text-on-surface")}>{stat.value}</h3>
            </div>
            <div className={cn("flex items-center mt-4 text-sm font-bold", stat.trendUp ? "text-secondary" : "text-error")}>
              {stat.trend === 'Stable' ? <Activity size={14} className="mr-1" /> : stat.trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1" />}
              {stat.trend} <span className="text-on-surface-variant font-normal ml-1">{stat.sub}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h4 className="text-xl font-bold text-on-surface">Patient Vitals Trends</h4>
            <p className="text-sm text-on-surface-variant">Daily aggregated averages across all wards</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-xs font-bold text-on-surface-variant">Heart Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="text-xs font-bold text-on-surface-variant">Blood Oxygen</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <Line data={vitalsTrendData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                titleColor: darkMode ? '#ffffff' : '#1e293b',
                bodyColor: darkMode ? '#cbd5e1' : '#64748b',
                borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderWidth: 1,
              }
            },
            layout: {
              padding: {
                bottom: 10
              }
            },
            scales: {
              x: { 
                grid: { display: false }, 
                ticks: { 
                  font: { size: 10 },
                  color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                } 
              },
              y: { 
                grid: { 
                  color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                }, 
                ticks: { 
                  font: { size: 10 },
                  color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                } 
              }
            }
          }} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-on-surface">Recent Reports</h4>
            <button className="text-primary text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="pb-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Report Name</th>
                  <th className="pb-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Generated Date</th>
                  <th className="pb-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="pb-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {MOCK_REPORTS.map((report) => (
                  <tr key={report.id}>
                    <td className="py-4 font-semibold text-sm">{report.name}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{report.date}</td>
                    <td className="py-4 text-sm">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        report.type === 'Institutional' ? "bg-surface-container-low text-primary" :
                        report.type === 'Clinical' ? "bg-secondary-container/20 text-on-secondary-container" :
                        "bg-surface-container-low text-primary"
                      )}>
                        {report.type}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => addNotification(`Downloading ${report.name}...`, "info")}
                        className="flex items-center gap-1 ml-auto text-primary border border-primary/20 hover:bg-primary/5 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        <Download size={12} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
          <h4 className="text-lg font-bold text-on-surface mb-2">Ward Occupancy</h4>
          <p className="text-xs text-on-surface-variant mb-8">Patient counts by specialized department</p>
          <div className="space-y-6">
            {occupancyData.map((ward, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{ward.label}</span>
                  <span>{ward.value} / {ward.max}</span>
                </div>
                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (ward.value / ward.max) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn("h-full rounded-full", ward.color)}
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 rounded-lg bg-surface-container-low border border-outline-variant/10">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <span className="font-bold text-on-surface">Insight:</span> 
              {(() => {
                const icu = occupancyData.find(w => w.label === 'ICU');
                const icuOccupancy = icu ? (icu.value / icu.max) : 0;
                if (icuOccupancy >= 0.9) return " ICU capacity is critically high (90%+). Consider surge protocols.";
                if (icuOccupancy >= 0.7) return " ICU capacity is high (70%+). Monitor bed availability closely.";
                return " System capacity is within normal operating parameters.";
              })()}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const AlertsView = ({ addNotification }: { addNotification: (m: string, t?: 'info' | 'error' | 'success') => void }) => {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    addNotification('Alert dismissed', 'info');
  };

  const handleEscalate = (id: string) => {
    addNotification('Alert escalated to Senior Consultant', 'error');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">Active Alerts</h2>
        <p className="text-sm text-on-surface-variant">Real-time clinical monitoring notifications.</p>
      </div>

      <div className="space-y-4">
        {alerts.length > 0 ? alerts.map((alert) => (
          <motion.div 
            layout
            key={alert.id}
            className={cn(
              "p-5 rounded-xl border flex gap-4 items-start shadow-sm transition-all",
              alert.severity === 'Critical' ? "bg-error-container/10 border-error/20" :
              alert.severity === 'Warning' ? "bg-amber-50 border-amber-200" :
              "bg-blue-50 border-blue-200"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              alert.severity === 'Critical' ? "bg-error text-white" :
              alert.severity === 'Warning' ? "bg-amber-500 text-white" :
              "bg-blue-500 text-white"
            )}>
              <AlertTriangle size={20} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    {alert.patientName}
                    <span className={cn(
                      "text-[9px] uppercase px-2 py-0.5 rounded-full font-black",
                      alert.severity === 'Critical' ? "bg-error/10 text-error" :
                      alert.severity === 'Warning' ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {alert.severity}
                    </span>
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1">{alert.message}</p>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{alert.time}</span>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => handleDismiss(alert.id)}
                  className="px-4 py-1.5 bg-white border border-outline-variant/20 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Dismiss
                </button>
                <button 
                  onClick={() => handleEscalate(alert.id)}
                  className="px-4 py-1.5 bg-on-surface text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Escalate
                </button>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-20 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
            <CheckCircle2 size={48} className="mx-auto text-secondary opacity-20 mb-4" />
            <p className="text-sm font-medium text-on-surface-variant">No active alerts. All systems normal.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileView = ({ userAvatar, userName, userEmail }: { userAvatar: string, userName: string, userEmail: string }) => {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      <div>
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">User Profile</h2>
        <p className="text-sm text-on-surface-variant">Your personal information and professional details.</p>
      </div>

      <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 flex flex-col items-center text-center gap-6">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-xl">
          <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-on-surface">{userName || 'Doctor'}</h3>
          <p className="text-on-surface-variant uppercase tracking-widest text-xs font-bold mt-1">Attending Physician</p>
          <p className="text-sm text-on-surface-variant mt-4">{userEmail}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
          <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Department</p>
            <p className="text-sm font-bold text-on-surface">Cardiology</p>
          </div>
          <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Employee ID</p>
            <p className="text-sm font-bold text-on-surface">DR-7742</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ settings, onToggle, onAvatarChange, userAvatar, userName, userEmail }: { 
  settings: any, 
  onToggle: (key: string) => void,
  onAvatarChange: () => void,
  userAvatar: string,
  userName: string,
  userEmail: string
}) => {
  const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={cn(
        "w-10 h-5 rounded-full transition-all relative",
        active ? "bg-primary" : "bg-outline-variant/30"
      )}
    >
      <div className={cn(
        "absolute top-1 w-3 h-3 bg-surface-container-lowest rounded-full transition-all",
        active ? "right-1" : "left-1"
      )}></div>
    </button>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      <div>
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">Settings</h2>
        <p className="text-sm text-on-surface-variant">Manage your account and application preferences.</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
          <Users size={20} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">Profile Settings</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-container-low overflow-hidden border-2 border-surface-container-lowest shadow-sm">
            <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-base font-bold text-on-surface">{userName || 'Doctor'}</p>
            <p className="text-xs text-on-surface-variant">{userEmail}</p>
            <button 
              onClick={onAvatarChange}
              className="text-primary text-[10px] font-bold uppercase tracking-wider mt-1 hover:underline"
            >
              Sync with Google
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
          <Bell size={20} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-on-surface">Email Notifications</p>
              <p className="text-xs text-on-surface-variant">Receive daily summaries and critical alerts via email.</p>
            </div>
            <Toggle active={settings.emailNotifications} onClick={() => onToggle('emailNotifications')} />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-on-surface">SMS Alerts</p>
              <p className="text-xs text-on-surface-variant">Get instant SMS for critical patient vitals.</p>
            </div>
            <Toggle active={settings.smsAlerts} onClick={() => onToggle('smsAlerts')} />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
          <Settings size={20} className="text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">Display Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-on-surface">Auto-Refresh Dashboard</p>
              <p className="text-xs text-on-surface-variant">Automatically update vitals every 30 seconds.</p>
            </div>
            <Toggle active={settings.autoRefresh} onClick={() => onToggle('autoRefresh')} />
          </div>
        </div>
      </section>
    </div>
  );
};

const AddPatientView = ({ setActivePage, onAddPatient }: { 
  setActivePage: (p: Page) => void,
  onAddPatient: (p: Patient) => void
}) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    ward: 'Ward 4A',
    room: '',
    diagnosis: '',
    physician: 'Dr. Meera Reddy',
    admissionDate: new Date().toISOString().split('T')[0],
    bloodType: 'O+',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.age) return;

    const newPatient: Patient = {
      id: `P-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender as any,
      ward: formData.ward,
      room: formData.room || 'TBD',
      lastCheck: 'Just now',
      heartRate: 72 + Math.floor(Math.random() * 10),
      spo2: 97 + Math.floor(Math.random() * 3),
      sleepScore: 70 + Math.floor(Math.random() * 25),
      steps: Math.floor(Math.random() * 5000),
      status: 'Stable',
      diagnosis: formData.diagnosis || 'Observation',
      physician: formData.physician,
      admissionDate: formData.admissionDate,
      bloodType: formData.bloodType,
      medications: []
    };

    onAddPatient(newPatient);
  };

  return (
    <div className="p-8 md:p-12 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-background tracking-tight">Add New Patient</h2>
        <p className="text-on-surface-variant text-sm mt-1">Initialize a new patient record and monitoring sequence.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(11,28,48,0.04)] border border-outline-variant/15 overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-outline-variant/10">
          {/* Section 1: Personal Information */}
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-primary w-5 h-5" />
              <h3 className="text-base font-semibold text-on-background uppercase tracking-wider">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Rajesh Kumar" 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Age</label>
                <input 
                  type="number" 
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  placeholder="Years" 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Gender</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Date of Birth</label>
                <input type="date" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Ward */}
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Wind className="text-primary w-5 h-5" />
              <h3 className="text-base font-semibold text-on-background uppercase tracking-wider">Contact & Ward</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Phone Number</label>
                <input type="tel" placeholder="+91 98765 43210" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Emergency Contact</label>
                <input type="text" placeholder="Name & Relationship (e.g. Amit Kumar - Brother)" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Ward Assignment</label>
                <select 
                  value={formData.ward}
                  onChange={(e) => setFormData({...formData, ward: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                >
                  <option>Ward 4A</option>
                  <option>Ward 4B</option>
                  <option>ICU</option>
                  <option>Acute Care</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Room #</label>
                <input 
                  type="text" 
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  placeholder="B-204" 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medical Information */}
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="text-primary w-5 h-5" />
              <h3 className="text-base font-semibold text-on-background uppercase tracking-wider">Medical Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Primary Diagnosis</label>
                <input 
                  type="text" 
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                  placeholder="Principal reason for admission" 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Attending Physician</label>
                <input 
                  type="text" 
                  value={formData.physician}
                  onChange={(e) => setFormData({...formData, physician: e.target.value})}
                  placeholder="e.g. Dr. Anil Verma" 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Admission Date</label>
                <input 
                  type="date" 
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tight">Blood Type</label>
                <select 
                  value={formData.bloodType}
                  onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-background focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                >
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>O+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-8 bg-surface-container-low flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="px-8 py-3 rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-lowest transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-10 py-3 rounded-lg text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2"
            >
              <UserPlus size={18} />
              Add Patient
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 flex justify-center pb-8">
        <p className="text-xs text-on-surface-variant flex items-center gap-1">
          <ShieldCheck size={14} />
          All data is handled according to HIPAA clinical security standards.
        </p>
      </div>
    </div>
  );
};

// --- Components ---

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No user found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email.');
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-container-lowest p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-container-low p-10 rounded-3xl shadow-2xl border border-outline-variant/10 text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Activity className="text-primary w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-on-background mb-2 tracking-tight">Clinical Precision</h1>
        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
          {isSignup ? 'Create your professional account' : 'Sign in to access your clinical dashboard'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="text-left">
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="doctor@hospital.com"
            />
          </div>
          <div className="text-left">
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error text-xs font-medium">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-container transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-outline-variant/20 flex-1"></div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50">OR</span>
          <div className="h-px bg-outline-variant/20 flex-1"></div>
        </div>
        
        <button
          onClick={() => loginWithGoogle()}
          className="w-full py-3 px-6 bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-surface-container-low transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <button 
          onClick={() => {
            setIsSignup(!isSignup);
            setError(null);
          }}
          className="mt-6 text-xs font-bold text-primary hover:underline"
        >
          {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
        
        <p className="mt-8 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold opacity-50">
          Secure Enterprise Access • HIPAA Compliant
        </p>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [activePage, setActivePage] = useState<Page>('dashboard');

  // Reset page on logout
  useEffect(() => {
    if (!user && !loading) {
      setActivePage('dashboard');
    }
  }, [user, loading]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{ id: number, message: string, type: 'info' | 'error' | 'success' }[]>([]);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    darkMode: false,
    highContrast: false,
    autoRefresh: true,
  });

  // Sync Settings with User Profile in Firestore
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          darkMode: data.darkMode ?? prev.darkMode,
          emailNotifications: data.notifications ?? prev.emailNotifications
        }));
      } else {
        // Initialize user profile
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'doctor',
          darkMode: false,
          notifications: true,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    return () => unsubscribe();
  }, [user]);

  // Sync Patients from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      // If no patients exist, seed with mock data (only once)
      if (patientList.length === 0) {
        try {
          const batch = writeBatch(db);
          MOCK_PATIENTS.forEach(p => {
            const { id, ...rest } = p;
            const newDocRef = doc(collection(db, 'patients'));
            batch.set(newDocRef, {
              ...rest,
              createdBy: user.uid,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          // After commit, onSnapshot will fire again with the new data.
        } catch (err) {
          // If seeding fails (e.g. permission denied), we still want to show an empty list
          setPatients([]);
          handleFirestoreError(err, OperationType.WRITE, 'patients/seed');
        }
      } else {
        setPatients(patientList);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'patients'));

    return () => unsubscribe();
  }, [user]);

  const handleToggleSetting = async (key: string) => {
    const newVal = !settings[key as keyof typeof settings];
    setSettings(prev => ({ ...prev, [key]: newVal }));
    
    if (user) {
      const updateData: any = {};
      if (key === 'darkMode') updateData.darkMode = newVal;
      if (key === 'emailNotifications') updateData.notifications = newVal;
      
      if (Object.keys(updateData).length > 0) {
        try {
          await updateDoc(doc(db, 'users', user.uid), updateData);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    }
  };

  const handleAvatarChange = () => {
    addNotification("Avatar is synced with your Google account", "info");
  };

  const addNotification = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleAddPatient = async (newPatient: Patient) => {
    if (!user) return;
    try {
      const { id, ...rest } = newPatient;
      await addDoc(collection(db, 'patients'), {
        ...rest,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setActivePage('patients');
      addNotification(`Patient ${newPatient.name} added successfully.`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'patients');
    }
  };

  const handleEmergency = () => {
    addNotification("EMERGENCY ALERT BROADCASTED TO ALL UNITS", "error");
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      await deleteDoc(doc(db, 'patients', patientId));
      setSelectedPatient(null);
      addNotification("Patient record deleted successfully", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `patients/${patientId}`);
    }
  };

  const handleUpdatePatient = async (patientId: string, updates: Partial<Patient>) => {
    try {
      await updateDoc(doc(db, 'patients', patientId), updates);
      addNotification("Patient record updated", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `patients/${patientId}`);
    }
  };

  const pageTitle = useMemo(() => {
    switch (activePage) {
      case 'dashboard': return 'Clinical Precision';
      case 'patients': return 'Patient Directory';
      case 'reports': return 'Reports & Analytics';
      case 'alerts': return 'Active Alerts';
      case 'settings': return 'System Settings';
      case 'add-patient': return 'New Patient Registration';
      default: return 'Clinical Precision';
    }
  }, [activePage]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-on-surface-variant animate-pulse uppercase tracking-widest">Initializing Systems...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const userAvatar = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;

  return (
    <div className={cn("flex h-screen w-full overflow-hidden relative transition-colors duration-300", settings.darkMode && "dark")}>
      {/* Notifications Overlay */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={cn(
                "px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 pointer-events-auto min-w-[300px]",
                n.type === 'info' && "bg-surface-container-lowest border-primary/20 text-primary",
                n.type === 'success' && "bg-secondary text-white border-transparent",
                n.type === 'error' && "bg-error text-white border-transparent"
              )}
            >
              {n.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              <span className="text-sm font-bold tracking-tight">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sidebar activePage={activePage} setActivePage={setActivePage} onEmergency={handleEmergency} />
      
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <TopBar 
          title={pageTitle} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onLogout={() => logout()}
          userAvatar={userAvatar}
          userName={user?.displayName || ''}
          setActivePage={setActivePage}
        />
        
        <div className="flex-1 overflow-hidden relative">
          {/* Action Button for Add Patient */}
          {activePage === 'patients' && (
            <button 
              onClick={() => setActivePage('add-patient')}
              className="absolute bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
            >
              <Plus size={28} />
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full overflow-y-auto custom-scrollbar"
            >
              {activePage === 'dashboard' && (
                <DashboardView 
                  setActivePage={setActivePage} 
                  patients={patients} 
                  setSelectedPatient={setSelectedPatient} 
                  darkMode={settings.darkMode}
                />
              )}
              {activePage === 'patients' && (
                <PatientsView 
                  patients={patients} 
                  selectedPatient={selectedPatient} 
                  setSelectedPatient={setSelectedPatient}
                  searchQuery={searchQuery}
                  addNotification={addNotification}
                  onDeletePatient={handleDeletePatient}
                  onUpdatePatient={handleUpdatePatient}
                  isAdmin={user.email === 'gtarunaditya@gmail.com'}
                />
              )}
              {activePage === 'reports' && <ReportsView patients={patients} addNotification={addNotification} darkMode={settings.darkMode} />}
              {activePage === 'alerts' && <AlertsView addNotification={addNotification} />}
              {activePage === 'settings' && (
                <SettingsView 
                  settings={settings} 
                  onToggle={handleToggleSetting} 
                  onAvatarChange={handleAvatarChange}
                  userAvatar={userAvatar}
                  userName={user?.displayName || ''}
                  userEmail={user?.email || ''}
                />
              )}
              {activePage === 'profile' && (
                <ProfileView 
                  userAvatar={userAvatar}
                  userName={user?.displayName || ''}
                  userEmail={user?.email || ''}
                />
              )}
              {activePage === 'add-patient' && (
                <AddPatientView 
                  setActivePage={setActivePage} 
                  onAddPatient={handleAddPatient} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
