import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Star, Award, CheckCircle2, TrendingUp, PlusCircle, FileText, User, Calendar
} from 'lucide-react';

interface PerformanceReview {
  id: string;
  employeeName: string;
  role: string;
  dept: string;
  rating: number; // 1 to 5 stars
  cycle: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual';
  goalsMet: string;
  strengths: string;
  improvements: string;
  reviewer: string;
  date: string;
}

const INITIAL_REVIEWS: PerformanceReview[] = [
  {
    id: 'PERF-701',
    employeeName: 'Ahmed Al-Kharusi',
    role: 'Senior Auditor',
    dept: 'Audit',
    rating: 4.5,
    cycle: 'Q3',
    goalsMet: 'Completed 12 comprehensive audits; exceeded target client satisfaction by 15%.',
    strengths: 'Outstanding financial analytical precision, strong corporate client communications.',
    improvements: 'Should delegate more junior audit tasks to optimize daily team output.',
    reviewer: 'Fatma Al-Harthy',
    date: '2026-06-25'
  },
  {
    id: 'PERF-702',
    employeeName: 'Sara Al-Balushi',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    rating: 4.0,
    cycle: 'Q3',
    goalsMet: 'Successfully migrated 25 corporate tax profiles onto the new VAT software platform.',
    strengths: 'Vast knowledge of Omani tax law updates, highly organized administrative workflows.',
    improvements: 'Improve attendance punctuality to ensure seamless meeting coordination.',
    reviewer: 'Fatma Al-Harthy',
    date: '2026-06-24'
  }
];

