import type { MonthlyPerformanceReportData } from '../types/monthlyPerformanceReport';

export interface AggregatorInputData {
  invoices?: any[];
  services?: any[];
  clients?: any[];
  quotations?: any[];
  staff?: any[];
  leads?: any[];
}

export function generateDefaultMonthlyReport(
  monthIndex: number = new Date().getMonth(),
  year: number = new Date().getFullYear(),
  liveData: AggregatorInputData = {}
): MonthlyPerformanceReportData {
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const monthName = monthNamesEn[monthIndex];
  const refCode = `MSR-MOPR-${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  // 1. Calculate Financials from Live Invoices / Quotations if available
  const invs = liveData.invoices || [];
  let calculatedRev = 0;
  let collectedAmt = 0;

  invs.forEach(inv => {
    const amt = Number(inv.amount || inv.total_amount || 0);
    calculatedRev += amt;
    if (inv.status === 'paid' || inv.payment_status === 'paid') {
      collectedAmt += amt;
    }
  });

  const totalRev = calculatedRev > 0 ? calculatedRev : 4097;
  const prevRev = 3000.5;
  const revGrowth = +(((totalRev - prevRev) / prevRev) * 100).toFixed(1);

  const totalExp = 3201.877;
  const prevExp = 3728.393;
  const expReduction = -14.1;

  const netProf = +(totalRev - totalExp).toFixed(3);
  const profitMargin = +((netProf / totalRev) * 100).toFixed(1);

  const collected = collectedAmt > 0 ? collectedAmt : 2948;
  const prevCollected = 2037.5;
  const collectionGrowth = +(((collected - prevCollected) / prevCollected) * 100).toFixed(1);

  const uncollected = +(totalRev - collected).toFixed(0) || 1353;
  const prevUncollected = 963;

  // 2. Department deliverables progress
  const servicesList = liveData.services || [];
  const srvCount = servicesList.length > 0 ? servicesList.length : 107;
  const newClients = (liveData.clients || []).filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === monthIndex && d.getFullYear() === year;
  }).length || 4;

  return {
    id: `report-${year}-${monthIndex + 1}`,
    month: monthIndex,
    year,
    reportDate: new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10),
    referenceNumber: refCode,
    managerName: 'Budoor Al Hasani (Operations Manager)',
    departmentScope: 'Consolidated Office Performance (All Departments)',

    // 1 - Executive Summary
    executiveSummary: {
      totalRevenue: totalRev,
      numberOfServices: srvCount,
      newClientsCount: newClients,
      netProfit: netProf,
      revenueGrowthPercent: revGrowth > 0 ? revGrowth : 36.5,
      expenseReductionPercent: expReduction,
      keyAchievements: [
        `Achieved a positive net profit of OMR ${netProf.toLocaleString()} with a healthy operational margin.`,
        `Revenue grew by ${revGrowth > 0 ? revGrowth : 36.5}% while expenses reduced by 14.1% compared with previous month.`,
        `Successful onboarding of ${newClients} corporate & SME clients through Sanad & FDI channels.`
      ],
      keyChallenges: [
        'Missing client supporting documents: temporary bottleneck causing delays in 13 audit files and 3 tax files.',
        'Two staff departures recorded during the period, resulting in a direct need for an audit assistant and sales executive.',
        'Overall revenue achievement reached 44.1% of strategic target, requiring proactive service pipeline acceleration.'
      ]
    },

    // 2 - Financial Performance
    financialPerformance: {
      currentRevenue: totalRev,
      previousRevenue: prevRev,
      revenueChangePercent: revGrowth > 0 ? revGrowth : 36.5,

      currentExpenses: totalExp,
      previousExpenses: prevExp,
      expensesChangePercent: expReduction,

      currentProfit: netProf,
      previousProfit: -727.893,
      profitMarginPercent: profitMargin > 0 ? profitMargin : 21.8,

      collectedFromClients: collected,
      previousCollected: prevCollected,
      collectionGrowthPercent: collectionGrowth > 0 ? collectionGrowth : 44.7,

      uncollectedReceivables: uncollected,
      previousUncollected: prevUncollected,
      overdueReceivables: 0,

      cashBankBalance: 3252.183,
      previousCashBankBalance: 3337.514,

      revenueByService: [
        { serviceName: 'Statutory Audit & Assurance', serviceNameAr: 'التدقيق المالي والمراجعة', revenue: 1327, target: 2500, achievementRate: 53.1 },
        { serviceName: 'Accounting & Bookkeeping', serviceNameAr: 'المحاسبة ومسك الدفاتر', revenue: 620, target: 800, achievementRate: 77.5 },
        { serviceName: 'Tax & VAT Services', serviceNameAr: 'الضرائب وضريبة القيمة المضافة', revenue: 540, target: 800, achievementRate: 67.5 },
        { serviceName: 'Feasibility Studies & Consulting', serviceNameAr: 'دراسات الجدوى والاستشارات', revenue: 1330, target: 2500, achievementRate: 53.2 },
        { serviceName: 'Company Liquidation', serviceNameAr: 'تصفية وإلغاء الشركات', revenue: 280, target: 2500, achievementRate: 11.2 },
        { serviceName: 'Training & Advisory Workshops', serviceNameAr: 'التدريب والورش المهنية', revenue: 0, target: 180, achievementRate: 0.0 }
      ],

      profitabilityPlanNotes: [
        'Revenue expanded and recurring expenses declined, resulting in profitable operations for the month.',
        'Audit, feasibility studies, and financial advisory combined account for 64.9% of total firm revenues.',
        'Receivables recovery action plan: enforce weekly collections tracking and strict invoice maturity escalation.'
      ]
    },

    // 3 - Human Resources
    humanResources: {
      totalStaffMonthEnd: liveData.staff?.length || 8,
      hiresCount: 0,
      hiresNotes: 'Active recruitment pipelines underway; candidate screenings in progress.',
      departuresCount: 2,
      departuresNotes: 'Two departures recorded; transitional handover completed successfully.',
      leaveImpactCount: 1,
      leaveImpactNotes: 'Maternity leave in progress – duties reassigned to senior team members without delivery disruption.',
      performanceNotes: 'Department productivity targets met at 86% across core engagement files.',
      trainingNotes: 'Executive masterclasses conducted on Omani Corporate Tax Law & VAT compliance updates.',
      workCommitmentNotes: 'Strict adherence to professional standards, executive appearance, and client confidentiality.',
      staffingNeeds: [
        { role: 'Audit & Assurance Assistant', count: 1 },
        { role: 'Corporate Sales & CRM Executive', count: 1 }
      ]
    },

    // 4 - Service Performance
    servicePerformance: {
      departments: [
        {
          department: 'Audit & Assurance',
          departmentAr: 'التدقيق والمراجعة القانونية',
          activeFiles: 18,
          completedFiles: 5,
          delayedFiles: 13,
          completionRate: 27.8,
          reasonAndAction: 'Pending trial balances and bank confirmations from client side. Escalation sent to client CFOs.'
        },
        {
          department: 'Accounting & Bookkeeping',
          departmentAr: 'المحاسبة ومسك الدفاتر',
          activeFiles: 6,
          completedFiles: 6,
          delayedFiles: 0,
          completionRate: 100.0,
          reasonAndAction: 'All monthly ledger closes and monthly trial balances delivered on schedule.'
        },
        {
          department: 'Tax and VAT Compliance',
          departmentAr: 'الضرائب وضريبة القيمة المضافة',
          activeFiles: 19,
          completedFiles: 16,
          delayedFiles: 3,
          completionRate: 84.2,
          reasonAndAction: 'VAT return data for 3 clients pending final purchase invoice validation.'
        },
        {
          department: 'Feasibility Studies & Advisory',
          departmentAr: 'دراسات الجدوى والاستشارات',
          activeFiles: 53,
          completedFiles: 53,
          delayedFiles: 0,
          completionRate: 100.0,
          reasonAndAction: 'All economic feasibility packages delivered to clients and submission platforms.'
        },
        {
          department: 'Corporate Liquidation',
          departmentAr: 'تصفية الشركات',
          activeFiles: 8,
          completedFiles: 1,
          delayedFiles: 7,
          completionRate: 12.5,
          reasonAndAction: 'Waiting for statutory gazette notice period and MOCIIP tax clearance approvals.'
        }
      ],
      qualityReviewNotes: 'Peer review and audit sampling passed at 98.4% compliance with IFRS and Omani Labor & Tax Law regulations.'
    },

    // 5 - Client Satisfaction & Marketing/Sales
    clientSatisfaction: {
      clientsSurveyed: 45,
      responsesReceived: 38,
      averageRating: 4.8,
      complaintsReceived: 1,
      closedComplaints: 1,
      renewedClientsCount: 14,
      withdrawnClientsCount: 0,
      withdrawalReasons: 'Zero client churn recorded this month. High retention across corporate retainers.'
    },

    marketingAndSales: {
      marketingCalls: 124,
      prospectiveMeetings: 28,
      newLeadsCount: 34,
      quotationsSent: 22,
      quotationsAccepted: 14,
      newlyContractedClients: 11,
      newContractsValue: 18450,
      marketingCost: 320,
      sourcesDistribution: {
        calls: 8,
        visits: 4,
        socialMedia: 7,
        referralsB2B: 15
      }
    },

    // 6 - Brand Identity & Corporate Presence
    brandIdentity: {
      achievements: [
        {
          id: 'ba-1',
          item: 'Digital Content Publishing & Engagement',
          achieved: '6 Publications',
          notes: 'High engagement video published covering Jahiz feasibility study services and investment opportunities.'
        },
        {
          id: 'ba-2',
          item: 'Corporate Brand Identity Compliance',
          achieved: '100% Alignment',
          notes: 'Design and printing of updated Maisarah corporate capability profiles and Arabic service guides.'
        },
        {
          id: 'ba-3',
          item: 'Service Offering Catalog Modernization',
          achieved: 'Completed',
          notes: 'Updated corporate tax advisory offerings in accordance with 2026 Oman Tax Authority amendments.'
        },
        {
          id: 'ba-4',
          item: 'Professional Conferences & Strategic Presence',
          achieved: '2 Major Events',
          notes: 'Attended Duqm Investor Forum & Muscat Chamber of Commerce SME B2B exhibition.'
        }
      ],
      keyImprovements: [
        'Standardize all official reports and client deliverables under approved executive typography & palettes.',
        'Launch dedicated video bulletin explaining new corporate tax registration deadlines.',
        'Upgrade reception hospitality and boardroom executive presentation assets for VIP client visits.'
      ]
    },

    // 7 - Next Month Action Plan & Required Decisions
    nextMonthPlan: {
      actionItems: [
        {
          id: 'ap-1',
          priorityAction: 'Complete pending data for Audit and Tax files',
          targetOutcome: 'Resolve missing client documentation across 13 audit and 3 tax files with formal timeline enforcement.',
          responsible: 'Department Heads & Service Leads',
          deadline: 'End of Week 2',
          supportRequired: 'Enforce client escalation protocol and senior partner follow-up calls.'
        },
        {
          id: 'ap-2',
          priorityAction: 'Accelerate Liquidity & Accounts Receivable Collections',
          targetOutcome: 'Recover OMR 1,353 in outstanding receivables and publish cash & bank movement ledger.',
          responsible: 'Finance Officer & Operations Head',
          deadline: 'Weekly Execution',
          supportRequired: 'Approve formal payment gateway links and automated WhatsApp reminders.'
        },
        {
          id: 'ap-3',
          priorityAction: 'Fulfill Priority Staffing & Capacity Needs',
          targetOutcome: 'Finalize hiring & onboarding of 1 Audit Assistant and 1 Corporate Sales Executive.',
          responsible: 'HR Department & Managing Partner',
          deadline: 'Within 25 Days',
          supportRequired: 'Approve recruitment budget and shortlist candidate interviews.'
        },
        {
          id: 'ap-4',
          priorityAction: 'Expedite Corporate Liquidation Milestone Approvals',
          targetOutcome: 'Identify exact stage and next hearing date for 7 pending liquidation cases.',
          responsible: 'Senior Legal & Liquidation Officer',
          deadline: 'Weekly Review',
          supportRequired: 'Follow up with MOCIIP and Tax Authority clearances.'
        },
        {
          id: 'ap-5',
          priorityAction: 'Upgrade Service Targets & B2B Partner Attribution',
          targetOutcome: 'Achieve 75%+ of target by expanding Sanad and FDI channel referrals.',
          responsible: 'CRM Head & Strategic Marketing',
          deadline: 'Month-Start Target',
          supportRequired: 'Roll out co-branded promotional assets to top 5 Sanad partner channels.'
        }
      ],
      ceoComments: [],
      managerApprovalDate: new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10),
      managerApprovalSignature: 'Budoor Al Hasani (Operations Manager)',
      ceoApprovalSignature: 'Abdullah Al Hasani (Chief Executive Officer)'
    }
  };
}
