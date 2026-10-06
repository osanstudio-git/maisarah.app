export interface ServiceRevenueItem {
  serviceName: string;
  serviceNameAr?: string;
  revenue: number;
  target: number;
  achievementRate: number;
}

export interface DepartmentServiceProgress {
  department: string;
  departmentAr?: string;
  activeFiles: number;
  completedFiles: number;
  delayedFiles: number;
  completionRate: number;
  reasonAndAction: string;
}

export interface NextMonthActionItem {
  id: string;
  priorityAction: string;
  targetOutcome: string;
  responsible: string;
  deadline: string;
  supportRequired: string;
}

export interface BrandAchievementItem {
  id: string;
  item: string;
  achieved: string | number;
  notes: string;
}

export interface MonthlyPerformanceReportData {
  id: string;
  month: number; // 0-11
  year: number;
  reportDate: string;
  referenceNumber: string;
  managerName: string;
  departmentScope: string;

  // 1. Executive Summary
  executiveSummary: {
    totalRevenue: number;
    numberOfServices: number;
    newClientsCount: number;
    netProfit: number;
    revenueGrowthPercent: number;
    expenseReductionPercent: number;
    keyAchievements: string[];
    keyChallenges: string[];
  };

  // 2. Financial Performance
  financialPerformance: {
    currentRevenue: number;
    previousRevenue: number;
    revenueChangePercent: number;

    currentExpenses: number;
    previousExpenses: number;
    expensesChangePercent: number;

    currentProfit: number;
    previousProfit: number;
    profitMarginPercent: number;

    collectedFromClients: number;
    previousCollected: number;
    collectionGrowthPercent: number;

    uncollectedReceivables: number;
    previousUncollected: number;
    overdueReceivables: number;

    cashBankBalance: number;
    previousCashBankBalance: number;

    revenueByService: ServiceRevenueItem[];
    profitabilityPlanNotes: string[];
  };

  // 3. Human Resources
  humanResources: {
    totalStaffMonthEnd: number;
    hiresCount: number;
    departuresCount: number;
    departuresNotes: string;
    leaveImpactCount: number;
    leaveImpactNotes: string;
    performanceNotes: string;
    trainingNotes: string;
    workCommitmentNotes: string;
    staffingNeeds: Array<{ role: string; count: number }>;
  };

  // 4. Service Performance
  servicePerformance: {
    departments: DepartmentServiceProgress[];
    qualityReviewNotes: string;
  };

  // 5. Client Satisfaction & Marketing/Sales
  clientSatisfaction: {
    clientsSurveyed: number;
    responsesReceived: number;
    averageRating: number; // out of 5
    complaintsReceived: number;
    closedComplaints: number;
    renewedClientsCount: number;
    withdrawnClientsCount: number;
    withdrawalReasons: string;
  };

  marketingAndSales: {
    marketingCalls: number;
    prospectiveMeetings: number;
    newLeadsCount: number;
    quotationsSent: number;
    quotationsAccepted: number;
    newlyContractedClients: number;
    newContractsValue: number;
    marketingCost: number;
    sourcesDistribution: {
      calls: number;
      visits: number;
      socialMedia: number;
      referralsB2B: number;
    };
  };

  // 6. Brand Identity & Corporate Presence
  brandIdentity: {
    achievements: BrandAchievementItem[];
    keyImprovements: string[];
  };

  // 7. Next Month's Plan and Required Decisions
  nextMonthPlan: {
    actionItems: NextMonthActionItem[];
    ceoComments: string[];
    managerApprovalDate: string;
    managerApprovalSignature: string;
    ceoApprovalSignature?: string;
  };
}
