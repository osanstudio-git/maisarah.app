import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  Landmark, UploadCloud, CheckCircle2, AlertTriangle, AlertCircle,
  FileSpreadsheet, Download, RefreshCw, ArrowRight, ArrowLeft, ShieldCheck,
  Search, Filter, Check, X, Sparkles, Plus, ExternalLink, Printer,
  FileText, Building2, HelpCircle, ChevronRight, Layers, ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getDSREntries, updateDSREntry, addDSREntry, type DSREntry
} from '../../utils/dsrSync';

export interface BankTransaction {
  id: string;
  date: string;
  valueDate?: string;
  description: string;
  reference: string;
  debit: number;
  credit: number; // Deposit amount
  balance?: number;
  bankName: string;
  channel?: 'POS' | 'Mobile Payment' | 'Bank Transfer' | 'Cash Deposit' | 'Fee' | 'Other';
  matchedDsrId?: string;
  matchConfidence?: number; // 0 - 100
  matchReason?: string;
  status: 'matched' | 'potential' | 'unmatched' | 'reconciled';
}

const STORAGE_SESSION_KEY = 'maisarah_bank_reconcile_session_v1';

export default function BankReconciliation() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Data State
  const [dsrEntries, setDsrEntries] = useState<DSREntry[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [selectedBank, setSelectedBank] = useState<'bank_muscat' | 'bank_dhofar' | 'nbo' | 'hsbc' | 'generic'>('bank_muscat');
  const [activeTab, setActiveTab] = useState<'all' | 'reconciled' | 'matched' | 'potential' | 'unmatched_bank' | 'unmatched_dsr'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual Matching Modal State
  const [matchingBankTxn, setMatchingBankTxn] = useState<BankTransaction | null>(null);
  const [showCreateDsrModal, setShowCreateDsrModal] = useState(false);
  const [newDsrFromTxn, setNewDsrFromTxn] = useState<BankTransaction | null>(null);
  const [createDsrForm, setCreateDsrForm] = useState({
    company_name: '',
    service: 'VAT / Tax Advisory',
    cr_number: '',
    employee_name: 'Shafnas',
    amount: 0,
    gov_fee: 0,
  });

  // Load DSR Data
  const loadDSR = () => {
    const data = getDSREntries();
    setDsrEntries(data);
  };

  useEffect(() => {
    loadDSR();
    const handleSync = () => loadDSR();
    window.addEventListener('maisarah_dsr_updated', handleSync);
    window.addEventListener('storage', handleSync);

    // Try loading saved session
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBankTransactions(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load reconciliation session:', err);
    }

    return () => {
      window.removeEventListener('maisarah_dsr_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (bankTransactions.length > 0) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(bankTransactions));
    }
  }, [bankTransactions]);

  // Show auto-dismiss notifications
  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  // -------------------------------------------------------------
  // SMART MATCHING ENGINE
  // -------------------------------------------------------------
  const runAutoMatching = (txns: BankTransaction[], currentDsr: DSREntry[]): BankTransaction[] => {
    return txns.map(tx => {
      // If already reconciled, preserve it
      if (tx.status === 'reconciled' && tx.matchedDsrId) {
        return tx;
      }

      // Ignore debit transactions (charges/fees) for revenue reconciliation
      if (tx.credit <= 0) {
        return {
          ...tx,
          status: 'unmatched',
          matchConfidence: 0,
          matchReason: isAr ? 'سحب / رسوم بنكية' : 'Bank charge / Debit',
        };
      }

      const txDate = new Date(tx.date).getTime();
      const descLower = tx.description.toLowerCase();

      // Find candidates in DSR with same or similar amount
      let bestMatch: DSREntry | null = null;
      let highestScore = 0;
      let reason = '';

      for (const dsr of currentDsr) {
        let score = 0;
        let matchPoints = [];

        // 1. Amount match (Priority #1)
        const amountDiff = Math.abs(dsr.amount - tx.credit);
        if (amountDiff < 0.005) {
          score += 50;
          matchPoints.push(isAr ? 'المبلغ مطابق تماماً' : 'Exact Amount');
        } else if (amountDiff < 1.0) {
          score += 20;
          matchPoints.push(isAr ? 'المبلغ متقارب' : 'Close Amount');
        }

        // 2. Date proximity match (within ±7 days)
        const dsrDateStr = dsr.payment_date || dsr.date;
        if (dsrDateStr) {
          const dsrTime = new Date(dsrDateStr).getTime();
          const daysDiff = Math.abs(txDate - dsrTime) / (1000 * 60 * 60 * 24);
          if (daysDiff === 0) {
            score += 25;
            matchPoints.push(isAr ? 'نفس اليوم' : 'Same Day');
          } else if (daysDiff <= 3) {
            score += 20;
            matchPoints.push(isAr ? 'خلال 3 أيام' : 'Within 3 days');
          } else if (daysDiff <= 7) {
            score += 10;
            matchPoints.push(isAr ? 'خلال أسبوع' : 'Within 7 days');
          }
        }

        // 3. Name or CR in Narration
        const companyWords = dsr.company_name.toLowerCase().split(' ').filter(w => w.length > 2);
        const nameMatch = companyWords.some(w => descLower.includes(w));
        if (nameMatch) {
          score += 20;
          matchPoints.push(isAr ? 'اسم الشركة مذكور' : 'Company Name in Narration');
        }

        if (dsr.cr_number && dsr.cr_number.length > 3 && descLower.includes(dsr.cr_number)) {
          score += 20;
          matchPoints.push(isAr ? 'رقم السجل مطابق' : 'CR in Narration');
        }

        // 4. Payment channel match
        if (tx.channel && dsr.payment_method) {
          if (
            (tx.channel === 'POS' && dsr.payment_method === 'POS') ||
            (tx.channel === 'Mobile Payment' && dsr.payment_method === 'Mobile Payment') ||
            (tx.channel === 'Bank Transfer' && dsr.payment_method === 'Bank transfer')
          ) {
            score += 10;
            matchPoints.push(isAr ? 'طريقة الدفع مطابقة' : 'Payment Method Match');
          }
        }

        if (score > highestScore && score >= 50) {
          highestScore = score;
          bestMatch = dsr;
          reason = matchPoints.join(' • ');
        }
      }

      if (bestMatch) {
        const isHighConfidence = highestScore >= 80;
        return {
          ...tx,
          matchedDsrId: bestMatch.id,
          matchConfidence: Math.min(highestScore, 99),
          matchReason: reason,
          status: isHighConfidence ? 'matched' : 'potential',
        };
      }

      return {
        ...tx,
        matchedDsrId: undefined,
        matchConfidence: 0,
        matchReason: isAr ? 'لا يوجد قيد مطابق في سجل DSR' : 'No matching DSR entry found',
        status: 'unmatched',
      };
    });
  };

  // -------------------------------------------------------------
  // PARSE IMPORTED FILE (EXCEL / CSV)
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          notify('error', isAr ? 'الملف فارغ أو غير صالح' : 'File is empty or invalid format');
          setIsProcessing(false);
          return;
        }

        // Detect header row index
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const rowStr = (rows[i] || []).join(' ').toLowerCase();
          if (
            rowStr.includes('date') ||
            rowStr.includes('credit') ||
            rowStr.includes('deposit') ||
            rowStr.includes('description') ||
            rowStr.includes('particulars') ||
            rowStr.includes('تاريخ') ||
            rowStr.includes('إيداع')
          ) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (rows[headerRowIndex] || []).map((h: any) => String(h || '').trim().toLowerCase());
        
        // Find column indices
        const dateIdx = headers.findIndex((h: string) => h.includes('date') || h.includes('تاريخ'));
        const descIdx = headers.findIndex((h: string) => h.includes('desc') || h.includes('narr') || h.includes('partic') || h.includes('بيان') || h.includes('تفاصيل'));
        const refIdx = headers.findIndex((h: string) => h.includes('ref') || h.includes('cheque') || h.includes('مرجع') || h.includes('chq'));
        const creditIdx = headers.findIndex((h: string) => h.includes('credit') || h.includes('deposit') || h.includes('إيداع') || h.includes('له') || h.includes('cr'));
        const debitIdx = headers.findIndex((h: string) => h.includes('debit') || h.includes('withdraw') || h.includes('سحب') || h.includes('منه') || h.includes('dr'));
        const balanceIdx = headers.findIndex((h: string) => h.includes('balance') || h.includes('رصيد'));

        const parsedTxns: BankTransaction[] = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawDate = row[dateIdx !== -1 ? dateIdx : 0];
          const rawDesc = String(row[descIdx !== -1 ? descIdx : 1] || '').trim();
          const rawRef = String(row[refIdx !== -1 ? refIdx : 2] || `REF-${Date.now()}-${i}`).trim();
          
          let credit = 0;
          let debit = 0;

          if (creditIdx !== -1) {
            credit = parseFloat(String(row[creditIdx] || '0').replace(/[^0-9.-]/g, '')) || 0;
          }
          if (debitIdx !== -1) {
            debit = parseFloat(String(row[debitIdx] || '0').replace(/[^0-9.-]/g, '')) || 0;
          }

          // Format Date
          let dateStr = new Date().toISOString().split('T')[0];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              // Excel date serial number
              const d = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
              dateStr = d.toISOString().split('T')[0];
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
              }
            }
          }

          // Determine Channel
          let channel: BankTransaction['channel'] = 'Other';
          const lower = rawDesc.toLowerCase();
          if (lower.includes('pos') || lower.includes('point of sale') || lower.includes('نقطة بيع')) channel = 'POS';
          else if (lower.includes('mobile') || lower.includes('p2p') || lower.includes('phone') || lower.includes('موبايل')) channel = 'Mobile Payment';
          else if (lower.includes('transfer') || lower.includes('ach') || lower.includes('swift') || lower.includes('تحويل')) channel = 'Bank Transfer';
          else if (lower.includes('cash') || lower.includes('cdm') || lower.includes('نقدي')) channel = 'Cash Deposit';
          else if (debit > 0 && (lower.includes('fee') || lower.includes('vat') || lower.includes('charge'))) channel = 'Fee';

          if (credit > 0 || debit > 0) {
            parsedTxns.push({
              id: `bank-${Date.now()}-${i}`,
              date: dateStr,
              description: rawDesc || 'Bank Transaction',
              reference: rawRef,
              credit,
              debit,
              balance: balanceIdx !== -1 ? parseFloat(String(row[balanceIdx] || '0').replace(/[^0-9.-]/g, '')) || undefined : undefined,
              bankName: selectedBank === 'bank_muscat' ? 'Bank Muscat' : selectedBank === 'bank_dhofar' ? 'Bank Dhofar' : 'Oman Bank',
              channel,
              status: 'unmatched',
            });
          }
        }

        if (parsedTxns.length === 0) {
          notify('error', isAr ? 'لم يتم العثور على حركات مالية صالحة في الملف' : 'No valid financial transactions found in the file');
          setIsProcessing(false);
          return;
        }

        // Run auto matching
        const matched = runAutoMatching(parsedTxns, dsrEntries);
        setBankTransactions(matched);
        notify('success', isAr ? `تم استيراد ${parsedTxns.length} حركة بنكية بنجاح مع المطابقة الآلية` : `Successfully imported ${parsedTxns.length} bank transactions with auto-matching`);
      } catch (err: any) {
        console.error(err);
        notify('error', isAr ? 'حدث خطأ أثناء قراءة ملف الكشف البنكي' : 'Error reading bank statement file');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // -------------------------------------------------------------
  // LOAD REALISTIC SAMPLE BANK MUSCAT STATEMENT (DEMO DATA)
  // -------------------------------------------------------------
  const loadDemoBankMuscat = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const demo: BankTransaction[] = [
        {
          id: 'demo-bm-001',
          date: '2026-08-04',
          description: 'TRANSFER FROM JABAL AL HADEED TRADING CR OM1100244153',
          reference: 'BM-TRF-984421',
          debit: 0,
          credit: 30.000,
          balance: 14250.350,
          bankName: 'Bank Muscat',
          channel: 'Mobile Payment',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-002',
          date: '2026-08-05',
          description: 'MOBILE PAY OSBIC ALDAWAHI INVOICE SETTLEMENT',
          reference: 'MPAY-882910',
          debit: 0,
          credit: 25.000,
          balance: 14275.350,
          bankName: 'Bank Muscat',
          channel: 'Mobile Payment',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-003',
          date: '2026-08-06',
          description: 'POS TERMINAL 54821 - ETTELAL AL KHALEEJ VAT DEPOSIT',
          reference: 'POS-TX-7741',
          debit: 0,
          credit: 75.000,
          balance: 14350.350,
          bankName: 'Bank Muscat',
          channel: 'POS',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-004',
          date: '2026-08-02',
          description: 'SALAH FAROQ LIQUIDATION AUDIT SERVICE PMT',
          reference: 'BM-ACH-441209',
          debit: 0,
          credit: 175.000,
          balance: 14525.350,
          bankName: 'Bank Muscat',
          channel: 'Bank Transfer',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-005',
          date: '2026-08-02',
          description: 'TRANSFER ABDUARHMAN FEASIBILITY STUDY',
          reference: 'BM-TRF-16638',
          debit: 0,
          credit: 30.000,
          balance: 14555.350,
          bankName: 'Bank Muscat',
          channel: 'Mobile Payment',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-006',
          date: '2026-08-04',
          description: 'TRANSFER QUALITY SERVICES AND TRADING CR 1592723',
          reference: 'BM-TRF-90918',
          debit: 0,
          credit: 10.000,
          balance: 14565.350,
          bankName: 'Bank Muscat',
          channel: 'Bank Transfer',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-007',
          date: '2026-08-05',
          description: 'AZHAAR KSA AUDIT OSBIC AYOOB REF 1454255',
          reference: 'BM-TRF-55102',
          debit: 0,
          credit: 60.000,
          balance: 14625.350,
          bankName: 'Bank Muscat',
          channel: 'Mobile Payment',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-008',
          date: '2026-08-06',
          description: 'POS SETTLEMENT - URBAN CREW INVESTMENT PARTIAL PMT',
          reference: 'POS-TX-9932',
          debit: 0,
          credit: 75.000,
          balance: 14700.350,
          bankName: 'Bank Muscat',
          channel: 'POS',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-009',
          date: '2026-08-07',
          description: 'UNIDENTIFIED CUSTOMER DIRECT DEPOSIT AT CDM NIZWA BRANCH',
          reference: 'CDM-DEP-0044',
          debit: 0,
          credit: 140.000,
          balance: 14840.350,
          bankName: 'Bank Muscat',
          channel: 'Cash Deposit',
          status: 'unmatched',
        },
        {
          id: 'demo-bm-010',
          date: '2026-08-01',
          description: 'BANK SERVICE CHARGE & SMS ALERT MONTHLY FEE',
          reference: 'CHG-AUG-01',
          debit: 2.100,
          credit: 0,
          balance: 14838.250,
          bankName: 'Bank Muscat',
          channel: 'Fee',
          status: 'unmatched',
        }
      ];

      const matched = runAutoMatching(demo, dsrEntries);
      setBankTransactions(matched);
      setIsProcessing(false);
      notify('success', isAr ? 'تم تحميل كشف حساب بنك مسقط التجريبي وتطبيق المطابقة الذكية' : 'Loaded Bank Muscat demo statement and applied smart matching');
    }, 400);
  };

  // -------------------------------------------------------------
  // RECONCILIATION ACTIONS
  // -------------------------------------------------------------

  // Single Confirm
  const handleConfirmReconcile = (txn: BankTransaction) => {
    if (!txn.matchedDsrId) return;

    // Update DSR Entry
    updateDSREntry(txn.matchedDsrId, {
      reconciled: true,
      reconciled_at: new Date().toISOString(),
      verified_by_accountant: true,
      bank_reference: txn.reference,
      bank_name: txn.bankName,
      status: 'Paid',
      payment_date: txn.date,
      accountant_note: `Reconciled with ${txn.bankName} (Ref: ${txn.reference})`,
    });

    // Update local state
    setBankTransactions(prev =>
      prev.map(t => (t.id === txn.id ? { ...t, status: 'reconciled' } : t))
    );

    loadDSR();
    notify('success', isAr ? `تم تأكيد مطابقة العملية ${txn.reference} وقفل القيد بنجاح` : `Reconciled transaction ${txn.reference} successfully`);
  };

  // 1-Click Auto Reconcile All High Confidence Matches
  const handleAutoReconcileAll = () => {
    const readyToReconcile = bankTransactions.filter(
      t => t.status === 'matched' && t.matchedDsrId && (t.matchConfidence || 0) >= 80
    );

    if (readyToReconcile.length === 0) {
      notify('info', isAr ? 'لا توجد حركات مؤهلة للمطابقة الفورية التلقائية' : 'No transactions eligible for 1-click auto reconciliation');
      return;
    }

    let count = 0;
    readyToReconcile.forEach(txn => {
      if (txn.matchedDsrId) {
        updateDSREntry(txn.matchedDsrId, {
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          verified_by_accountant: true,
          bank_reference: txn.reference,
          bank_name: txn.bankName,
          status: 'Paid',
          payment_date: txn.date,
          accountant_note: `Auto-reconciled with ${txn.bankName} (Ref: ${txn.reference})`,
        });
        count++;
      }
    });

    setBankTransactions(prev =>
      prev.map(t => {
        if (t.status === 'matched' && t.matchedDsrId && (t.matchConfidence || 0) >= 80) {
          return { ...t, status: 'reconciled' };
        }
        return t;
      })
    );

    loadDSR();
    notify('success', isAr ? `تمت مطابقة وتأكيد ${count} حركة بنكية دفعة واحدة بنجاح!` : `Successfully auto-reconciled ${count} transactions in one click!`);
  };

  // Un-reconcile
  const handleUnreconcile = (txn: BankTransaction) => {
    if (txn.matchedDsrId) {
      updateDSREntry(txn.matchedDsrId, {
        reconciled: false,
        reconciled_at: undefined,
        bank_reference: undefined,
      });
    }

    setBankTransactions(prev =>
      prev.map(t => (t.id === txn.id ? { ...t, status: 'matched' } : t))
    );
    loadDSR();
    notify('info', isAr ? 'تم إلغاء المطابقة للحركة البنكية' : 'Un-reconciled transaction');
  };

  // Manual Match Selection
  const handleAssignManualMatch = (txnId: string, dsrId: string) => {
    const dsr = dsrEntries.find(d => d.id === dsrId);
    if (!dsr) return;

    setBankTransactions(prev =>
      prev.map(t => {
        if (t.id === txnId) {
          return {
            ...t,
            matchedDsrId: dsr.id,
            matchConfidence: 95,
            matchReason: isAr ? 'مطابقة يدوية من المحاسب' : 'Manual accountant link',
            status: 'matched',
          };
        }
        return t;
      })
    );

    setMatchingBankTxn(null);
    notify('success', isAr ? 'تم ربط الحركة البنكية بالقيد المختار بنجاح' : 'Manually linked transaction to selected DSR record');
  };

  // Create DSR Record from Unmatched Bank Deposit
  const handleOpenCreateDsrModal = (txn: BankTransaction) => {
    setNewDsrFromTxn(txn);
    setCreateDsrForm({
      company_name: txn.description.slice(0, 35),
      service: 'Financial / Tax Consultation',
      cr_number: '',
      employee_name: 'Shafnas',
      amount: txn.credit,
      gov_fee: 0,
    });
    setShowCreateDsrModal(true);
  };

  const handleSaveDsrFromTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDsrFromTxn) return;

    const newDsr = addDSREntry({
      date: newDsrFromTxn.date,
      company_name: createDsrForm.company_name || 'Direct Bank Customer',
      service: createDsrForm.service,
      cr_number: createDsrForm.cr_number,
      employee_name: createDsrForm.employee_name,
      amount: Number(createDsrForm.amount),
      gov_fee: Number(createDsrForm.gov_fee),
      status: 'Paid',
      payment_date: newDsrFromTxn.date,
      payment_method: newDsrFromTxn.channel === 'POS' ? 'POS' : newDsrFromTxn.channel === 'Mobile Payment' ? 'Mobile Payment' : 'Bank transfer',
      accountant_note: `Created from Bank Deposit Ref: ${newDsrFromTxn.reference}`,
      invoice_issued: false,
      reconciled: true,
      reconciled_at: new Date().toISOString(),
      bank_reference: newDsrFromTxn.reference,
      bank_name: newDsrFromTxn.bankName,
      verified_by_accountant: true,
    });

    setBankTransactions(prev =>
      prev.map(t =>
        t.id === newDsrFromTxn.id
          ? {
              ...t,
              matchedDsrId: newDsr.id,
              matchConfidence: 100,
              matchReason: isAr ? 'تم إنشاء القيد مباشرة من الإيداع' : 'Created DSR from Bank Deposit',
              status: 'reconciled',
            }
          : t
      )
    );

    loadDSR();
    setShowCreateDsrModal(false);
    setNewDsrFromTxn(null);
    notify('success', isAr ? 'تم إنشاء قيد DSR ومطابقته فورياً بالبنك' : 'Created DSR entry and auto-reconciled with bank deposit');
  };

  // -------------------------------------------------------------
  // EXPORT FULL RECONCILIATION AUDIT REPORT (.XLSX)
  // -------------------------------------------------------------
  const exportReconciliationReport = () => {
    if (bankTransactions.length === 0) {
      notify('error', isAr ? 'لا توجد بيانات كشف حساب للتصدير' : 'No reconciliation data to export');
      return;
    }

    const matchedRecords = bankTransactions
      .filter(t => t.matchedDsrId)
      .map(t => {
        const dsr = dsrEntries.find(d => d.id === t.matchedDsrId);
        return {
          'Bank Date': t.date,
          'Bank Description': t.description,
          'Bank Reference': t.reference,
          'Bank Deposit (OMR)': t.credit.toFixed(3),
          'DSR Service': dsr?.service || '',
          'DSR Client': dsr?.company_name || '',
          'DSR Amount (OMR)': dsr?.amount ? dsr.amount.toFixed(3) : '',
          'DSR Employee': dsr?.employee_name || '',
          'Match Status': t.status.toUpperCase(),
          'Confidence': `${t.matchConfidence || 0}%`,
          'Audit Reason': t.matchReason || '',
        };
      });

    const unmatchedBank = bankTransactions
      .filter(t => t.credit > 0 && !t.matchedDsrId)
      .map(t => ({
        'Bank Date': t.date,
        'Bank Description': t.description,
        'Bank Reference': t.reference,
        'Deposit Amount (OMR)': t.credit.toFixed(3),
        'Channel': t.channel || 'Other',
        'Status': 'PENDING ALLOCATION',
      }));

    const unmatchedDsr = dsrEntries
      .filter(d => !d.reconciled)
      .map(d => ({
        'DSR Date': d.date,
        'Client': d.company_name,
        'Service': d.service,
        'Amount (OMR)': d.amount.toFixed(3),
        'DSR Status': d.status,
        'Payment Method': d.payment_method,
        'Payment Date': d.payment_date,
        'Audit Verification': d.verified_by_accountant ? 'VERIFIED' : 'PENDING',
      }));

    const summaryData = [
      { 'Metric': 'Bank Organization', 'Value': selectedBank.toUpperCase() },
      { 'Metric': 'Total Bank Deposits (OMR)', 'Value': stats.totalBankCredits.toFixed(3) },
      { 'Metric': 'Total Reconciled Amount (OMR)', 'Value': stats.reconciledAmount.toFixed(3) },
      { 'Metric': 'Unmatched Bank Deposits (OMR)', 'Value': stats.unmatchedBankAmount.toFixed(3) },
      { 'Metric': 'Total Bank Transactions', 'Value': bankTransactions.length },
      { 'Metric': 'Reconciled Count', 'Value': stats.reconciledCount },
      { 'Metric': 'Auto-Matched Count', 'Value': stats.matchedCount },
      { 'Metric': 'Reconciliation Progress', 'Value': `${stats.reconciliationRate}%` },
      { 'Metric': 'Audit Report Date', 'Value': new Date().toISOString() },
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsMatched = XLSX.utils.json_to_sheet(matchedRecords.length > 0 ? matchedRecords : [{ 'Note': 'No matched records' }]);
    const wsUnmatchedBank = XLSX.utils.json_to_sheet(unmatchedBank.length > 0 ? unmatchedBank : [{ 'Note': 'No unmatched bank deposits' }]);
    const wsUnmatchedDsr = XLSX.utils.json_to_sheet(unmatchedDsr.length > 0 ? unmatchedDsr : [{ 'Note': 'All DSR entries reconciled' }]);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Report');
    XLSX.utils.book_append_sheet(wb, wsMatched, 'Reconciled & Matched');
    XLSX.utils.book_append_sheet(wb, wsUnmatchedBank, 'Unmatched Deposits');
    XLSX.utils.book_append_sheet(wb, wsUnmatchedDsr, 'Unreconciled DSR');

    const fileName = `Maisarah_Bank_Reconciliation_${selectedBank}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify('success', isAr ? `تم تصدير تقرير التسوية والمطابقة البنكية: ${fileName}` : `Exported reconciliation report: ${fileName}`);
  };

  // Download Bank Muscat Template
  const downloadBankTemplate = () => {
    const templateData = [
      {
        'Transaction Date': '2026-10-15',
        'Value Date': '2026-10-15',
        'Description / Narration': 'POS TERMINAL 8829 - COMPANY NAME LLC',
        'Cheque / Ref No': 'BM-84821',
        'Debit (Withdrawal)': 0.000,
        'Credit (Deposit)': 30.000,
        'Balance': 15200.000,
      },
      {
        'Transaction Date': '2026-10-16',
        'Value Date': '2026-10-16',
        'Description / Narration': 'MOBILE PAY CLIENT CR 1454255',
        'Cheque / Ref No': 'MPAY-9941',
        'Debit (Withdrawal)': 0.000,
        'Credit (Deposit)': 75.000,
        'Balance': 15275.000,
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement Template');
    XLSX.writeFile(wb, 'Maisarah_Bank_Statement_Template.xlsx');
  };

  // -------------------------------------------------------------
  // STATS & FILTER COMPUTATION
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    const depositTxns = bankTransactions.filter(t => t.credit > 0);
    const totalBankCredits = depositTxns.reduce((acc, t) => acc + t.credit, 0);

    const reconciledTxns = depositTxns.filter(t => t.status === 'reconciled');
    const reconciledAmount = reconciledTxns.reduce((acc, t) => acc + t.credit, 0);

    const matchedTxns = depositTxns.filter(t => t.status === 'matched');
    const potentialTxns = depositTxns.filter(t => t.status === 'potential');

    const unmatchedBankTxns = depositTxns.filter(t => t.status === 'unmatched');
    const unmatchedBankAmount = unmatchedBankTxns.reduce((acc, t) => acc + t.credit, 0);

    const unreconciledDsr = dsrEntries.filter(d => !d.reconciled);
    const unreconciledDsrAmount = unreconciledDsr.reduce((acc, d) => acc + d.amount, 0);

    const reconciliationRate = depositTxns.length > 0
      ? Math.round((reconciledTxns.length / depositTxns.length) * 100)
      : 0;

    return {
      totalCount: depositTxns.length,
      totalBankCredits,
      reconciledCount: reconciledTxns.length,
      reconciledAmount,
      matchedCount: matchedTxns.length,
      potentialCount: potentialTxns.length,
      unmatchedBankCount: unmatchedBankTxns.length,
      unmatchedBankAmount,
      unreconciledDsrCount: unreconciledDsr.length,
      unreconciledDsrAmount,
      reconciliationRate,
    };
  }, [bankTransactions, dsrEntries]);

  // Filtered transactions for active tab & search
  const filteredBankTxns = useMemo(() => {
    return bankTransactions.filter(tx => {
      // Tab filter
      if (activeTab === 'reconciled' && tx.status !== 'reconciled') return false;
      if (activeTab === 'matched' && tx.status !== 'matched') return false;
      if (activeTab === 'potential' && tx.status !== 'potential') return false;
      if (activeTab === 'unmatched_bank' && (tx.status !== 'unmatched' || tx.credit <= 0)) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(q);
        const refMatch = tx.reference.toLowerCase().includes(q);
        const amtMatch = tx.credit.toString().includes(q);
        const dsr = tx.matchedDsrId ? dsrEntries.find(d => d.id === tx.matchedDsrId) : null;
        const companyMatch = dsr?.company_name.toLowerCase().includes(q);
        return descMatch || refMatch || amtMatch || companyMatch;
      }
      return true;
    });
  }, [bankTransactions, activeTab, searchTerm, dsrEntries]);

  // Unreconciled DSR records list for Tab 5
  const unreconciledDsrList = useMemo(() => {
    return dsrEntries.filter(d => {
      if (d.reconciled) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          d.company_name.toLowerCase().includes(q) ||
          d.service.toLowerCase().includes(q) ||
          d.amount.toString().includes(q) ||
          d.cr_number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dsrEntries, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Return to DSR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/accountant/dsr"
            className="flex items-center gap-1.5 text-xs font-bold text-red-900 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors border border-red-200"
          >
            {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {isAr ? 'العودة لسجل الخدمات DSR' : 'Back to DSR Register'}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isAr ? 'المطابقة والتسوية البنكية الآلية' : 'Bank Reconciliation Studio'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={downloadBankTemplate}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl transition shadow-sm"
          >
            <Download size={14} />
            {isAr ? 'تحميل نموذج الكشف' : 'Download Template'}
          </button>

          <button
            onClick={exportReconciliationReport}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet size={15} />
            {isAr ? 'تصدير تقرير التسوية (.xlsx)' : 'Export Reconciliation (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Hero Banner with Bank Branding */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-red-200 text-xs font-semibold border border-white/15">
              <Landmark size={14} />
              {isAr ? 'نظام المطابقة البنكية التلقائي لسلطنة عمان' : 'Automated Oman Bank Reconciliation Engine'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isAr ? 'المطابقة البنكية الذكية والتسوية الفورية' : 'Smart Bank Statement Auto-Reconciliation'}
            </h1>
            <p className="text-xs sm:text-sm text-red-100 font-light leading-relaxed">
              {isAr
                ? 'استورد كشوفات بنك مسقط أو البنوك العمانية (.xlsx / .csv). يقوم النظام بمطابقة الإيداعات والتحويلات مع قيود DSR آلياً بنقرة واحدة بدلاً من إجراءات تالي اليدوية المعقدة.'
                : 'Import Bank Muscat or Omani bank statements (.xlsx / .csv). Auto-detect customer deposits, match with DSR records in 1-click, and eliminate manual Tally BRS headaches.'}
            </p>
          </div>

          {/* Quick Demo & File Import Triggers */}
          <div className="flex flex-wrap lg:flex-col items-stretch gap-3 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-red-50 text-red-950 rounded-2xl text-sm font-extrabold shadow-lg transition-all transform active:scale-95 border border-white"
            >
              <UploadCloud size={18} className="text-red-700" />
              {isProcessing ? (isAr ? 'جاري التحليل...' : 'Analyzing File...') : (isAr ? 'رفع كشف حساب بنكي (إكسل/CSV)' : 'Upload Bank Statement (Excel/CSV)')}
            </button>

            <button
              onClick={loadDemoBankMuscat}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold backdrop-blur-md border border-white/20 transition-all"
            >
              <Sparkles size={14} className="text-amber-400" />
              {isAr ? 'تحميل كشف تجريبي لبنك مسقط' : 'Load Bank Muscat Demo Statement'}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-md ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-blue-50 text-blue-900 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI & Reconciliation Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Bank Deposits */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي إيداعات البنك' : 'Bank Total Deposits'}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">OMR {stats.totalBankCredits.toFixed(3)}</p>
          <span className="text-[10px] text-gray-400">{stats.totalCount} {isAr ? 'حركة بنكية' : 'transactions'}</span>
        </div>

        {/* Reconciled Amount */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
          <p className="text-xs text-emerald-700 font-medium">{isAr ? 'تمت مطابقتها وقفلها' : 'Reconciled & Locked'}</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">OMR {stats.reconciledAmount.toFixed(3)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{stats.reconciledCount} {isAr ? 'قيد مطابق' : 'settled'}</span>
        </div>

        {/* Ready to Reconcile (Auto-Matched) */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-sm">
          <p className="text-xs text-blue-700 font-medium">{isAr ? 'مطابقة آلية جاهزة' : 'Auto-Matched Ready'}</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{stats.matchedCount}</p>
          <span className="text-[10px] text-blue-500">{isAr ? 'ثقة عالية (1-Click)' : 'High Confidence'}</span>
        </div>

        {/* Review Required (Potential) */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-sm">
          <p className="text-xs text-amber-700 font-medium">{isAr ? 'بحاجة للمراجعة' : 'Needs Review'}</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.potentialCount}</p>
          <span className="text-[10px] text-amber-600">{isAr ? 'مطابقة تقريبية' : 'Partial matches'}</span>
        </div>

        {/* Unmatched Bank Deposits */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-sm">
          <p className="text-xs text-rose-700 font-medium">{isAr ? 'إيداعات بدون قيد DSR' : 'Unmatched Deposits'}</p>
          <p className="text-xl font-bold text-rose-600 mt-1">OMR {stats.unmatchedBankAmount.toFixed(3)}</p>
          <span className="text-[10px] text-rose-500">{stats.unmatchedBankCount} {isAr ? 'إيداع معلق' : 'in bank only'}</span>
        </div>

        {/* Reconciliation Progress */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{isAr ? 'نسبة إنجاز التسوية' : 'Reconciliation Rate'}</p>
            <p className="text-xl font-black text-red-900 mt-1">{stats.reconciliationRate}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-red-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.reconciliationRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Auto-Reconcile 1-Click Action Bar */}
      {stats.matchedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold shrink-0">
              <Sparkles size={20} className="text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {isAr ? 'تم العثور على حركات بنكية مطابقة بنسبة عالية!' : 'High-Confidence DSR Matches Detected!'}
              </h4>
              <p className="text-xs text-blue-100">
                {isAr
                  ? `يوجد ${stats.matchedCount} حركة إيداع مطابقة تماماً للمبالغ والتواريخ في سجل DSR. يمكنك اعتمادها وقفلها بنقرة واحدة.`
                  : `${stats.matchedCount} bank deposits match DSR amounts and dates with 80%+ confidence. Reconcile all in 1 click.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoReconcileAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
          >
            <CheckCircle2 size={16} />
            {isAr ? `تأكيد ومطابقة الكل (${stats.matchedCount})` : `1-Click Auto-Reconcile All (${stats.matchedCount})`}
          </button>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isAr ? 'جميع حركات الكشف' : 'All Bank Txns'} ({bankTransactions.length})
          </button>

          <button
            onClick={() => setActiveTab('matched')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'matched' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            {isAr ? 'جاهزة للمطابقة' : 'Ready to Match'} ({stats.matchedCount})
          </button>

          <button
            onClick={() => setActiveTab('potential')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'potential' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            {isAr ? 'تحتاج مراجعة' : 'Needs Review'} ({stats.potentialCount})
          </button>

          <button
            onClick={() => setActiveTab('reconciled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'reconciled' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 size={12} />
            {isAr ? 'تمت مطابقتها' : 'Reconciled'} ({stats.reconciledCount})
          </button>

          <button
            onClick={() => setActiveTab('unmatched_bank')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'unmatched_bank' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertCircle size={12} />
            {isAr ? 'إيداعات بدون قيد' : 'Unmatched in Bank'} ({stats.unmatchedBankCount})
          </button>

          <button
            onClick={() => setActiveTab('unmatched_dsr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'unmatched_dsr' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <FileSpreadsheet size={12} />
            {isAr ? 'قيود DSR غير مسواة' : 'Unsettled DSR'} ({stats.unreconciledDsrCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالبيان، المرجع، المبلغ...' : 'Search description, ref, amount...'}
            className="w-full text-xs pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-900/20 focus:border-red-900 transition"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: UNSETTLED DSR ENTRIES VIEW                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'unmatched_dsr' ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <FileSpreadsheet size={16} />
                {isAr ? 'قيود سجل DSR غير المطابقة مع البنك' : 'DSR Entries Awaiting Bank Settlement'}
              </h3>
              <p className="text-xs text-purple-700 mt-0.5">
                {isAr
                  ? 'تم تسجيل هذه الخدمات في سجل DSR كـ "مدفوع" أو "معلق"، ولكن لم يتم العثور على إيداع بنكي مطابق في الكشف الحالي.'
                  : 'Services recorded in DSR as Paid or Unpaid, but no corresponding bank deposit found in this statement.'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-900 text-xs font-black">
              OMR {stats.unreconciledDsrAmount.toFixed(3)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3">{isAr ? 'العميل' : 'Client / Company'}</th>
                  <th className="p-3">{isAr ? 'الخدمة' : 'Service'}</th>
                  <th className="p-3">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-3">{isAr ? 'حالة السداد' : 'Payment Status'}</th>
                  <th className="p-3">{isAr ? 'طريقة الدفع' : 'Method'}</th>
                  <th className="p-3">{isAr ? 'تاريخ الدفع' : 'Payment Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unreconciledDsrList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      {isAr ? '✓ جميع قيود DSR تمت تسويتها ومطابقتها بالبنك!' : '✓ All DSR records are reconciled with the bank!'}
                    </td>
                  </tr>
                ) : (
                  unreconciledDsrList.map(dsr => (
                    <tr key={dsr.id} className="hover:bg-purple-50/20 transition">
                      <td className="p-3 font-mono text-gray-500">{dsr.date}</td>
                      <td className="p-3 font-bold text-gray-900">{dsr.company_name}</td>
                      <td className="p-3 text-gray-600">{dsr.service}</td>
                      <td className="p-3 text-gray-600">{dsr.employee_name}</td>
                      <td className="p-3 font-bold text-blue-700">OMR {dsr.amount.toFixed(3)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dsr.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {dsr.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{dsr.payment_method || '—'}</td>
                      <td className="p-3 font-mono text-gray-500">{dsr.payment_date || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* TABS 1-4: BANK TRANSACTIONS MATCHING TABLE                   */
        /* ------------------------------------------------------------- */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {bankTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-900 mx-auto flex items-center justify-center shadow-inner">
                <Landmark size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {isAr ? 'لم يتم استيراد أي كشف حساب بنكي بعد' : 'No Bank Statement Loaded Yet'}
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  {isAr
                    ? 'قم برفع ملف إكسل أو CSV لكشف حساب بنك مسقط، أو اضغط على الزر أدناه لتجربة كشف حساب بنك مسقط التجريبي فوراً.'
                    : 'Upload an Excel or CSV file of your bank statement, or click below to load the realistic Bank Muscat demo statement.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-red-900 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <UploadCloud size={15} className="inline mr-1 rtl:ml-1" />
                  {isAr ? 'رفع ملف إكسل' : 'Upload Statement (.xlsx)'}
                </button>
                <button
                  onClick={loadDemoBankMuscat}
                  className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition"
                >
                  <Sparkles size={14} className="inline mr-1 rtl:ml-1 text-amber-600" />
                  {isAr ? 'تجربة كشف بنك مسقط النموذجي' : 'Try Bank Muscat Demo'}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">{isAr ? 'تاريخ البنك' : 'Bank Date'}</th>
                    <th className="p-3.5">{isAr ? 'بيان المعاملة البنكية' : 'Bank Narration / Description'}</th>
                    <th className="p-3.5">{isAr ? 'مرجع البنك' : 'Reference'}</th>
                    <th className="p-3.5">{isAr ? 'مبلغ الإيداع' : 'Deposit (OMR)'}</th>
                    <th className="p-3.5">{isAr ? 'القيد المطابق في DSR' : 'Matched DSR Record'}</th>
                    <th className="p-3.5">{isAr ? 'حالة المطابقة' : 'Match Status'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBankTxns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        {isAr ? 'لا توجد حركات تطابق معايير التصفية المحددة' : 'No transactions match the selected filter'}
                      </td>
                    </tr>
                  ) : (
                    filteredBankTxns.map((txn) => {
                      const dsrMatch = txn.matchedDsrId
                        ? dsrEntries.find(d => d.id === txn.matchedDsrId)
                        : null;

                      const isReconciled = txn.status === 'reconciled';
                      const isHighMatch = txn.status === 'matched';
                      const isPotential = txn.status === 'potential';
                      const isUnmatched = txn.status === 'unmatched';

                      return (
                        <tr
                          key={txn.id}
                          className={`transition ${
                            isReconciled
                              ? 'bg-emerald-50/30'
                              : isHighMatch
                              ? 'bg-blue-50/20'
                              : isPotential
                              ? 'bg-amber-50/20'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Date */}
                          <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">
                            {txn.date}
                          </td>

                          {/* Description & Channel Badge */}
                          <td className="p-3.5 max-w-xs">
                            <div className="font-semibold text-gray-900 leading-snug">
                              {txn.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {txn.channel && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                                  {txn.channel}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">{txn.bankName}</span>
                            </div>
                          </td>

                          {/* Reference */}
                          <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-bold">
                              {txn.reference}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5 whitespace-nowrap">
                            {txn.credit > 0 ? (
                              <span className="text-emerald-700 font-bold text-sm">
                                +OMR {txn.credit.toFixed(3)}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">
                                -OMR {txn.debit.toFixed(3)}
                              </span>
                            )}
                          </td>

                          {/* Matched DSR Card */}
                          <td className="p-3.5 max-w-sm">
                            {dsrMatch ? (
                              <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-xs space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-gray-900 truncate">
                                    {dsrMatch.company_name}
                                  </span>
                                  <span className="text-blue-700 font-black">
                                    OMR {dsrMatch.amount.toFixed(3)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">
                                  {dsrMatch.service} • {dsrMatch.employee_name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
                                  <span>DSR: {dsrMatch.payment_date || dsrMatch.date}</span>
                                  <span>•</span>
                                  <span>{dsrMatch.payment_method || 'Payment'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400 italic text-[11px]">
                                {txn.credit <= 0
                                  ? (isAr ? 'رسوم بنكية' : 'Bank Fee')
                                  : (isAr ? 'لا يوجد قيد مطابق' : 'No matching record')}
                              </div>
                            )}
                          </td>

                          {/* Match Status & Confidence */}
                          <td className="p-3.5 whitespace-nowrap">
                            {isReconciled ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 size={13} />
                                {isAr ? 'تمت المطابقة' : 'Reconciled'}
                              </span>
                            ) : isHighMatch ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                                  <Sparkles size={12} />
                                  {txn.matchConfidence}% {isAr ? 'مطابق' : 'Match'}
                                </span>
                                {txn.matchReason && (
                                  <p className="text-[10px] text-blue-600 mt-1 max-w-[160px] truncate" title={txn.matchReason}>
                                    {txn.matchReason}
                                  </p>
                                )}
                              </div>
                            ) : isPotential ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                                  <AlertTriangle size={12} />
                                  {txn.matchConfidence}% {isAr ? 'تقريبي' : 'Partial'}
                                </span>
                                {txn.matchReason && (
                                  <p className="text-[10px] text-amber-600 mt-1 max-w-[160px] truncate" title={txn.matchReason}>
                                    {txn.matchReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                                <AlertCircle size={12} />
                                {isAr ? 'غير مطابق' : 'Unmatched'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 whitespace-nowrap text-center">
                            {isReconciled ? (
                              <button
                                onClick={() => handleUnreconcile(txn)}
                                className="px-2.5 py-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-medium transition"
                              >
                                {isAr ? 'إلغاء' : 'Un-link'}
                              </button>
                            ) : dsrMatch ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleConfirmReconcile(txn)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                                >
                                  <Check size={14} className="inline mr-1 rtl:ml-1" />
                                  {isAr ? 'تأكيد' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setMatchingBankTxn(txn)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                  title={isAr ? 'تغيير الربط' : 'Change Match'}
                                >
                                  <RefreshCw size={13} />
                                </button>
                              </div>
                            ) : txn.credit > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenCreateDsrModal(txn)}
                                  className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-xl text-[11px] font-bold shadow-sm transition"
                                >
                                  <Plus size={13} className="inline mr-0.5 rtl:ml-0.5" />
                                  {isAr ? '+ إنشاء قيد DSR' : '+ Add DSR'}
                                </button>
                                <button
                                  onClick={() => setMatchingBankTxn(txn)}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-semibold transition"
                                >
                                  {isAr ? 'ربط يدوي' : 'Link'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANUAL DSR MATCHER / PICKER                            */}
      {/* ------------------------------------------------------------- */}
      {matchingBankTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <RefreshCw size={16} className="text-red-400" />
                  {isAr ? 'ربط يدوي للحركة البنكية بقيد DSR' : 'Manually Link Bank Transaction to DSR'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {matchingBankTxn.description} • OMR {matchingBankTxn.credit.toFixed(3)}
                </p>
              </div>
              <button
                onClick={() => setMatchingBankTxn(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidate DSR List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-gray-600 font-semibold mb-2">
                {isAr ? 'اختر القيد المحاسبي المناسب من سجل DSR:' : 'Select corresponding DSR Record:'}
              </p>

              {dsrEntries
                .filter(d => !d.reconciled)
                .map(dsr => {
                  const isExactAmount = Math.abs(dsr.amount - matchingBankTxn.credit) < 0.005;
                  return (
                    <div
                      key={dsr.id}
                      onClick={() => handleAssignManualMatch(matchingBankTxn.id, dsr.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isExactAmount
                          ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50'
                          : 'border-gray-200 hover:border-red-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{dsr.company_name}</span>
                          {isExactAmount && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">
                              {isAr ? 'مبلغ مطابق' : 'Exact Amount'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{dsr.service} • {dsr.employee_name}</p>
                        <p className="text-[10px] font-mono text-gray-400">
                          {isAr ? 'تاريخ الخدمة' : 'Date'}: {dsr.date} | CR: {dsr.cr_number || '—'}
                        </p>
                      </div>

                      <div className="text-right rtl:text-left shrink-0">
                        <p className="text-sm font-black text-blue-700">OMR {dsr.amount.toFixed(3)}</p>
                        <button className="mt-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-red-900 transition">
                          {isAr ? 'ربط القيد' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE DSR FROM UNMATCHED BANK DEPOSIT                 */}
      {/* ------------------------------------------------------------- */}
      {showCreateDsrModal && newDsrFromTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-5 bg-gradient-to-r from-red-950 to-red-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {isAr ? 'إنشاء قيد DSR جديد من إيداع بنكي' : 'Create DSR Record from Bank Deposit'}
                </h3>
                <p className="text-xs text-red-200 mt-0.5">
                  {newDsrFromTxn.bankName} Ref: {newDsrFromTxn.reference}
                </p>
              </div>
              <button
                onClick={() => setShowCreateDsrModal(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDsrFromTxn} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم الشركة / العميل' : 'Company / Client Name'}
                </label>
                <input
                  type="text"
                  required
                  value={createDsrForm.company_name}
                  onChange={(e) => setCreateDsrForm({ ...createDsrForm, company_name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-900/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'الخدمة المنفذة' : 'Service Deliverable'}
                </label>
                <input
                  type="text"
                  required
                  value={createDsrForm.service}
                  onChange={(e) => setCreateDsrForm({ ...createDsrForm, service: e.target.value })}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-900/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'رقم السجل التجاري CR' : 'CR Number'}
                  </label>
                  <input
                    type="text"
                    value={createDsrForm.cr_number}
                    onChange={(e) => setCreateDsrForm({ ...createDsrForm, cr_number: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'الموظف المسؤول' : 'Assigned Employee'}
                  </label>
                  <select
                    value={createDsrForm.employee_name}
                    onChange={(e) => setCreateDsrForm({ ...createDsrForm, employee_name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <option value="Shafnas">Shafnas</option>
                    <option value="Yousuf">Yousuf</option>
                    <option value="Shahad">Shahad</option>
                    <option value="Azhaar">Azhaar</option>
                    <option value="Riyas">Riyas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'المبلغ المستلم (OMR)' : 'Received Amount (OMR)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    readOnly
                    value={createDsrForm.amount}
                    className="w-full text-xs p-2.5 bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'الرسوم الحكومية (OMR)' : 'Official Gov Fee (OMR)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={createDsrForm.gov_fee}
                    onChange={(e) => setCreateDsrForm({ ...createDsrForm, gov_fee: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 border border-amber-200">
                ✓ {isAr ? 'سيتم إنشاء القيد في سجل DSR واعتماده ومطابقته فورياً مع التحويل البنكي.' : 'Record will be added to DSR and immediately marked reconciled & verified.'}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDsrModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-red-900 hover:bg-red-800 text-white rounded-xl shadow-md transition"
                >
                  {isAr ? 'حفظ وتأكيد المطابقة' : 'Save & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
