import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useLanguage } from './hooks/useLanguage';
import { AuthProvider } from './hooks/useAuth';

// Layout & Protection
import { MainLayout } from './components/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import HODLayout from './components/HODLayout';

// Auth
import Login from './pages/Auth/Login';

// Original generic Dashboard (Fallback/Demo)
import Dashboard from './components/Dashboard';

const ComingSoon = () => (
  <div className="flex h-full items-center justify-center p-20 text-gray-400 font-bold text-2xl bg-gray-50/50 rounded-3xl m-6 border-2 border-dashed border-gray-200">
    Under Construction
  </div>
);

// Employee Views
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import ClientManager from './pages/Employee/ClientManager';
import InvoiceCreator from './pages/Employee/InvoiceCreator';
import Transactions from './pages/Employee/Transactions';
import ServicesManager from './pages/Employee/ServicesManager';
import EmployeeHR from './pages/Employee/EmployeeHR';

// Accountant Views
import AccountantDashboard from './pages/Accountant/AccountantDashboard';
import InvoiceManagement from './pages/Accountant/InvoiceManagement';
import ExpenseTracking from './pages/Accountant/ExpenseTracking';
import ClientPayments from './pages/Accountant/ClientPayments';

// Manager Views
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import EmployeeManagement from './pages/Manager/EmployeeManagement';
import SystemControl from './pages/Manager/SystemControl';
import DepartmentPerformance from './pages/Manager/DepartmentPerformance';
import ManagerServiceTracker from './pages/Manager/ServiceTracker';
import ClientManagement from './pages/Manager/ClientManagement';
import FinancialControl from './pages/Manager/FinancialControl';
import StrategicAnalytics from './pages/Manager/StrategicAnalytics';
import ExecutiveApprovals from './pages/Manager/ExecutiveApprovals';
import ExecutiveReports from './pages/Manager/ExecutiveReports';

// Department Head Views
import DepartmentHeadWorkspace from './pages/DepartmentHead/DepartmentHeadWorkspace';

// HR Views
import HRWorkspace from './pages/HR/HRWorkspace';

// CRM Views
import CRMPortal from './pages/CRM/CRMPortal';

// Client Views
import ClientDashboard from './pages/Client/ClientDashboard';
import ServiceTracker from './pages/Client/ServiceTracker';

// Shared Views
import Messaging from './pages/Shared/Messaging';
import DocumentVault from './pages/Shared/DocumentVault';

// Client specific versions of shared views
import ClientChat from './pages/Client/ClientChat';
import ClientVault from './pages/Client/DocumentVault';

// PWA & Network Components
import { InstallPrompt } from './components/InstallPrompt';
import { NetworkStatus } from './components/NetworkStatus';


function App() {
  useLanguage(); // Initialize language listener for document layout dir

  return (
    <AuthProvider>
      <NetworkStatus />
      <InstallPrompt />
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Default Redirect based on session happens in ProtectedRoute, but we can set a root fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected Routes wrapped in Layout */}
          <Route element={<MainLayout />}>

            {/* Employee Routes */}
            <Route element={<ProtectedRoute allowedRoles={['employee', 'manager']} />}>
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/clients" element={<ClientManager />} />
              <Route path="/employee/invoices" element={<InvoiceCreator />} />
              <Route path="/employee/tasks" element={<Transactions />} />
              <Route path="/employee/services" element={<ServicesManager />} />
              <Route path="/employee/hr" element={<EmployeeHR />} />
              <Route path="/employee/messages" element={<Messaging />} />
              <Route path="/employee/documents" element={<DocumentVault />} />
            </Route>

            {/* Accountant Routes */}
            <Route element={<ProtectedRoute allowedRoles={['accountant', 'manager']} />}>
              <Route path="/accountant" element={<AccountantDashboard />} />
              <Route path="/accountant/invoices" element={<InvoiceManagement />} />
              <Route path="/accountant/expenses" element={<ExpenseTracking />} />
              <Route path="/accountant/clients" element={<ClientPayments />} />
              <Route path="/accountant/messages" element={<Messaging />} />
              <Route path="/accountant/documents" element={<DocumentVault />} />
            </Route>

            {/* Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/operations" element={<ManagerServiceTracker />} />
              <Route path="/manager/finance" element={<FinancialControl />} />
              <Route path="/manager/clients" element={<ClientManagement />} />
              <Route path="/manager/departments" element={<DepartmentPerformance />} />
              <Route path="/manager/hr" element={<EmployeeManagement />} />
              <Route path="/manager/analytics" element={<StrategicAnalytics />} />
              <Route path="/manager/approvals" element={<ExecutiveApprovals />} />
              <Route path="/manager/reports" element={<ExecutiveReports />} />
              <Route path="/manager/activity-log" element={<SystemControl />} />
              <Route path="/manager/messages" element={<Messaging />} />
              <Route path="/manager/documents" element={<DocumentVault />} />
            </Route>

            {/* Department Head Routes */}
            <Route element={<ProtectedRoute allowedRoles={['department_head']} />}>
              <Route element={<HODLayout />}>
                <Route path="/hod/dashboard" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/team-leadership" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/work-routing" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/quality-control" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/client-directory" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/coordination" element={<DepartmentHeadWorkspace />} />
                <Route path="/hod/performance" element={<DepartmentHeadWorkspace />} />
              </Route>
            </Route>

            {/* HR Routes - All 15 Modules */}
            <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
              <Route path="/hr/dashboard" element={<HRWorkspace />} />
              <Route path="/hr/employees" element={<HRWorkspace />} />
              <Route path="/hr/attendance" element={<HRWorkspace />} />
              <Route path="/hr/leave" element={<HRWorkspace />} />
              <Route path="/hr/requests" element={<HRWorkspace />} />
              <Route path="/hr/payroll" element={<HRWorkspace />} />
              <Route path="/hr/performance" element={<HRWorkspace />} />
              <Route path="/hr/contracts" element={<HRWorkspace />} />
              <Route path="/hr/documents" element={<HRWorkspace />} />
              <Route path="/hr/disciplinary" element={<HRWorkspace />} />
              <Route path="/hr/recruitment" element={<HRWorkspace />} />
              <Route path="/hr/onboarding" element={<HRWorkspace />} />
              <Route path="/hr/termination" element={<HRWorkspace />} />
              <Route path="/hr/reports" element={<HRWorkspace />} />
              <Route path="/hr/ai" element={<HRWorkspace />} />
            </Route>

            {/* CRM Routes */}
            <Route element={<ProtectedRoute allowedRoles={['crm', 'manager']} />}>
              <Route path="/crm" element={<CRMPortal />} />
              <Route path="/crm/dashboard" element={<CRMPortal />} />
              <Route path="/crm/leads" element={<CRMPortal />} />
              <Route path="/crm/clients" element={<CRMPortal />} />
              <Route path="/crm/combo" element={<CRMPortal />} />
              <Route path="/crm/financials" element={<CRMPortal />} />
              <Route path="/crm/reminders" element={<CRMPortal />} />
              <Route path="/crm/club" element={<CRMPortal />} />
              <Route path="/crm/messages" element={<Messaging />} />
              <Route path="/crm/documents" element={<DocumentVault />} />
            </Route>

            {/* Client Routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/services" element={<ServiceTracker />} />
              <Route path="/client/messages" element={<ClientChat />} />
              <Route path="/client/documents" element={<ClientVault />} />
            </Route>

            {/* Generic Fallback Dashboard if needed */}
            <Route path="/dashboard" element={<Dashboard />} />

          </Route>

          {/* 404 Catch All */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
