import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { 
  getAllDepartments, 
  getDepartmentById, 
  type DepartmentConfig 
} from '../../config/departments';
import { fetchAllDepartments } from '../../services/departmentService';
import TaxVatCockpit from './departments/TaxVatCockpit';
import BookkeepingCockpit from './departments/BookkeepingCockpit';
import AuditCockpit from './departments/AuditCockpit';
import IncomeTaxCockpit from './departments/IncomeTaxCockpit';
import ConsultancyCockpit from './departments/ConsultancyCockpit';
import LiquidationCockpit from './departments/LiquidationCockpit';
import { 
  Layers, Building2, Sparkles, User, Briefcase, Share2, 
  ShieldCheck, RefreshCw, Calendar, Clock 
} from 'lucide-react';

export const DepartmentAdaptiveWorkspace: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const isAr = i18n.language === 'ar';

  const [departments, setDepartments] = useState<DepartmentConfig[]>(getAllDepartments());
  const [activeDeptId, setActiveDeptId] = useState<string>('tax_vat');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Load user assigned department
  useEffect(() => {
    const fetchUserDept = async () => {
      setLoading(true);
      try {
        const dynamicDepts = await fetchAllDepartments();
        if (dynamicDepts && dynamicDepts.length > 0) {
          setDepartments(dynamicDepts);
        }

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, department_id')
            .eq('id', user.id)
            .maybeSingle();

          setUserProfile(profile);

          if (profile?.department_id) {
            const matchedDept = getDepartmentById(profile.department_id);
            if (matchedDept) {
              setActiveDeptId(matchedDept.id);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching employee department context:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDept();
  }, [user]);

  const currentDept = getDepartmentById(activeDeptId) || departments[0];

  const renderActiveCockpit = () => {
    switch (activeDeptId) {
      case 'tax_vat':
        return <TaxVatCockpit />;
      case 'bookkeeping':
        return <BookkeepingCockpit />;
      case 'audit':
        return <AuditCockpit />;
      case 'income_tax':
        return <IncomeTaxCockpit />;
      case 'consultancy':
      case 'business_advisory':
        return <ConsultancyCockpit />;
      case 'liquidation':
        return <LiquidationCockpit />;
      default:
        return <TaxVatCockpit />;
    }
  };

  const getCycleBadge = (type: string) => {
    switch (type) {
      case 'quarterly':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
            {isAr ? 'دورة ربع سنوية (Q1-Q4)' : 'Quarterly Cycle (Q1-Q4)'}
          </span>
        );
      case 'monthly':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            {isAr ? 'دورة شهرية (من 5 إلى 25)' : 'Monthly Closure (5th - 25th)'}
          </span>
        );
      case 'engagement':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200">
            {isAr ? 'دورة مراحل التعاقد (1 إلى 6)' : '6-Stage Engagement Cycle'}
          </span>
        );
      case 'yearly':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
            {isAr ? 'دورة سنوية + 120 يوماً' : 'Yearly Cycle (120 Days post FY)'}
          </span>
        );
      case 'project':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            {isAr ? 'دورة مشروعات محددة (5 مراحل)' : '5-Stage Project Milestones'}
          </span>
        );
      case 'case_govt':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            {isAr ? 'دورة إجراءات وبراءات ذمة حكومية' : 'Govt Clearance Case Stages'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Department Switcher Ribbon */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white rounded-3xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
            style={{ backgroundColor: currentDept?.color || '#A11212' }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900">
                {isAr ? currentDept?.name_ar || currentDept?.name : currentDept?.name}
              </h2>
              {currentDept && getCycleBadge(currentDept.cycle_type)}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {isAr ? currentDept?.head_title_ar || currentDept?.head_title : currentDept?.head_title} •{' '}
              {isAr ? currentDept?.duty_ar || currentDept?.duty : currentDept?.duty}
            </p>
          </div>
        </div>

        {/* Quick Switcher for Testing / Management */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {departments.slice(0, 6).map(d => {
            const isSelected = d.id === activeDeptId;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDeptId(d.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected 
                    ? 'bg-[#A11212] text-white border-[#A11212] shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {isAr ? d.name_ar || d.name : d.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render the Active Department Cockpit */}
      {renderActiveCockpit()}
    </div>
  );
};

export default DepartmentAdaptiveWorkspace;
