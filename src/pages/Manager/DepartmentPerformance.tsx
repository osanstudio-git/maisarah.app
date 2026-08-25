import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { getAllDepartments, getDepartmentById } from '../../config/departments';
import {
  Layers,
  ChevronDown,
  CheckCircle2,
  Clock,
  Settings,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Briefcase
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  tasksCompleted: number;
  delays: number;
  completionRate: number;
}

const DepartmentPerformance = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const departments = getAllDepartments();
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || 'audit');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDept = getDepartmentById(selectedDeptId);

  useEffect(() => {
    fetchDepartmentData(selectedDeptId);
  }, [selectedDeptId]);

  const fetchDepartmentData = async (deptId: string) => {
    setLoading(true);
    try {
      // In a real app, we filter by department_id. Here we mock real users for the UI.
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['employee', 'manager']);
        
      if (error) throw error;

      // Mock varying stats depending on department selection
      const randMultiplier = Math.random() * 0.5 + 0.5; // Randomize to show different data per dept
      
      const realEmployees: Employee[] = (profiles || []).map((p, idx) => {
        const total = Math.floor((Math.random() * 50 + 10) * randMultiplier);
        const done = Math.floor(total * (0.6 + Math.random() * 0.4));
        const delays = Math.floor(Math.random() * 5);
        return {
          id: p.id,
          name: p.full_name || 'Unknown',
          email: p.email,
          tasksCompleted: done,
          delays: delays,
          completionRate: Math.round((done / total) * 100),
        };
      }).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5); // Just show top 5 for clarity

      setEmployees(realEmployees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDept) return null;

  // Mocking KPI values dynamically based on what the department config requires
  const getMockValueForKPI = (type: string) => {
    switch (type) {
      case 'percentage': return `${Math.floor(Math.random() * 20 + 80)}%`;
      case 'count': return Math.floor(Math.random() * 500 + 50).toLocaleString();
      case 'days': return `${Math.floor(Math.random() * 5 + 1)} ${isAr ? 'أيام' : 'Days'}`;
      case 'score': return (Math.random() * 1 + 4).toFixed(1) + ' / 5.0';
      default: return '0';
    }
  };

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header & Selector ───────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Layers className="text-brand-dark" size={32} />
            {isAr ? 'أداء الأقسام' : 'Department Performance'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'اختر القسم لمشاهدة التحليلات والمؤشرات الخاصة به' : 'Select a department to view its specific analytics and KPIs'}
          </p>
        </div>
        
        <div className="relative min-w-[250px]">
          <select 
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full p-4 pl-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-brand-dark text-brand-dark font-black appearance-none shadow-inner transition-all hover:bg-gray-100"
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name} ({dept.head_title})</option>
            ))}
          </select>
          <ChevronDown className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-brand-dark pointer-events-none`} size={20} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
        </div>
      ) : (
        <>
          {/* ── Dynamic KPIs ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
              {isAr ? 'مؤشرات الأداء الرئيسية' : 'Key Performance Indicators'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedDept.kpis.map((kpi, idx) => {
                const isWarning = Math.random() > 0.8; // Randomly highlight a KPI as warning
                return (
                  <div key={kpi.id} className={`rounded-3xl p-6 shadow-sm border ${isWarning ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'} hover:shadow-md transition-all relative overflow-hidden group`}>
                    <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl ${isWarning ? 'bg-orange-200' : 'bg-brand-light/20'} group-hover:scale-150 transition-transform duration-500`} />
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                      <div className="flex justify-between items-start">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isWarning ? 'text-orange-800' : 'text-gray-400'}`}>{kpi.label}</p>
                        {isWarning ? <AlertTriangle size={16} className="text-orange-500" /> : <TrendingUp size={16} className="text-brand-dark opacity-50" />}
                      </div>
                      <p className={`text-3xl font-black ${isWarning ? 'text-orange-700' : 'text-gray-900'} leading-none`}>
                        {getMockValueForKPI(kpi.type)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Employee Roster ────────────────────────────────────────── */}
            <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h3 className="font-black text-lg text-gray-800 flex items-center gap-2 tracking-tight">
                  <UserCheck size={20} className="text-brand-dark" />
                  {isAr ? 'فريق عمل القسم' : 'Department Roster'}
                </h3>
                <span className="text-[10px] bg-white text-gray-500 font-black px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm uppercase tracking-widest">
                  {employees.length} {isAr ? 'أعضاء' : 'Members'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المهام המنجزة' : 'Done'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'متأخر' : 'Delayed'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'معدل الإنجاز' : 'Completion'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark flex items-center justify-center font-black text-sm flex-shrink-0 group-hover:bg-brand-dark group-hover:text-white transition-all">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="text-start">
                              <p className="font-black text-gray-900 text-sm">{emp.name}</p>
                              <p className="text-[10px] font-bold text-gray-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-green-600 font-black text-xs">
                            <CheckCircle2 size={14} />
                            {emp.tasksCompleted}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1.5 font-black text-xs ${emp.delays > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock size={14} />
                            {emp.delays}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-[100px]">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 shadow-inner">
                              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${emp.completionRate}%`, backgroundColor: emp.completionRate >= 90 ? '#10B981' : emp.completionRate >= 70 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                            <span className="text-[10px] font-black text-gray-700 w-8">{emp.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Extra Features Hub ────────────────────────────────────── */}
            <div className="xl:col-span-1 space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                {isAr ? 'أدوات القسم' : 'Department Tools'}
              </h3>
              <div className="space-y-3">
                {selectedDept.extra_features.length > 0 ? (
                  selectedDept.extra_features.map((feature, idx) => (
                    <button key={idx} className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-brand-dark hover:shadow-md transition-all group flex items-center justify-between text-start">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-colors">
                          <Briefcase size={18} />
                        </div>
                        <h4 className="font-bold text-gray-800 text-xs">{feature}</h4>
                      </div>
                      <ChevronDown className="-rotate-90 text-gray-300 group-hover:text-brand-dark transition-colors" size={16} />
                    </button>
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 border border-gray-100 border-dashed">
                    <Settings size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-xs">{isAr ? 'لا توجد أدوات مخصصة' : 'No specialized tools'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentPerformance;