export default function HRPerformance() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [reviews, setReviews] = useState<PerformanceReview[]>(INITIAL_REVIEWS);
  const [selectedReviewId, setSelectedReviewId] = useState<string>(INITIAL_REVIEWS[0].id);
  const [showModal, setShowModal] = useState(false);
  const [hodStats, setHodStats] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('hod_personnel_stats');
    if (saved) {
      setHodStats(JSON.parse(saved));
    }
  }, []);

  const [newReview, setNewReview] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    rating: 5,
    cycle: 'Q3' as PerformanceReview['cycle'],
    goalsMet: '',
    strengths: '',
    improvements: '',
    reviewer: 'Fatma Al-Harthy'
  });

  const selectedReview = reviews.find(r => r.id === selectedReviewId) || reviews[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const review: PerformanceReview = {
      id: `PERF-${Math.floor(700 + Math.random() * 300)}`,
      employeeName: newReview.employeeName,
      role: newReview.employeeName === 'Ahmed Al-Kharusi' ? 'Senior Auditor' : 'Tax Consultant',
      dept: newReview.employeeName === 'Ahmed Al-Kharusi' ? 'Audit' : 'Tax & VAT',
      rating: Number(newReview.rating),
      cycle: newReview.cycle,
      goalsMet: newReview.goalsMet,
      strengths: newReview.strengths,
      improvements: newReview.improvements,
      reviewer: newReview.reviewer,
      date: new Date().toISOString().split('T')[0]
    };
    setReviews([review, ...reviews]);
    setSelectedReviewId(review.id);
    setShowModal(false);
    setNewReview({ ...newReview, goalsMet: '', strengths: '', improvements: '' });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} size={16} className="fill-amber-450 text-amber-450" />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(<Star key={i} size={16} className="text-amber-450 fill-amber-450/40" />);
      } else {
        stars.push(<Star key={i} size={16} className="text-gray-300" />);
      }
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Award className="text-[#A11212]" size={24} />
            {isAr ? 'تقييم الأداء والمكافآت' : 'Performance Evaluation & Appraisal'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'رصد أهداف الموظفين ومراجعات الأداء الربع سنوية' : 'Review employee goal performance and appraisals'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إضافة تقييم جديد' : 'Submit Review'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        
        {/* Left List */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Appraisals Timeline</h3>
          <div className="space-y-2">
            {reviews.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReviewId(r.id)}
                className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all text-start ${
                  selectedReviewId === r.id
                    ? 'bg-[#A11212]/5 border-[#A11212]'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="font-black text-xs text-gray-900">{r.employeeName}</h4>
                  <p className="text-[9px] text-gray-500 font-bold">{r.role} · {r.cycle} Cycle</p>
                </div>
                <div className="text-end space-y-1">
                  <div className="flex justify-end">{renderStars(r.rating)}</div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{r.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Details Card */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {selectedReview ? (
            <>
              {/* Header Profile */}
              <div className="flex justify-between items-center pb-6 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#A11212] text-white rounded-xl flex items-center justify-center font-black text-xl">
                    {selectedReview.employeeName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">{selectedReview.employeeName}</h3>
                    <p className="text-[10px] text-gray-500 font-bold">{selectedReview.role} · {selectedReview.dept}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Evaluation Cycle</p>
                  <p className="text-sm font-black text-[#A11212]">{selectedReview.cycle} Review</p>
                </div>
              </div>

              {/* Core rating & metadata info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">Overall Rating</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{selectedReview.rating}</span>
                    {renderStars(selectedReview.rating)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">Assessed By</p>
                  <p className="text-xs font-black text-gray-800 mt-1.5">{selectedReview.reviewer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">Assessment Date</p>
                  <p className="text-xs font-black text-gray-800 mt-1.5">{selectedReview.date}</p>
                </div>
              </div>

              {/* Dynamic HOD Task Sync Metrics */}
              {(() => {
                const match = hodStats.find(p => 
                  p.name.toLowerCase().includes(selectedReview.employeeName.toLowerCase()) || 
                  selectedReview.employeeName.toLowerCase().includes(p.name.toLowerCase())
                );
                
                if (match) {
                  return (
                    <div className="border border-red-100 bg-[#A11212]/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={12} /> HOD Live Performance Sync Metrics
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2.5 rounded-lg border border-red-50">
                          <p className="text-[9px] text-gray-400 font-bold">Tasks Completed</p>
                          <p className="text-sm font-black text-gray-900">{match.tasksCompleted}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-red-50">
                          <p className="text-[9px] text-gray-400 font-bold">Accuracy Index</p>
                          <p className="text-sm font-black text-green-700">{match.accuracy}%</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-red-50">
                          <p className="text-[9px] text-gray-400 font-bold">Delayed Tasks</p>
                          <p className={`text-sm font-black ${match.delayed > 0 ? 'text-red-650' : 'text-gray-900'}`}>{match.delayed}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Bullet notes */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Goals Achieved & Core Responsibilities
                  </h4>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    {selectedReview.goalsMet}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={12} /> Key Strengths
                  </h4>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed bg-green-50/5 p-3 rounded-lg border border-green-100/50">
                    {selectedReview.strengths}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} /> Opportunities for Development
                  </h4>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed bg-amber-50/5 p-3 rounded-lg border border-amber-100/50">
                    {selectedReview.improvements}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a review timeline item to inspect performance details.
            </div>
          )}
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">New Performance Evaluation</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee Name</label>
                  <select
                    value={newReview.employeeName}
                    onChange={(e) => setNewReview({ ...newReview, employeeName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                    <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Review Cycle</label>
                  <select
                    value={newReview.cycle}
                    onChange={(e) => setNewReview({ ...newReview, cycle: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Q1">Q1 Review</option>
                    <option value="Q2">Q2 Review</option>
                    <option value="Q3">Q3 Review</option>
                    <option value="Q4">Q4 Review</option>
                    <option value="Annual">Annual Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rating (1 to 5 Stars)</label>
                <select
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="5">5 Stars (Excellent)</option>
                  <option value="4">4 Stars (Good)</option>
                  <option value="3">3 Stars (Satisfactory)</option>
                  <option value="2">2 Stars (Needs Improvement)</option>
                  <option value="1">1 Star (Unsatisfactory)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Goals Achieved</label>
                <textarea
                  required
                  value={newReview.goalsMet}
                  onChange={(e) => setNewReview({ ...newReview, goalsMet: e.target.value })}
                  placeholder="Summarize objectives achieved..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Key Strengths</label>
                <textarea
                  required
                  value={newReview.strengths}
                  onChange={(e) => setNewReview({ ...newReview, strengths: e.target.value })}
                  placeholder="Identify core positive skills and traits..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Development Areas</label>
                <textarea
                  required
                  value={newReview.improvements}
                  onChange={(e) => setNewReview({ ...newReview, improvements: e.target.value })}
                  placeholder="Identify opportunities for optimization..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
                >
                  Add Evaluation
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
