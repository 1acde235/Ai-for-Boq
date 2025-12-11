
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TakeoffResult, UploadedFile, TakeoffItem, AppMode, CertificateMetadata } from '../types';
import { Download, ChevronLeft, PlusCircle, Files, Coins, Lock, ZoomIn, ZoomOut, FileCode, AlertTriangle, Star, Grid, FileCheck, Building, BookOpen, Calendar, BadgeDollarSign, Eye, ChevronDown, ChevronRight, Sparkles, Loader2, ClipboardList, ArrowRight, PenTool, HelpCircle, AlertOctagon, Calculator, X, Save, Hammer, Truck, HardHat, Package, PieChart as PieChartIcon, Search, Filter, TrendingUp, AlertCircle, Settings, Printer, Share2, Unlock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getRateSuggestion } from '../services/geminiService';
import { Logo } from './Logo';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ResultsViewProps {
  data: TakeoffResult;
  files: UploadedFile[];
  onReset: () => void;
  onAddDrawing: () => void;
  credits: number;
  onUnlockProject: () => boolean; 
  onBuyCredits: () => void;
  appMode: AppMode;
}

interface RateComponent {
    name: string;
    cost: number;
}

interface RateBreakdown {
    materials: RateComponent[];
    labor: RateComponent[];
    plant: RateComponent[];
    overheadPct: number;
    profitPct: number;
}

interface BoqGroup {
  id: string; // Unique key for overrides
  name: string; 
  unit: string;
  category: string;
  items: TakeoffItem[]; 
  totalQuantity: number; // Contract Qty
  estimatedRate: number;
  contractRate?: number; 
  executedQuantity: number; // Current Qty
  executedPercentage: number; 
  previousQuantity: number; // Previous Qty
  previousPercentage: number;
  orderIndex: number; 
  rateBreakdown?: RateBreakdown; // New field
}

// Utility to convert number to words for Payment Certificate
const numberToWords = (num: number, currency: string) => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    const regex = /^(\d{1,12})(\.(\d{1,2}))?$/; 
    if (!regex.test(num.toFixed(2))) return '';

    const match = num.toFixed(2).match(regex);
    if (!match) return '';

    let whole = match[1];
    let decimal = match[3] || '00';
    
    if (parseInt(whole) === 0) return 'Zero';

    const convertNN = (n: number) => {
        if (n < 20) return a[n];
        return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : ' ');
    }
    
    const convertNNN = (n: number) => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'Hundred ';
            n %= 100;
        }
        str += convertNN(n);
        return str;
    }

    // Split into groups of 3
    let groups = [];
    let w = parseInt(whole).toString(); // remove leading zeros
    while(w.length > 0) {
        let chunk = w.length > 3 ? w.slice(-3) : w;
        groups.push(parseInt(chunk));
        w = w.length > 3 ? w.slice(0, -3) : '';
    }

    let str = '';
    const scales = ['', 'Thousand ', 'Million ', 'Billion '];
    
    for(let i=0; i<groups.length; i++) {
        if(groups[i] !== 0) {
            str = convertNNN(groups[i]) + scales[i] + str;
        }
    }
    
    const currName = currency === 'ETB' ? 'Birr' : (currency === 'USD' ? 'Dollars' : currency);
    const centName = currency === 'ETB' ? 'Cents' : 'Cents';

    str = str.trim() + " " + currName;
    if (parseInt(decimal) > 0) {
        str += " and " + convertNN(parseInt(decimal)).trim() + " " + centName;
    } else {
        str += " Only";
    }

    return str;
}

// Chart Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ResultsView: React.FC<ResultsViewProps> = ({ 
  data, 
  files, 
  onReset, 
  onAddDrawing, 
  credits, 
  onUnlockProject,
  onBuyCredits, 
  appMode
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'boq' | 'summary' | 'payment' | 'rebar' | 'technical' | 'analytics'>('list');
  
  // Document Viewer State
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const activeFile = files[activeFileIndex] || files[0];
  
  // Initialize Unit Prices and Breakdowns
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [rateBreakdowns, setRateBreakdowns] = useState<Record<string, RateBreakdown>>({});
  
  // Payment Mode Overrides (Keyed by Group ID)
  const [boqOverrides, setBoqOverrides] = useState<Record<string, { contract?: number, previous?: number }>>({});
  
  const [projectCurrency, setProjectCurrency] = useState<string>('ETB');
  const [isFinalAccount, setIsFinalAccount] = useState(false); 
  
  // Rate Suggestion State
  const [activeSuggestion, setActiveSuggestion] = useState<{ id: string, text: string, loading: boolean } | null>(null);

  // Rate Analysis Modal State
  const [showRateAnalysis, setShowRateAnalysis] = useState<{ id: string, name: string, unit: string } | null>(null);

  // Collapsed Categories State
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');

  const isLocked = !data.isPaid;

  // Takeoff Metadata
  const [takeoffMeta, setTakeoffMeta] = useState({
      projectName: data.projectName || "Sample Villa Project",
      client: "",
      contractor: "",
      consultant: ""
  });

  const [certMeta, setCertMeta] = useState<CertificateMetadata>({
      certNo: "01",
      valuationDate: new Date().toISOString().split('T')[0],
      clientName: "Client Name PLC",
      contractorName: "Contractor Name",
      contractRef: "REF-2025-001",
      projectTitle: data.projectName
  });

  // Certificate Signatures
  const [signatures, setSignatures] = useState({
      prepared: { name: '', date: new Date().toISOString().split('T')[0] },
      checked: { name: '', date: '' },
      approved: { name: '', date: '' }
  });

  const [retentionPct, setRetentionPct] = useState(5);
  const [vatPct, setVatPct] = useState(15);
  const [contingencyPct, setContingencyPct] = useState(10); // Default 10% Contingency
  const [advanceRecovery, setAdvanceRecovery] = useState(0);
  const [previousPayments, setPreviousPayments] = useState(0);

  const [items, setItems] = useState<TakeoffItem[]>(data.items || []);

  // CAD/Image Viewer State
  const [cadZoom, setCadZoom] = useState(1);
  const [cadPan, setCadPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [showRating, setShowRating] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Identify file type
  const isPdf = activeFile?.type.includes('pdf');
  const isImage = activeFile?.type.includes('image');
  const isDwg = activeFile?.name.toLowerCase().endsWith('.dwg');

  useEffect(() => {
     // Reset zoom/pan when file changes
     setCadZoom(1);
     setCadPan({ x: 0, y: 0 });
  }, [activeFileIndex]);

  useEffect(() => {
     setItems(data.items);
     
     // Initialize prices if empty
     setUnitPrices(prev => {
         const newPrices = { ...prev };
         data.items.forEach(i => {
             const key = i.billItemDescription || i.description;
             if (newPrices[key] === undefined) {
                 newPrices[key] = i.contractRate || i.estimatedRate || 0;
             }
         });
         return newPrices;
     });
     
     // Initialize Overrides
     if (appMode === AppMode.PAYMENT) {
         const overrides: Record<string, { contract?: number, previous?: number }> = {};
         data.items.forEach(i => {
             const billName = (i.billItemDescription || i.description).includes(':') 
                ? (i.billItemDescription || i.description).split(':')[1].trim()
                : (i.billItemDescription || i.description);
             const key = `${billName}|${i.unit}|${i.category}`;
             
             if (i.contractQuantity !== undefined || i.previousQuantity !== undefined) {
                 overrides[key] = {
                     contract: i.contractQuantity,
                     previous: i.previousQuantity
                 };
             }
         });
         setBoqOverrides(prev => ({ ...prev, ...overrides }));
     }
  }, [data.items, appMode]);

  useEffect(() => {
      if (appMode === AppMode.PAYMENT) {
          setActiveTab('boq'); 
      } else {
          setActiveTab('list');
      }
  }, [appMode]);

  const categoryAppearanceOrder = useMemo(() => {
      const orderMap: Record<string, number> = {};
      items.forEach((item, index) => {
          if (orderMap[item.category] === undefined) {
              orderMap[item.category] = index;
          }
      });
      return orderMap;
  }, [items]);

  // Derived source list
  const uniqueSources = useMemo(() => {
      const sources = new Set(items.map(i => i.sourceRef || "Unknown").filter(s => s));
      return Array.from(sources);
  }, [items]);

  const boqGroups = useMemo(() => {
    const groups: Record<string, BoqGroup> = {};

    items.forEach((item, index) => {
        let billName = (item.billItemDescription || item.description);
        if (billName.includes(':')) {
            billName = billName.split(':')[1].trim();
        }

        const key = `${billName}|${item.unit}|${item.category}`;

        if (!groups[key]) {
            groups[key] = {
                id: key,
                name: billName,
                unit: item.unit,
                category: item.category,
                items: [],
                totalQuantity: 0,
                estimatedRate: item.estimatedRate || 0,
                contractRate: item.contractRate, 
                executedQuantity: 0,
                executedPercentage: 0,
                previousQuantity: 0,
                previousPercentage: 0,
                orderIndex: index 
            };
        }
        groups[key].items.push(item);
        
        const measuredQty = item.quantity;
        
        if (appMode === AppMode.PAYMENT) {
            groups[key].executedQuantity += measuredQty;
        } else {
            groups[key].totalQuantity += measuredQty;
        }
    });

    Object.values(groups).forEach(g => {
        if (appMode === AppMode.PAYMENT) {
            const saved = boqOverrides[g.id] || {};
            g.totalQuantity = saved.contract !== undefined ? saved.contract : g.executedQuantity;
            g.previousQuantity = saved.previous !== undefined ? saved.previous : 0;
        }

        if (g.totalQuantity !== 0) {
            g.executedPercentage = (g.executedQuantity / g.totalQuantity) * 100;
            g.previousPercentage = (g.previousQuantity / g.totalQuantity) * 100;
        }
    });

    return Object.values(groups).sort((a, b) => {
        const catOrderA = categoryAppearanceOrder[a.category] ?? 99999;
        const catOrderB = categoryAppearanceOrder[b.category] ?? 99999;
        
        if (catOrderA !== catOrderB) {
            return catOrderA - catOrderB;
        }
        return a.orderIndex - b.orderIndex;
    });
  }, [items, categoryAppearanceOrder, appMode, boqOverrides]);

  const boqCategories = useMemo(() => {
      const seen = new Set();
      const ordered = [];
      for (const g of boqGroups) {
          if (!seen.has(g.category)) {
              seen.add(g.category);
              ordered.push(g.category);
          }
      }
      return ordered;
  }, [boqGroups]);

  const categoryTotals = useMemo(() => {
    const t: Record<string, { contract: number, previous: number, current: number, cumulative: number }> = {};
    boqCategories.forEach(cat => {
        t[cat] = { contract: 0, previous: 0, current: 0, cumulative: 0 };
    });
    
    boqGroups.forEach(g => {
        const rate = unitPrices[g.name] || g.contractRate || g.estimatedRate || 0;
        t[g.category].contract += g.totalQuantity * rate;
        t[g.category].previous += g.previousQuantity * rate;
        t[g.category].current += g.executedQuantity * rate;
        t[g.category].cumulative += (g.previousQuantity + g.executedQuantity) * rate;
    });
    return t;
  }, [boqGroups, boqCategories, unitPrices]);

  // ANALYTICS DATA GENERATION
  const analyticsData = useMemo(() => {
      let totalMaterial = 0;
      let totalLabor = 0;
      let totalPlant = 0;
      let totalOverhead = 0;
      let totalProfit = 0;
      let unknownCost = 0;

      const categoryData: any[] = [];

      boqGroups.forEach(g => {
          const rate = unitPrices[g.name] || g.contractRate || g.estimatedRate || 0;
          const totalCost = g.totalQuantity * rate;
          
          // Use Rate Breakdown if available
          const bd = rateBreakdowns[g.id];
          if (bd) {
              const matCost = bd.materials.reduce((acc, i) => acc + i.cost, 0);
              const labCost = bd.labor.reduce((acc, i) => acc + i.cost, 0);
              const plantCost = bd.plant.reduce((acc, i) => acc + i.cost, 0);
              const subTotal = matCost + labCost + plantCost;
              const oh = subTotal * (bd.overheadPct / 100);
              const profit = (subTotal + oh) * (bd.profitPct / 100);
              
              // Scale to total quantity
              totalMaterial += matCost * g.totalQuantity;
              totalLabor += labCost * g.totalQuantity;
              totalPlant += plantCost * g.totalQuantity;
              totalOverhead += oh * g.totalQuantity;
              totalProfit += profit * g.totalQuantity;
          } else {
              // Heuristic Fallback (Estimated Split)
              // 50% Material, 30% Labor, 10% Plant, 10% Margin
              totalMaterial += totalCost * 0.5;
              totalLabor += totalCost * 0.3;
              totalPlant += totalCost * 0.1;
              totalProfit += totalCost * 0.1;
          }
      });

      // Prepare Chart Data
      const pieData = [
          { name: 'Materials', value: totalMaterial },
          { name: 'Labor', value: totalLabor },
          { name: 'Plant', value: totalPlant },
          { name: 'Overhead & Profit', value: totalOverhead + totalProfit },
      ];

      // Prepare Bar Chart Data
      boqCategories.forEach(cat => {
          categoryData.push({
              name: cat,
              cost: categoryTotals[cat].contract
          });
      });

      return { pieData, categoryData, totalProjectCost: totalMaterial + totalLabor + totalPlant + totalOverhead + totalProfit };
  }, [boqGroups, unitPrices, rateBreakdowns, boqCategories, categoryTotals]);

  const dimSheetGroups = useMemo(() => {
      const groups: Record<string, Record<string, TakeoffItem[]>> = {};
      items.forEach(item => {
          // Filter by Search Term
          if (searchTerm && !JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())) {
              return;
          }
          // Filter by Source
          if (sourceFilter !== 'All' && item.sourceRef !== sourceFilter) {
              return;
          }

          if (!groups[item.category]) groups[item.category] = {};
          let billName = (item.billItemDescription || item.description);
          if (billName.includes(':')) billName = billName.split(':')[1].trim();
          if (!groups[item.category][billName]) groups[item.category][billName] = [];
          groups[item.category][billName].push(item);
      });
      return groups;
  }, [items, searchTerm, sourceFilter]);

  const sortedCategories = useMemo(() => {
      return Object.keys(dimSheetGroups).sort((a, b) => {
          const catOrderA = categoryAppearanceOrder[a] ?? 99999;
          const catOrderB = categoryAppearanceOrder[b] ?? 99999;
          return catOrderA - catOrderB;
      });
  }, [dimSheetGroups, categoryAppearanceOrder]);

  const totals = useMemo(() => {
    let contract = 0;
    let previous = 0;
    let current = 0;
    let cumulative = 0;

    boqGroups.forEach(g => {
      const rate = unitPrices[g.name] || g.contractRate || g.estimatedRate || 0;
      contract += g.totalQuantity * rate;
      previous += g.previousQuantity * rate;
      current += g.executedQuantity * rate;
      cumulative += (g.previousQuantity * rate) + (g.executedQuantity * rate);
    });

    return { contract, previous, current, cumulative };
  }, [boqGroups, unitPrices]);

  const contingencyAmounts = useMemo(() => ({
      contract: totals.contract * (contingencyPct / 100),
      previous: totals.previous * (contingencyPct / 100),
      current: totals.current * (contingencyPct / 100),
      cumulative: totals.cumulative * (contingencyPct / 100)
  }), [totals, contingencyPct]);

  const taxableAmounts = useMemo(() => ({
      contract: totals.contract + (appMode === AppMode.ESTIMATION ? contingencyAmounts.contract : 0),
      previous: totals.previous + (appMode === AppMode.ESTIMATION ? contingencyAmounts.previous : 0),
      current: totals.current + (appMode === AppMode.ESTIMATION ? contingencyAmounts.current : 0),
      cumulative: totals.cumulative + (appMode === AppMode.ESTIMATION ? contingencyAmounts.cumulative : 0)
  }), [totals, contingencyAmounts, appMode]);

  const vatAmounts = useMemo(() => ({
      contract: taxableAmounts.contract * (vatPct / 100),
      previous: taxableAmounts.previous * (vatPct / 100),
      current: taxableAmounts.current * (vatPct / 100),
      cumulative: taxableAmounts.cumulative * (vatPct / 100)
  }), [taxableAmounts, vatPct]);

  const grandTotals = useMemo(() => ({
      contract: taxableAmounts.contract + vatAmounts.contract,
      previous: taxableAmounts.previous + vatAmounts.previous,
      current: taxableAmounts.current + vatAmounts.current,
      cumulative: taxableAmounts.cumulative + vatAmounts.cumulative
  }), [taxableAmounts, vatAmounts]);

  const workExecutedCumulative = totals.cumulative; 
  
  const retentionAmount = (workExecutedCumulative * retentionPct) / 100;
  const netValuation = workExecutedCumulative - retentionAmount - advanceRecovery;
  const vatAmountCert = (netValuation * vatPct) / 100;
  const totalCertified = netValuation + vatAmountCert;
  const amountDue = totalCertified - previousPayments;

  const toggleCategory = (cat: string) => {
      setCollapsedCategories(prev => ({
          ...prev,
          [cat]: !prev[cat]
      }));
  };

  const handleUpdateItem = (index: number, field: keyof TakeoffItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'dimension' || field === 'timesing') {
        const dimStr = newItems[index].dimension;
        const timesing = newItems[index].timesing;
        const nums = dimStr.match(/[+-]?([0-9]*[.])?[0-9]+/g);
        if (nums && nums.length > 0) {
            const product = nums.reduce((acc, n) => acc * parseFloat(n), 1);
            newItems[index].quantity = parseFloat((product * timesing).toFixed(2));
        }
    }
    setItems(newItems);
  };

  const handleUpdatePaymentQty = (groupId: string, value: number, field: 'contract' | 'previous') => {
      setBoqOverrides(prev => ({
          ...prev,
          [groupId]: {
              ...prev[groupId],
              [field]: value
          }
      }));
  };

  const handleSuggestRate = async (groupId: string, itemDescription: string) => {
      setActiveSuggestion({ id: groupId, text: "", loading: true });
      const result = await getRateSuggestion(itemDescription, projectCurrency);
      setActiveSuggestion({ id: groupId, text: result, loading: false });
  };

  const applySuggestion = (groupId: string, groupName: string, rangeText: string) => {
      const numMatch = rangeText.match(/([0-9,]+)/);
      if (numMatch) {
          const val = parseFloat(numMatch[1].replace(/,/g, ''));
          setUnitPrices(prev => ({ ...prev, [groupName]: val }));
      }
      setActiveSuggestion(null);
  };

  const handleRateRating = (rating: number) => {
      setUserRating(rating);
  };

  const handleSubmitRating = () => {
      if (userRating >= 1) {
          let msg = `I just used ConstructAI for my project "${data.projectName}" and gave it ${userRating} stars!`;
          if (feedbackText) {
              msg += `\n\nFeedback: ${feedbackText}`;
          }
          const encodedMsg = encodeURIComponent(msg);
          window.open(`https://wa.me/251927942534?text=${encodedMsg}`, '_blank');
      }
      setTimeout(() => {
          setShowRating(false);
          setFeedbackText('');
          setUserRating(0);
      }, 1000);
  };

  const handleSaveRateBreakdown = (breakdown: RateBreakdown) => {
      if (showRateAnalysis) {
          const totalMaterial = breakdown.materials.reduce((acc, i) => acc + i.cost, 0);
          const totalLabor = breakdown.labor.reduce((acc, i) => acc + i.cost, 0);
          const totalPlant = breakdown.plant.reduce((acc, i) => acc + i.cost, 0);
          const subTotal = totalMaterial + totalLabor + totalPlant;
          const overhead = subTotal * (breakdown.overheadPct / 100);
          const profit = (subTotal + overhead) * (breakdown.profitPct / 100);
          const finalRate = subTotal + overhead + profit;

          setRateBreakdowns(prev => ({ ...prev, [showRateAnalysis.id]: breakdown }));
          setUnitPrices(prev => ({ ...prev, [showRateAnalysis.name]: parseFloat(finalRate.toFixed(2)) }));
          setShowRateAnalysis(null);
      }
  };

  const addSignatureRows = (rows: any[]) => {
      rows.push([]);
      rows.push([]);
      rows.push(["APPROVAL SIGNATURES"]);
      rows.push([]);
      rows.push(["PREPARED BY:", signatures.prepared.name, "DATE:", signatures.prepared.date]);
      rows.push(["SIGNATURE:", "__________________________"]);
      rows.push([]);
      rows.push(["CHECKED BY:", signatures.checked.name, "DATE:", signatures.checked.date]);
      rows.push(["SIGNATURE:", "__________________________"]);
      rows.push([]);
      rows.push(["APPROVED BY:", signatures.approved.name, "DATE:", signatures.approved.date]);
      rows.push(["SIGNATURE:", "__________________________"]);
  };

  const handleExport = () => {
    if (isLocked) {
      onUnlockProject();
      return;
    }

    const wb = XLSX.utils.book_new();

    const dimRows: any[] = [];
    dimRows.push(["TAKEOFF SHEET"]);
    dimRows.push(["PROJECT NAME:", takeoffMeta.projectName]);
    dimRows.push(["CLIENT:", takeoffMeta.client]);
    dimRows.push(["CONTRACTOR:", takeoffMeta.contractor]);
    dimRows.push(["CONSULTANT:", takeoffMeta.consultant]);
    dimRows.push(["DATE:", new Date().toLocaleDateString()]);
    dimRows.push([]); 
    dimRows.push(["TIMESING", `DIMENSION (${data.unitSystem === 'imperial' ? 'ft' : 'm'})`, `QTY (${data.unitSystem === 'imperial' ? 'sq.ft/cu.yd' : 'm2/m3'})`, "DESCRIPTION", "SOURCE DRAWING"]);

    sortedCategories.forEach(cat => {
        dimRows.push(["", "", "", cat.toUpperCase(), ""]);
        Object.keys(dimSheetGroups[cat]).forEach(billName => {
            const groupItems = dimSheetGroups[cat][billName];
            dimRows.push(["", "", "", billName, ""]);
            let groupTotal = 0;
            groupItems.forEach(item => {
                dimRows.push([
                    item.timesing,
                    item.dimension, 
                    item.quantity, 
                    item.locationDescription,
                    item.sourceRef || ""
                ]);
                groupTotal += item.quantity;
            });
            const unit = groupItems[0]?.unit || "";
            dimRows.push(["", "", groupTotal.toFixed(2), `Total ${billName} (${unit})`, ""]);
            dimRows.push([]); 
        });
    });
    addSignatureRows(dimRows);

    const wsDim = XLSX.utils.aoa_to_sheet(dimRows);
    wsDim['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 60 }, { wch: 30 }]; 
    if(!wsDim['!merges']) wsDim['!merges'] = [];
    wsDim['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }); 
    XLSX.utils.book_append_sheet(wb, wsDim, "Takeoff Sheet");

    const boqRows: any[] = [];
    const summaryTitle = appMode === AppMode.PAYMENT 
       ? (isFinalAccount ? "FINAL SUMMARY" : "INTERIM SUMMARY PAGE 1")
       : "BILL OF QUANTITIES";

    boqRows.push([summaryTitle]); 
    boqRows.push(["PROJECT NAME:", takeoffMeta.projectName]); 
    boqRows.push(["CLIENT:", takeoffMeta.client]);
    boqRows.push(["CONTRACTOR:", takeoffMeta.contractor]);
    boqRows.push(["CONSULTANT:", takeoffMeta.consultant]);
    boqRows.push(["CURRENCY:", projectCurrency]);
    boqRows.push([]);

    let headerRow = [];
    if (appMode === AppMode.ESTIMATION) {
        headerRow = ["Ref", "Description", "Unit", "Quantity", "Rate", "Amount"];
    } else {
        headerRow = [
            "Ref", "Description", "Unit", 
            "Contract Qty", "Previous Qty", "Current Qty", "Cumulative Qty",
            "Rate", 
            "Contract Amt", "Previous Amt", "Current Amt", "Cumulative Amt"
        ];
    }
    boqRows.push(headerRow);

    let refCounter = 0;
    boqCategories.forEach((cat) => {
        const emptyCols = appMode === AppMode.ESTIMATION ? 5 : 11;
        boqRows.push([cat.toUpperCase(), ...Array(emptyCols).fill("")]);
        
        const catGroups = boqGroups.filter(g => g.category === cat);
        
        catGroups.forEach(g => {
             const ref = String.fromCharCode(65 + (refCounter % 26));
             refCounter++;
             const rate = unitPrices[g.name] || g.contractRate || g.estimatedRate || 0;
             const contractAmt = g.totalQuantity * rate;

             if (appMode === AppMode.ESTIMATION) {
                 boqRows.push([
                    ref, g.name, g.unit,
                    g.totalQuantity.toFixed(2),
                    rate.toFixed(2),
                    contractAmt.toFixed(2)
                 ]);
             } else {
                 const prevAmt = g.previousQuantity * rate;
                 const currAmt = g.executedQuantity * rate;
                 const cumAmt = prevAmt + currAmt; 
                 boqRows.push([
                    ref, g.name, g.unit,
                    g.totalQuantity.toFixed(2), g.previousQuantity.toFixed(2), g.executedQuantity.toFixed(2), (g.previousQuantity + g.executedQuantity).toFixed(2),
                    rate.toFixed(2),
                    contractAmt.toFixed(2), prevAmt.toFixed(2), currAmt.toFixed(2), cumAmt.toFixed(2)
                ]);
             }
        });

        const catTotal = categoryTotals[cat];
        if (appMode === AppMode.ESTIMATION) {
             boqRows.push(["", "Total Carried to Summary", "", "", "", catTotal.contract.toFixed(2)]);
        }
        boqRows.push([]); 
    });

    if (appMode === AppMode.PAYMENT) {
         boqRows.push(["", "", "", "", "", "", "", "", ""]); 
         boqRows.push(["", "SUB TOTAL", "", "", "", "", "", "",
            totals.contract.toFixed(2), totals.previous.toFixed(2), totals.current.toFixed(2), totals.cumulative.toFixed(2)
         ]);
         boqRows.push(["", `ADD: VAT (${vatPct}%)`, "", "", "", "", "", "",
            vatAmounts.contract.toFixed(2), vatAmounts.previous.toFixed(2), vatAmounts.current.toFixed(2), vatAmounts.cumulative.toFixed(2)
         ]);
         boqRows.push(["", "GRAND TOTAL", "", "", "", "", "", "",
            grandTotals.contract.toFixed(2), grandTotals.previous.toFixed(2), grandTotals.current.toFixed(2), grandTotals.cumulative.toFixed(2)
         ]);
    }
    
    addSignatureRows(boqRows);

    const wsBoq = XLSX.utils.aoa_to_sheet(boqRows);
    if (appMode === AppMode.ESTIMATION) {
        wsBoq['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
        if(!wsBoq['!merges']) wsBoq['!merges'] = [];
        wsBoq['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); 
    } else {
        wsBoq['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        if(!wsBoq['!merges']) wsBoq['!merges'] = [];
        wsBoq['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });
    }
    XLSX.utils.book_append_sheet(wb, wsBoq, appMode === AppMode.ESTIMATION ? "Bill of Quantities" : "Valuation Summary");

    if (appMode === AppMode.ESTIMATION) {
        const summaryRows: any[] = [];
        summaryRows.push(["GRAND SUMMARY"]);
        summaryRows.push([]);
        summaryRows.push(["PROJECT NAME:", takeoffMeta.projectName]);
        summaryRows.push(["CLIENT:", takeoffMeta.client]);
        summaryRows.push(["CONTRACTOR:", takeoffMeta.contractor]);
        summaryRows.push(["CONSULTANT:", takeoffMeta.consultant]);
        summaryRows.push([]);
        summaryRows.push(["Description", "Amount"]);
        boqCategories.forEach(cat => {
            summaryRows.push([cat, categoryTotals[cat].contract.toFixed(2)]);
        });
        summaryRows.push(["", ""]);
        summaryRows.push(["SUB TOTAL (A)", totals.contract.toFixed(2)]);
        summaryRows.push([`CONTINGENCY (${contingencyPct}%)`, contingencyAmounts.contract.toFixed(2)]);
        summaryRows.push(["TOTAL AMOUNT (A+B)", taxableAmounts.contract.toFixed(2)]);
        summaryRows.push([`VAT (${vatPct}%)`, vatAmounts.contract.toFixed(2)]);
        summaryRows.push(["GRAND TOTAL", grandTotals.contract.toFixed(2)]);
        
        addSignatureRows(summaryRows);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
        wsSummary['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Grand Summary");
    }

    if (appMode === AppMode.PAYMENT) {
        const certRows: any[] = [];
        certRows.push([isFinalAccount ? "FINAL PAYMENT CERTIFICATE" : "INTERIM PAYMENT CERTIFICATE"]);
        certRows.push(["PROJECT:", takeoffMeta.projectName]);
        certRows.push(["CLIENT:", takeoffMeta.client]);
        certRows.push(["CONTRACTOR:", takeoffMeta.contractor]);
        certRows.push(["CONSULTANT:", takeoffMeta.consultant]);
        certRows.push(["DATE:", certMeta.valuationDate]);
        certRows.push([]);
        certRows.push(["DESCRIPTION", "", `AMOUNT (${projectCurrency})`]);
        certRows.push(["Gross Value of Work Executed (Cumul. Sub Total)", "", workExecutedCumulative.toFixed(2)]);
        certRows.push([`Less: Retention (${retentionPct}%)`, "", `-${retentionAmount.toFixed(2)}`]);
        certRows.push([`Less: Advance Recovery`, "", `-${advanceRecovery.toFixed(2)}`]);
        certRows.push(["Net Value", "", netValuation.toFixed(2)]);
        certRows.push([`Add: VAT (${vatPct}%) on Net Value`, "", vatAmountCert.toFixed(2)]);
        certRows.push(["TOTAL CERTIFIED TO DATE", "", totalCertified.toFixed(2)]);
        certRows.push(["Less: Previous Payments (Certified to Date)", "", `-${previousPayments.toFixed(2)}`]);
        certRows.push(["NET AMOUNT DUE THIS CERTIFICATE", "", amountDue.toFixed(2)]);

        const amountInWords = numberToWords(amountDue, projectCurrency);
        const certText = `Therefore we certify to contractor payable net amount of ${amountDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${projectCurrency} (${amountInWords})`;
        certRows.push([]);
        certRows.push([certText]);
        
        addSignatureRows(certRows);

        const wsCert = XLSX.utils.aoa_to_sheet(certRows);
        wsCert['!cols'] = [{ wch: 40 }, { wch: 5 }, { wch: 20 }];
        if(!wsCert['!merges']) wsCert['!merges'] = [];
        wsCert['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }); 
        
        const certRowIndex = certRows.findIndex(r => r[0] === certText);
        if (certRowIndex !== -1) {
            wsCert['!merges'].push({ s: { r: certRowIndex, c: 0 }, e: { r: certRowIndex, c: 2 } });
        }

        XLSX.utils.book_append_sheet(wb, wsCert, "Payment Certificate");
    }

    if (data.rebarItems && data.rebarItems.length > 0) {
       const rebarRows = [];
       rebarRows.push(["REBAR SCHEDULE"]);
       rebarRows.push(["PROJECT:", takeoffMeta.projectName]);
       rebarRows.push(["CLIENT:", takeoffMeta.client]);
       rebarRows.push(["CONTRACTOR:", takeoffMeta.contractor]);
       rebarRows.push(["CONSULTANT:", takeoffMeta.consultant]);
       rebarRows.push([]);
       rebarRows.push(["Member", "Bar Mark", "Type", "Shape", "No. Mb", "No. Bar", "Total No", "Length", "Total Len", "Weight (kg)"]);
       data.rebarItems.forEach(r => {
           rebarRows.push([r.member, r.id, r.barType, r.shapeCode, r.noOfMembers, r.barsPerMember, r.totalBars, r.lengthPerBar, r.totalLength, r.totalWeight]);
       });
       
       addSignatureRows(rebarRows);

       const wsRebar = XLSX.utils.aoa_to_sheet(rebarRows);
       XLSX.utils.book_append_sheet(wb, wsRebar, "Rebar Schedule");
    }

    if (data.technicalQueries && data.technicalQueries.length > 0) {
        const tqRows = [];
        tqRows.push(["CLARIFICATIONS & ASSUMPTIONS"]);
        tqRows.push(["PROJECT:", takeoffMeta.projectName]);
        tqRows.push([]);
        tqRows.push(["ID", "QUERY / AMBIGUITY", "ASSUMPTION MADE", "IMPACT"]);
        data.technicalQueries.forEach(tq => {
            tqRows.push([tq.id, tq.query, tq.assumption, tq.impactLevel]);
        });
        
        const wsTq = XLSX.utils.aoa_to_sheet(tqRows);
        wsTq['!cols'] = [{ wch: 10 }, { wch: 60 }, { wch: 60 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsTq, "Clarifications");
    }

    XLSX.writeFile(wb, `Takeoff_${takeoffMeta.projectName.replace(/\s+/g, '_')}.xlsx`);
    setTimeout(() => setShowRating(true), 2000);
  };

  const renderMetaInputs = (theme: 'light' | 'dark' = 'light') => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left ${theme === 'dark' ? 'text-white' : ''} print:hidden`}>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Project Name</label>
        <input 
          type="text" 
          className={`w-full bg-slate-100 border border-slate-300 rounded px-2 outline-none text-sm font-bold py-1.5 transition-colors placeholder:font-normal focus:border-brand-500 focus:bg-white`}
          value={takeoffMeta.projectName} 
          onChange={(e) => setTakeoffMeta({...takeoffMeta, projectName: e.target.value})}
          placeholder="Project Name"
        />
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Client</label>
        <input 
          type="text" 
          className={`w-full bg-slate-100 border border-slate-300 rounded px-2 outline-none text-sm font-bold py-1.5 transition-colors placeholder:font-normal focus:border-brand-500 focus:bg-white`}
          value={takeoffMeta.client} 
          onChange={(e) => setTakeoffMeta({...takeoffMeta, client: e.target.value})}
          placeholder="Client Name"
        />
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Contractor</label>
        <input 
          type="text" 
          className={`w-full bg-slate-100 border border-slate-300 rounded px-2 outline-none text-sm font-bold py-1.5 transition-colors placeholder:font-normal focus:border-brand-500 focus:bg-white`}
          value={takeoffMeta.contractor} 
          onChange={(e) => setTakeoffMeta({...takeoffMeta, contractor: e.target.value})}
          placeholder="Contractor Name"
        />
      </div>
      <div>
        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Consultant</label>
        <input 
          type="text" 
          className={`w-full bg-slate-100 border border-slate-300 rounded px-2 outline-none text-sm font-bold py-1.5 transition-colors placeholder:font-normal focus:border-brand-500 focus:bg-white`}
          value={takeoffMeta.consultant} 
          onChange={(e) => setTakeoffMeta({...takeoffMeta, consultant: e.target.value})}
          placeholder="Consultant Name"
        />
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-300 break-inside-avoid">
        <div className="space-y-4">
            <div className="flex items-center text-slate-900">
                <PenTool className="w-4 h-4 mr-2 text-slate-600" />
                <h4 className="font-bold uppercase text-xs tracking-wider">Prepared By</h4>
            </div>
            <input 
                type="text" 
                placeholder="Name" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent font-mono"
                value={signatures.prepared.name}
                onChange={e => setSignatures({...signatures, prepared: {...signatures.prepared, name: e.target.value}})}
            />
            <input 
                type="date" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent text-slate-500 font-mono"
                value={signatures.prepared.date}
                onChange={e => setSignatures({...signatures, prepared: {...signatures.prepared, date: e.target.value}})}
            />
            <div className="h-16 border-b border-slate-300 border-dashed flex items-end pb-2">
                <span className="text-xs text-slate-400">Signature</span>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center text-slate-900">
                <FileCheck className="w-4 h-4 mr-2 text-slate-600" />
                <h4 className="font-bold uppercase text-xs tracking-wider">Checked By</h4>
            </div>
            <input 
                type="text" 
                placeholder="Name" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent font-mono"
                value={signatures.checked.name}
                onChange={e => setSignatures({...signatures, checked: {...signatures.checked, name: e.target.value}})}
            />
            <input 
                type="date" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent text-slate-500 font-mono"
                value={signatures.checked.date}
                onChange={e => setSignatures({...signatures, checked: {...signatures.checked, date: e.target.value}})}
            />
            <div className="h-16 border-b border-slate-300 border-dashed flex items-end pb-2">
                <span className="text-xs text-slate-400">Signature</span>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center text-slate-900">
                <BadgeDollarSign className="w-4 h-4 mr-2 text-slate-600" />
                <h4 className="font-bold uppercase text-xs tracking-wider">Approved By</h4>
            </div>
            <input 
                type="text" 
                placeholder="Name" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent font-mono"
                value={signatures.approved.name}
                onChange={e => setSignatures({...signatures, approved: {...signatures.approved, name: e.target.value}})}
            />
            <input 
                type="date" 
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-brand-500 outline-none bg-transparent text-slate-500 font-mono"
                value={signatures.approved.date}
                onChange={e => setSignatures({...signatures, approved: {...signatures.approved, date: e.target.value}})}
            />
            <div className="h-16 border-b border-slate-300 border-dashed flex items-end pb-2">
                <span className="text-xs text-slate-400">Signature</span>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 print:bg-white font-sans">
      
      {/* PROFESSIONAL TITLE BAR (DARK MODE) - Hide in Print */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md print:hidden">
        <div className="flex items-center space-x-4">
          <button onClick={onReset} title="Back to Dashboard" className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center tracking-wide">
              {data.projectName}
              <span className="mx-3 text-slate-600">|</span>
              <span className="text-slate-400 font-normal">{appMode === AppMode.PAYMENT ? 'Payment Certificate' : 'Bill of Quantities'}</span>
              
              {/* Payment Badge */}
              <div className={`ml-4 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center ${isLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
                 {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                 {isLocked ? 'LOCKED' : 'UNLOCKED'}
              </div>
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
             {['ETB', 'USD'].map(c => (
                <button key={c} onClick={() => setProjectCurrency(c)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${projectCurrency === c ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
                   {c}
                </button>
             ))}
          </div>
          <button onClick={() => setShowRating(true)} className="text-slate-400 hover:text-yellow-400 transition-colors p-2">
            <Star className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <button onClick={onAddDrawing} className="text-xs font-bold text-slate-300 hover:text-white flex items-center px-3 py-1.5 rounded hover:bg-slate-800 transition-colors">
            <PlusCircle className="w-3.5 h-3.5 mr-2" />
            Add File
          </button>
          <button 
            onClick={handleExport} 
            className={`flex items-center px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all ${!isLocked ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'}`}
          >
            {!isLocked ? ( <><Download className="w-3.5 h-3.5 mr-2" /> Export XLSX</> ) : ( <><Lock className="w-3.5 h-3.5 mr-2" /> Unlock (1 Credit)</> )}
          </button>
        </div>
      </div>

      {/* RIBBON TOOLBAR & TABS - Hide in Print */}
      <div className="bg-slate-200 border-b border-slate-300 px-4 pt-4 flex items-end space-x-1 overflow-x-auto print:hidden shadow-inner">
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'list' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
          <Files className="w-3.5 h-3.5 mr-2" /> Takeoff Sheet
        </button>
        <button onClick={() => setActiveTab('boq')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'boq' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
          <Coins className="w-3.5 h-3.5 mr-2" /> {appMode === AppMode.PAYMENT ? 'Valuation' : 'Bill of Quantities'}
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'analytics' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
          <PieChartIcon className="w-3.5 h-3.5 mr-2" /> Analytics
        </button>
        {appMode === AppMode.ESTIMATION && (
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'summary' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
              <ClipboardList className="w-3.5 h-3.5 mr-2" /> Grand Summary
            </button>
        )}
        {appMode === AppMode.PAYMENT && (
            <button onClick={() => setActiveTab('payment')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'payment' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
              <FileCheck className="w-3.5 h-3.5 mr-2" /> Payment Cert
            </button>
        )}
        <button onClick={() => setActiveTab('rebar')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'rebar' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
          <Grid className="w-3.5 h-3.5 mr-2" /> Rebar
        </button>
        <button onClick={() => setActiveTab('technical')} className={`px-4 py-2 text-xs font-bold border-t border-l border-r rounded-t-md transition-all flex items-center whitespace-nowrap ${activeTab === 'technical' ? 'bg-white border-slate-300 text-slate-900 shadow-sm relative top-px' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-50'}`}>
          <HelpCircle className="w-3.5 h-3.5 mr-2" /> Queries
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex bg-white print:bg-white relative">
        
        {/* PAY TO PRINT PROTECTION */}
        {isLocked && (
            <div className="hidden print:flex absolute inset-0 z-50 flex-col items-center justify-center bg-white p-20 text-center space-y-6">
                <div className="border-4 border-slate-900 p-8 rounded-2xl">
                    <Lock className="w-24 h-24 text-slate-900 mx-auto mb-6" />
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-widest mb-4">PREVIEW ONLY</h1>
                    <p className="text-xl font-bold text-slate-600 mb-8">PAYMENT REQUIRED TO PRINT</p>
                    <p className="text-sm text-slate-500 font-mono">Please unlock this project in ConstructAI Dashboard to export official documents.</p>
                </div>
                <div className="text-[10px] text-slate-400 mt-12 font-mono">
                    Document protected by ConstructAI DRM.
                </div>
            </div>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 print:p-0 print:overflow-visible ${activeTab !== 'list' ? 'w-full' : ''} ${isLocked ? 'print:hidden' : ''}`}>
          
          {/* TAB 1: TAKEOFF SHEET (REDESIGNED FOR PROFESSIONAL QS LOOK) */}
          {activeTab === 'list' && (
            <div className="bg-white border border-slate-300 shadow-sm mb-24 max-w-6xl mx-auto print:shadow-none print:border-none print:mb-0 print:max-w-none">
              <div className="p-6 bg-slate-50 border-b border-slate-300 print:bg-white print:border-none">
                 <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                       Takeoff Sheet
                    </h2>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase">Standard Dimension Paper (SMM7)</p>
                 </div>
                 {renderMetaInputs()}
                 
                 {/* SEARCH & FILTER BAR */}
                 <div className="flex flex-col md:flex-row gap-2 mt-4 print:hidden">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input 
                            type="text" 
                            placeholder="Filter items..." 
                            className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2 min-w-[200px]">
                        <Filter className="text-slate-400 w-3.5 h-3.5" />
                        <select 
                            className="w-full py-1.5 px-2 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                        >
                            <option value="All">All Drawings</option>
                            {uniqueSources.map(s => (
                                <option key={s} value={s}>{s.length > 30 ? s.substring(0,30)+'...' : s}</option>
                            ))}
                        </select>
                    </div>
                 </div>
              </div>

              {/* PROFESSIONAL DIMENSION PAPER TABLE */}
              <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-xs border-collapse bg-white print:bg-white">
                    <thead className="bg-slate-800 text-white font-bold print:bg-white print:text-black">
                      <tr>
                        <th className="py-2 px-2 text-center w-12 border-r border-slate-600 print:border-slate-300">Times</th>
                        <th className="py-2 px-2 text-center w-24 border-r border-slate-600 print:border-slate-300">Dim</th>
                        <th className="py-2 px-2 text-center w-20 border-r border-slate-600 print:border-slate-300">Qty</th>
                        <th className="py-2 px-4 text-left border-r border-slate-600 print:border-slate-300">Description</th>
                        <th className="py-2 px-2 text-left w-20 text-slate-400 print:text-black">Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                      {sortedCategories.map(cat => {
                        const isCollapsed = collapsedCategories[cat];
                        return (
                        <React.Fragment key={cat}>
                            {/* Category Header (Collapsible) */}
                            <tr 
                                className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors print:bg-slate-100"
                                onClick={() => toggleCategory(cat)}
                            >
                                <td className="border-r border-slate-300 bg-slate-200 print:bg-white"></td>
                                <td className="border-r border-slate-300 bg-slate-200 print:bg-white"></td>
                                <td className="border-r border-slate-300 bg-slate-200 print:bg-white"></td>
                                <td className="py-1.5 px-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider border-r border-slate-300 flex items-center print:block">
                                    <span className="print:hidden">{isCollapsed ? <ChevronRight className="w-3 h-3 mr-2" /> : <ChevronDown className="w-3 h-3 mr-2" />}</span>
                                    {cat} 
                                    <span className="ml-2 text-slate-500 font-normal normal-case print:hidden">({Object.keys(dimSheetGroups[cat]).length} Items)</span>
                                </td>
                                <td></td>
                            </tr>
                            
                            {(!isCollapsed || window.matchMedia('print').matches) && Object.keys(dimSheetGroups[cat]).map((billName, grpIdx) => {
                                const groupItems = dimSheetGroups[cat][billName];
                                const groupTotal = groupItems.reduce((acc, i) => acc + i.quantity, 0);
                                const unit = groupItems[0]?.unit || "";

                                return (
                                    <React.Fragment key={grpIdx}>
                                        {/* Bill Item Header */}
                                        <tr className="bg-white">
                                            <td className="border-r border-slate-300 h-6"></td>
                                            <td className="border-r border-slate-300"></td>
                                            <td className="border-r border-slate-300"></td>
                                            <td className="py-1 px-4 font-bold text-brand-700 text-[10px] uppercase underline border-r border-slate-300 pt-2 print:text-black">{billName}</td>
                                            <td></td>
                                        </tr>
                                        {groupItems.map((item, index) => {
                                            const originalIndex = items.findIndex(i => i.id === item.id);
                                            const lowConfidence = item.confidence === 'Low';
                                            
                                            return (
                                                <tr key={item.id} className={`hover:bg-blue-50 group ${lowConfidence ? 'bg-amber-50' : ''}`}>
                                                    {/* Column 1: Timesing */}
                                                    <td className="p-1 text-center border-r border-slate-300 align-top relative">
                                                        <input type="number" className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-brand-500 outline-none text-slate-600 font-medium font-mono text-xs"
                                                            value={item.timesing !== 1 ? item.timesing : ''} onChange={(e) => handleUpdateItem(originalIndex, 'timesing', parseFloat(e.target.value) || 1)} 
                                                            placeholder={item.timesing !== 1 ? "" : "/"}
                                                        />
                                                    </td>
                                                    
                                                    {/* Column 2: Dimension */}
                                                    <td className="p-1 text-center border-r border-slate-300 align-top">
                                                        <input type="text" className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-brand-500 outline-none font-bold text-slate-800 font-mono text-xs"
                                                            value={item.dimension} onChange={(e) => handleUpdateItem(originalIndex, 'dimension', e.target.value)} />
                                                    </td>
                                                    
                                                    {/* Column 3: Squaring (Qty) */}
                                                    <td className="p-1 text-center border-r border-slate-300 align-top bg-slate-50/50">
                                                        <div className="font-bold text-slate-900 py-1 print:text-black font-mono">{item.quantity.toFixed(2)}</div>
                                                    </td>
                                                    
                                                    {/* Column 4: Description */}
                                                    <td className="p-1 px-4 text-slate-600 text-xs font-sans border-r border-slate-300 align-top relative">
                                                        <input type="text" className="w-full bg-transparent border-none focus:ring-1 focus:ring-brand-500 outline-none font-medium"
                                                            value={item.locationDescription} onChange={(e) => handleUpdateItem(originalIndex, 'locationDescription', e.target.value)} />
                                                        {lowConfidence && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 print:hidden" title="Low Confidence: Verify this item">
                                                                <AlertCircle className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Ref */}
                                                    <td className="p-1 px-2 text-slate-400 text-[9px] font-sans align-top">
                                                        {item.sourceRef ? item.sourceRef.substring(0, 10) : "-"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Total Row */}
                                        <tr className="border-t border-slate-300">
                                            <td className="border-r border-slate-300 bg-slate-50 print:bg-white"></td>
                                            <td className="border-r border-slate-300 bg-slate-50 print:bg-white"></td> 
                                            <td className="p-1 text-center border-r border-slate-300 font-bold text-slate-900 bg-slate-100 border-b-2 border-double border-slate-400 print:bg-white print:text-black print:border-black font-mono">{groupTotal.toFixed(2)}</td>
                                            <td className="p-1 px-4 text-slate-500 italic text-[10px] border-r border-slate-300 bg-slate-50 print:bg-white">Total {unit}</td>
                                            <td className="bg-slate-50 print:bg-white"></td>
                                        </tr>
                                        <tr><td colSpan={5} className="h-2 bg-slate-100 border-t border-slate-300 border-b print:border-none print:bg-white print:h-0"></td></tr>
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                      )})}
                    </tbody>
                  </table>
              </div>
              <div className="p-6">
                 {renderSignatures()}
              </div>
            </div>
          )}

          {/* TAB: COST ANALYTICS - Hidden in Print mostly, or kept simple */}
          {activeTab === 'analytics' && (
              <div className="space-y-6 max-w-6xl mx-auto mb-24 print:hidden">
                  <div className="bg-white shadow-sm border border-slate-300 p-6">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                          <h3 className="text-lg font-bold text-slate-800">Project Cost Dashboard</h3>
                          <div className="text-right">
                              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Project Value</p>
                              <p className="text-2xl font-bold text-slate-900 font-mono">
                                  {projectCurrency} {analyticsData.totalProjectCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
                          {/* PIE CHART - RESOURCE DISTRIBUTION */}
                          <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col">
                              <h4 className="text-xs font-bold text-slate-600 mb-4 text-center uppercase">Resource Cost Distribution</h4>
                              <div className="flex-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                          <Pie
                                              data={analyticsData.pieData}
                                              cx="50%"
                                              cy="50%"
                                              innerRadius={60}
                                              outerRadius={100}
                                              fill="#8884d8"
                                              paddingAngle={5}
                                              dataKey="value"
                                          >
                                              {analyticsData.pieData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip formatter={(value) => `${projectCurrency} ${Number(value).toLocaleString()}`} />
                                          <Legend />
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>

                          {/* BAR CHART - CATEGORY BREAKDOWN */}
                          <div className="bg-slate-50 p-4 border border-slate-200 flex flex-col">
                              <h4 className="text-xs font-bold text-slate-600 mb-4 text-center uppercase">Cost by Trade Category</h4>
                              <div className="flex-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart
                                          data={analyticsData.categoryData}
                                          layout="vertical"
                                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                      >
                                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                          <XAxis type="number" hide />
                                          <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} />
                                          <Tooltip formatter={(value) => `${projectCurrency} ${Number(value).toLocaleString()}`} />
                                          <Bar dataKey="cost" fill="#334155" radius={[0, 2, 2, 0]} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* INSIGHTS CARD */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 shadow-sm border border-slate-300">
                          <div className="flex items-center space-x-3 mb-2">
                              <div className="p-1.5 bg-blue-100 rounded text-blue-700"><Package className="w-4 h-4" /></div>
                              <h4 className="font-bold text-slate-700 text-xs uppercase">Material Intensity</h4>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 font-mono">
                              {((analyticsData.pieData[0].value / analyticsData.totalProjectCost) * 100).toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">of total project cost</p>
                      </div>
                      <div className="bg-white p-6 shadow-sm border border-slate-300">
                          <div className="flex items-center space-x-3 mb-2">
                              <div className="p-1.5 bg-green-100 rounded text-green-700"><HardHat className="w-4 h-4" /></div>
                              <h4 className="font-bold text-slate-700 text-xs uppercase">Labor Ratio</h4>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 font-mono">
                              {((analyticsData.pieData[1].value / analyticsData.totalProjectCost) * 100).toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Labor to Total Cost</p>
                      </div>
                      <div className="bg-white p-6 shadow-sm border border-slate-300">
                          <div className="flex items-center space-x-3 mb-2">
                              <div className="p-1.5 bg-purple-100 rounded text-purple-700"><TrendingUp className="w-4 h-4" /></div>
                              <h4 className="font-bold text-slate-700 text-xs uppercase">Margin Projection</h4>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 font-mono">
                              {projectCurrency} {analyticsData.pieData[3].value.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Est. Overhead & Profit</p>
                      </div>
                  </div>
              </div>
          )}

          {/* ... (Existing Tabs: BOQ, Summary, Payment, Rebar, Technical) ... */}
          {/* TAB 2: SUMMARY (BOQ) */}
          {activeTab === 'boq' && (
             <div className="bg-white border border-slate-300 shadow-sm mb-24 print:shadow-none print:border-none print:mb-0">
               <div className="p-6 bg-slate-50 border-b border-slate-300 print:bg-white print:border-none">
                 <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                        {appMode === AppMode.PAYMENT 
                            ? (isFinalAccount ? "FINAL SUMMARY" : "INTERIM SUMMARY PAGE 1")
                            : "BILL OF QUANTITIES"
                        }
                    </h2>
                 </div>
                 {renderMetaInputs()}
               </div>
               <table className="w-full text-xs border-collapse">
                 <thead className="bg-slate-800 text-white font-bold print:bg-white print:text-black">
                   <tr>
                     <th className="py-2 px-2 text-left w-12 border-r border-slate-600 print:border-slate-300">Ref</th>
                     <th className="py-2 px-2 text-left border-r border-slate-600 print:border-slate-300">Description</th>
                     <th className="py-2 px-2 text-center w-12 border-r border-slate-600 print:border-slate-300">Unit</th>
                     {appMode === AppMode.ESTIMATION ? (
                       <>
                         <th className="py-2 px-2 text-center w-20 border-r border-slate-600 print:border-slate-300">Qty</th>
                         <th className="py-2 px-2 text-right w-24 border-r border-slate-600 print:border-slate-300">Rate</th>
                         <th className="py-2 px-2 text-right w-24">Amount</th>
                       </>
                     ) : (
                       <>
                         <th className="py-2 px-2 text-center w-20 bg-slate-700 border-l border-slate-600 print:bg-white print:border-slate-300">Cont.</th>
                         <th className="py-2 px-2 text-center w-20 bg-slate-700 border-r border-slate-600 print:bg-white print:border-slate-300">Prev</th>
                         <th className="py-2 px-2 text-center w-20 bg-slate-600 font-bold border-b-2 border-brand-500 print:bg-white print:border-black">Curr</th>
                         <th className="py-2 px-2 text-center w-20 bg-slate-700 border-r border-slate-600 print:bg-white print:border-slate-300">Cumul</th>
                         <th className="py-2 px-2 text-right w-20 border-r border-slate-600 print:border-slate-300">Rate</th>
                         <th className="py-2 px-2 text-right w-24 bg-slate-700 border-r border-slate-600 print:bg-white print:border-slate-300">Cont. Amt</th>
                         <th className="py-2 px-2 text-right w-24 bg-slate-700 border-r border-slate-600 print:bg-white print:border-slate-300">Prev. Amt</th>
                         <th className="py-2 px-2 text-right w-24 bg-slate-700 border-r border-slate-600 print:bg-white print:border-slate-300">Curr. Amt</th>
                         <th className="py-2 px-2 text-right w-24 bg-slate-600 font-bold print:bg-white">Cum. Amt</th>
                       </>
                     )}
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200">
                    {boqCategories.map((cat, catIdx) => {
                         const colSpan = appMode === AppMode.ESTIMATION ? 6 : 12;
                         const catGroups = boqGroups.filter(g => g.category === cat);
                         
                         return (
                            <React.Fragment key={catIdx}>
                                 {/* Category Header */}
                                 <tr className="bg-slate-100 border-y border-slate-300 print:bg-slate-100">
                                    <td colSpan={colSpan} className="py-1.5 px-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                                        {cat}
                                    </td>
                                 </tr>
                                 
                                 {/* Items */}
                                 {catGroups.map((group, idx) => {
                                     const rate = unitPrices[group.name] || group.contractRate || group.estimatedRate || 0;
                                     const contractAmt = group.totalQuantity * rate;
                                     const showSuggestion = activeSuggestion && activeSuggestion.id === group.id;
                                     const hasBreakdown = rateBreakdowns[group.id] !== undefined;

                                     return (
                                         <tr key={group.id} className="hover:bg-blue-50 relative group/row print:hover:bg-transparent">
                                             <td className="p-2 text-slate-500 font-mono text-[10px] border-r border-slate-200">{String.fromCharCode(65 + (idx % 26))}</td>
                                             <td className="p-2 border-r border-slate-200"><span className="font-medium text-slate-800">{group.name}</span></td>
                                             <td className="p-2 text-center text-slate-600 bg-slate-50/50 print:bg-transparent border-r border-slate-200">{group.unit}</td>
                                             
                                             {appMode === AppMode.ESTIMATION ? (
                                                <>
                                                    <td className="p-2 text-center font-mono text-slate-900 border-r border-slate-200">{group.totalQuantity.toFixed(2)}</td>
                                                    <td className="p-2 text-right relative border-r border-slate-200">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <div className="relative">
                                                                <input 
                                                                    type="number" 
                                                                    className={`w-20 text-right bg-transparent border-b border-dashed border-slate-300 outline-none font-mono focus:border-brand-500 text-xs ${hasBreakdown ? 'text-green-700 font-bold border-green-300' : ''}`}
                                                                    value={rate} 
                                                                    onChange={(e) => { const newPrices = {...unitPrices, [group.name]: parseFloat(e.target.value)}; setUnitPrices(newPrices); }} 
                                                                />
                                                                {hasBreakdown && <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full print:hidden"></span>}
                                                            </div>
                                                            
                                                            <button 
                                                                onClick={() => setShowRateAnalysis({ id: group.id, name: group.name, unit: group.unit })}
                                                                className={`p-1 rounded hover:bg-slate-200 transition-colors print:hidden ${hasBreakdown ? 'text-green-600 bg-green-50' : 'text-slate-400'}`}
                                                                title="Rate Analysis"
                                                            >
                                                                <Calculator className="w-3.5 h-3.5" />
                                                            </button>

                                                            <button onClick={() => handleSuggestRate(group.id, group.name)} className="opacity-0 group-hover/row:opacity-100 p-1 rounded bg-slate-100 text-slate-500 hover:text-brand-600 transition-all print:hidden">
                                                                <Sparkles className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        {showSuggestion && (
                                                            <div className="absolute z-50 right-0 top-full mt-2 w-48 bg-white rounded shadow-xl border border-slate-300 p-3 animate-in fade-in zoom-in-95 print:hidden">
                                                                {activeSuggestion.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-500" /> : 
                                                                    <button onClick={() => applySuggestion(group.id, group.name, activeSuggestion.text)} className="text-xs font-bold text-brand-700 hover:underline block w-full text-left">{activeSuggestion.text}</button>
                                                                }
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right font-mono text-slate-900 font-bold">{contractAmt.toFixed(2)}</td>
                                                </>
                                             ) : (
                                                <>
                                                    <td className="p-2 text-center border-l border-slate-200 border-r">
                                                        <input type="number" className="w-16 text-center bg-transparent border-none outline-none font-mono text-slate-700 text-xs font-bold"
                                                            value={group.totalQuantity} onChange={(e) => handleUpdatePaymentQty(group.id, parseFloat(e.target.value) || 0, 'contract')} />
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200">
                                                        <input type="number" className="w-16 text-center bg-transparent border-none outline-none font-mono text-slate-600 text-xs"
                                                            value={group.previousQuantity} onChange={(e) => handleUpdatePaymentQty(group.id, parseFloat(e.target.value) || 0, 'previous')} />
                                                    </td>
                                                    <td className="p-2 text-center border-r border-slate-200"><div className="w-16 mx-auto text-center bg-white border border-slate-300 rounded-sm text-xs py-0.5 font-bold text-slate-900 print:border-none print:text-black font-mono">{group.executedQuantity.toFixed(2)}</div></td>
                                                    <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200 bg-slate-50 print:bg-transparent">{(group.previousQuantity + group.executedQuantity).toFixed(2)}</td>
                                                    <td className="p-2 text-right border-r border-slate-200">
                                                         <input type="number" className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 outline-none font-mono text-xs" 
                                                                value={rate} onChange={(e) => { const newPrices = {...unitPrices, [group.name]: parseFloat(e.target.value)}; setUnitPrices(newPrices); }} />
                                                    </td>
                                                    <td className="p-2 text-right font-mono text-slate-500 text-xs border-r border-slate-200 print:bg-transparent">{contractAmt.toFixed(2)}</td>
                                                    <td className="p-2 text-right font-mono text-slate-500 text-xs border-r border-slate-200 print:bg-transparent">{(group.previousQuantity * rate).toFixed(2)}</td>
                                                    <td className="p-2 text-right font-mono text-slate-800 font-medium text-xs border-r border-slate-200 print:text-black print:bg-transparent">{(group.executedQuantity * rate).toFixed(2)}</td>
                                                    <td className="p-2 text-right font-mono text-slate-900 font-bold text-xs bg-slate-50 print:bg-transparent">{((group.previousQuantity + group.executedQuantity) * rate).toFixed(2)}</td>
                                                </>
                                             )}
                                         </tr>
                                     );
                                 })}
                                 
                                 {/* Category Subtotal Row - STRICTLY 'Total Carried to Summary' */}
                                 {appMode === AppMode.ESTIMATION && (
                                     <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300 print:bg-white">
                                        <td colSpan={5} className="py-2 px-4 text-right uppercase text-[10px] tracking-wider">
                                            Total Carried to Summary
                                        </td>
                                        <td className="py-2 px-4 text-right font-mono border-t border-slate-400">
                                            {categoryTotals[cat].contract.toFixed(2)}
                                        </td>
                                     </tr>
                                 )}
                            </React.Fragment>
                         );
                    })}
                    
                    {/* PAYMENT MODE GRAND TOTAL SECTION INSIDE TABLE */}
                    {appMode === AppMode.PAYMENT && (
                        <>
                           <tr><td colSpan={12} className="h-4 bg-slate-100 border-t border-slate-300 print:bg-white"></td></tr>
                           
                           {/* SUBTOTAL */}
                           <tr className="bg-white font-bold text-slate-800 border-t border-slate-300">
                               <td colSpan={8} className="py-2 px-4 text-right uppercase text-xs tracking-wider">Sub Total</td>
                               <td className="py-2 px-2 text-right font-mono text-xs border-t border-slate-400 border-l border-r">{totals.contract.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs border-t border-slate-400 border-r">{totals.previous.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs border-t border-slate-400 border-r">{totals.current.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs border-t border-slate-400">{totals.cumulative.toFixed(2)}</td>
                           </tr>

                           {/* VAT */}
                           <tr className="bg-white text-slate-600">
                               <td colSpan={8} className="py-2 px-4 text-right uppercase text-xs tracking-wider">
                                   <div className="flex justify-end items-center">
                                       <span className="mr-2">Add: VAT</span>
                                       <div className="flex items-center bg-slate-100 rounded px-1 print:bg-transparent">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="100" 
                                                value={vatPct} 
                                                onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                                                className="w-8 bg-transparent text-center font-bold outline-none text-xs" 
                                            />
                                            <span className="text-[10px] font-bold">%</span>
                                        </div>
                                   </div>
                               </td>
                               <td className="py-2 px-2 text-right font-mono text-xs text-slate-500 border-l border-r">{vatAmounts.contract.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs text-slate-500 border-r">{vatAmounts.previous.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs text-slate-500 border-r">{vatAmounts.current.toFixed(2)}</td>
                               <td className="py-2 px-2 text-right font-mono text-xs text-slate-500">{vatAmounts.cumulative.toFixed(2)}</td>
                           </tr>

                           {/* GRAND TOTAL */}
                           <tr className="bg-slate-900 text-white font-bold border-t border-slate-900 text-sm print:bg-white print:text-black">
                               <td colSpan={8} className="py-3 px-4 text-right uppercase tracking-wider relative">
                                  <span>Grand Total</span>
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 print:hidden">
                                     <button onClick={() => setActiveTab('payment')} className="flex items-center bg-brand-600 hover:bg-brand-500 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors">
                                        Go to Certificate <ArrowRight className="w-3 h-3 ml-1" />
                                     </button>
                                  </div>
                               </td>
                               <td className="py-3 px-2 text-right font-mono text-slate-400 print:text-black border-l border-r border-slate-700 print:border-slate-300">{grandTotals.contract.toFixed(2)}</td>
                               <td className="py-3 px-2 text-right font-mono text-slate-400 print:text-black border-r border-slate-700 print:border-slate-300">{grandTotals.previous.toFixed(2)}</td>
                               <td className="py-3 px-2 text-right font-mono text-slate-400 print:text-black border-r border-slate-700 print:border-slate-300">{grandTotals.current.toFixed(2)}</td>
                               <td className="py-3 px-2 text-right font-mono text-brand-400 print:text-black">{grandTotals.cumulative.toFixed(2)}</td>
                           </tr>
                        </>
                    )}
                 </tbody>
               </table>
               <div className="p-6 border-t border-slate-200">
                 {renderSignatures()}
               </div>
             </div>
          )}

          {/* ... (Previous Summary and Payment tabs unchanged) ... */}
          {/* TAB 3: GRAND SUMMARY */}
          {activeTab === 'summary' && appMode === AppMode.ESTIMATION && (
              <div className="bg-white border border-slate-300 shadow-sm max-w-4xl mx-auto overflow-hidden mb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-none print:mb-0">
                 <div className="bg-slate-900 text-white p-8 text-center print:bg-white print:text-black">
                    <h2 className="text-2xl font-bold uppercase tracking-[0.2em] mb-6">Grand Summary</h2>
                    {renderMetaInputs('dark')}
                 </div>
                 <div className="p-8">
                    <table className="w-full text-sm border-collapse">
                        <thead className="text-slate-500 font-bold border-b-2 border-slate-800">
                            <tr>
                                <th className="py-3 text-left pl-4">Description</th>
                                <th className="py-3 text-right pr-4">Amount ({projectCurrency})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {boqCategories.map(cat => (
                                <tr key={cat} className="hover:bg-slate-50 print:hover:bg-transparent">
                                    <td className="py-3 pl-4 font-medium text-slate-800">{cat}</td>
                                    <td className="py-3 pr-4 text-right font-mono text-slate-700">{categoryTotals[cat].contract.toFixed(2)}</td>
                                </tr>
                            ))}
                            {/* SPACER */}
                            <tr><td colSpan={2} className="py-4"></td></tr>
                            
                            {/* SUB TOTAL (A) */}
                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300 print:bg-white">
                                <td className="py-3 pl-4 uppercase">Sub Total (A)</td>
                                <td className="py-3 pr-4 text-right font-mono">{totals.contract.toFixed(2)}</td>
                            </tr>

                            {/* CONTINGENCY (B) */}
                            <tr className="text-slate-600 border-b border-slate-100">
                                <td className="py-2 pl-4 flex items-center">
                                    <span className="mr-2">Add: Contingency</span>
                                    <div className="flex items-center bg-slate-100 rounded px-2 py-0.5 print:bg-transparent">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max="100" 
                                            value={contingencyPct} 
                                            onChange={(e) => setContingencyPct(parseFloat(e.target.value) || 0)}
                                            className="w-8 bg-transparent text-center font-bold outline-none text-xs" 
                                        />
                                        <span className="text-xs font-bold">%</span>
                                    </div>
                                </td>
                                <td className="py-2 pr-4 text-right font-mono text-slate-500">{contingencyAmounts.contract.toFixed(2)}</td>
                            </tr>

                            {/* TOTAL AMOUNT (A+B) */}
                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 print:bg-white">
                                <td className="py-3 pl-4 uppercase">Total Amount (A+B)</td>
                                <td className="py-3 pr-4 text-right font-mono">{taxableAmounts.contract.toFixed(2)}</td>
                            </tr>

                            {/* VAT */}
                            <tr className="text-slate-600">
                                <td className="py-2 pl-4 flex items-center"><PlusCircle className="w-3 h-3 mr-2 print:hidden" /> VAT ({vatPct}%)</td>
                                <td className="py-2 pr-4 text-right font-mono">{vatAmounts.contract.toFixed(2)}</td>
                            </tr>

                            {/* GRAND TOTAL */}
                            <tr className="bg-slate-900 text-white font-bold text-lg print:bg-white print:text-black">
                                <td className="py-4 pl-6 uppercase tracking-wider">Grand Total</td>
                                <td className="py-4 pr-6 text-right font-mono text-brand-400 print:text-black">{grandTotals.contract.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    {renderSignatures()}
                 </div>
              </div>
          )}

          {/* TAB 4: PAYMENT CERTIFICATE */}
          {activeTab === 'payment' && (
             <div className="bg-white border border-slate-300 shadow-sm p-8 max-w-4xl mx-auto mb-24 animate-in slide-in-from-bottom-5 duration-300 relative overflow-hidden print:shadow-none print:border-none print:mb-0 print:overflow-visible">
                 
                 {/* OFFICIAL WATERMARK */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                    <Logo className="w-96 h-96 text-slate-900" />
                 </div>

                 <div className="relative z-10">
                    <div className="border-b-2 border-slate-800 pb-6 mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">{isFinalAccount ? "Final Payment Certificate" : "Interim Payment Certificate"}</h2>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 print:hidden">
                            <span>Final Account?</span>
                            <button onClick={() => setIsFinalAccount(!isFinalAccount)} className={`w-8 h-4 rounded-full transition-colors relative ${isFinalAccount ? 'bg-brand-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isFinalAccount ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                    </div>
                    
                    {renderMetaInputs()}
                    
                    <div className="flex justify-end items-center mt-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-slate-500 font-mono text-sm uppercase">Certificate No.</span>
                            <input type="text" className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-sm font-bold w-16 text-center focus:ring-1 focus:ring-brand-500 print:bg-transparent print:border-none" value={certMeta.certNo} onChange={(e) => setCertMeta({...certMeta, certNo: e.target.value})} />
                        </div>
                    </div>
                    </div>
                    {/* Certificate Table */}
                    <div className="border border-slate-300 rounded-sm overflow-hidden bg-white/80 backdrop-blur-sm print:border-none print:bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold print:bg-white print:text-black border-b border-slate-300">
                            <tr>
                                <th className="py-2 px-6 text-left">Description</th>
                                <th className="py-2 px-6 text-right w-24">%</th>
                                <th className="py-2 px-6 text-right w-48">Amount ({projectCurrency})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            <tr className="bg-slate-50/30 print:bg-transparent">
                                <td className="py-3 px-6 font-medium text-slate-800">Gross Value of Work Executed (From Summary Sub Total)</td><td className="text-right px-6"></td><td className="py-3 px-6 text-right font-mono font-bold text-slate-900">{workExecutedCumulative.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-6 text-slate-600 pl-10 flex items-center"><span className="text-red-400 mr-2">-</span> Less: Retention</td>
                                <td className="py-2 px-6 text-right"><input type="number" className="w-12 text-center bg-slate-100 border border-slate-200 rounded text-xs print:bg-transparent print:border-none" value={retentionPct} onChange={(e) => setRetentionPct(parseFloat(e.target.value))} /></td>
                                <td className="py-2 px-6 text-right font-mono text-red-500">({retentionAmount.toFixed(2)})</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-6 text-slate-600 pl-10 flex items-center"><span className="text-red-400 mr-2">-</span> Less: Advance Payment Recovery</td>
                                <td className="py-2 px-6 text-right"></td>
                                <td className="py-2 px-6 text-right font-mono text-red-500"><input type="number" className="w-full text-right bg-transparent border-b border-dashed border-red-200 focus:border-red-500 outline-none text-red-500 print:border-none" value={advanceRecovery} onChange={(e) => setAdvanceRecovery(parseFloat(e.target.value))} /></td>
                            </tr>
                            <tr className="bg-slate-100 font-bold border-t border-slate-300 print:bg-transparent">
                                <td className="py-2 px-6 text-slate-800">Net Valuation</td><td></td><td className="py-2 px-6 text-right font-mono text-slate-800">{netValuation.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-6 text-slate-600 pl-10 flex items-center"><span className="text-green-500 mr-2">+</span> Add: VAT (Calculated on Net Value)</td>
                                <td className="py-2 px-6 text-right"><input type="number" className="w-12 text-center bg-slate-100 border border-slate-200 rounded text-xs print:bg-transparent print:border-none" value={vatPct} onChange={(e) => setVatPct(parseFloat(e.target.value))} /></td>
                                <td className="py-2 px-6 text-right font-mono text-slate-600">{vatAmountCert.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-slate-200 font-bold border-t border-slate-300 print:bg-transparent">
                                <td className="py-3 px-6 text-slate-900">TOTAL CERTIFIED TO DATE</td><td></td><td className="py-3 px-6 text-right font-mono text-slate-900 text-lg">{totalCertified.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-6 text-slate-600 pl-10">Less: Previous Payments (Certified to Date)</td>
                                <td></td>
                                <td className="py-3 px-6 text-right font-mono text-red-500 border-b border-slate-200"><input type="number" className="w-full text-right bg-white border border-slate-300 rounded p-1 text-red-600 font-bold print:bg-transparent print:border-none" value={previousPayments} onChange={(e) => setPreviousPayments(parseFloat(e.target.value))} /></td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-bold text-lg print:bg-white print:text-black">
                                <td className="py-4 px-6">NET AMOUNT DUE THIS CERTIFICATE</td><td></td><td className="py-4 px-6 text-right font-mono text-brand-400 border-double border-b-4 border-brand-400 print:text-black print:border-black">{amountDue.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="py-4 px-6 bg-slate-50 border-t border-slate-200 text-center italic text-slate-700 print:bg-white">
                                    "Therefore we certify to contractor payable net amount of <strong>{amountDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {projectCurrency}</strong> ({numberToWords(amountDue, projectCurrency)})"
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    </div>
                    {renderSignatures()}
                 </div>
             </div>
          )}

          {/* ... (Rebar and Technical tabs unchanged) ... */}
          {/* TAB 5: REBAR SCHEDULE */}
          {activeTab === 'rebar' && (
             <div className="bg-white border border-slate-300 shadow-sm mb-24 print:shadow-none print:border-none print:mb-0">
                <div className="p-6 bg-slate-50 border-b border-slate-300 print:bg-white print:border-none">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                            REBAR SCHEDULE
                        </h2>
                    </div>
                    {renderMetaInputs()}
                </div>
                {data.rebarItems && data.rebarItems.length > 0 ? (
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-800 text-white font-bold print:bg-white print:text-black">
                            <tr>
                                <th className="py-2 px-3 text-left border-r border-slate-600">Member</th>
                                <th className="py-2 px-3 text-left border-r border-slate-600">Bar Mark</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">Type</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">Shape</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">No. Mb</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">No. Bar</th>
                                <th className="py-2 px-3 text-center font-bold border-r border-slate-600">Total No</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">Len (m)</th>
                                <th className="py-2 px-3 text-center border-r border-slate-600">Total Len</th>
                                <th className="py-2 px-3 text-center font-bold">Weight (kg)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.rebarItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                                    <td className="p-2 font-medium text-slate-800 border-r border-slate-200">{item.member}</td>
                                    <td className="p-2 font-mono text-slate-500 border-r border-slate-200">{item.id}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.barType}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.shapeCode}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.noOfMembers}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.barsPerMember}</td>
                                    <td className="p-2 text-center font-bold bg-slate-50 print:bg-transparent border-r border-slate-200">{item.totalBars}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.lengthPerBar.toFixed(2)}</td>
                                    <td className="p-2 text-center border-r border-slate-200">{item.totalLength.toFixed(2)}</td>
                                    <td className="p-2 text-center font-bold text-brand-600 bg-brand-50/30 print:text-black print:bg-transparent font-mono">{item.totalWeight.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-slate-500">
                        <p>No Rebar items extracted. Ensure "Generate Rebar Schedule" was selected during setup.</p>
                    </div>
                )}
                <div className="p-6 border-t border-slate-200">
                    {renderSignatures()}
                </div>
             </div>
          )}

          {/* TAB 6: CLARIFICATIONS & TECHNICAL QUERIES */}
          {activeTab === 'technical' && (
             <div className="bg-white border border-slate-300 shadow-sm mb-24 max-w-5xl mx-auto print:shadow-none print:border-none print:mb-0 print:max-w-none">
                <div className="p-6 bg-slate-50 border-b border-slate-300 print:bg-white print:border-none">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                            CLARIFICATIONS & ASSUMPTIONS
                        </h2>
                        <p className="text-[10px] text-slate-400 mt-2">TECHNICAL QUERIES (TQs) & MEASUREMENT NOTES</p>
                    </div>
                    {renderMetaInputs()}
                </div>
                
                {data.technicalQueries && data.technicalQueries.length > 0 ? (
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-800 text-white font-bold print:bg-white print:text-black">
                            <tr>
                                <th className="py-2 px-6 text-left w-24 border-r border-slate-600">ID</th>
                                <th className="py-2 px-6 text-left border-r border-slate-600">Query / Ambiguity</th>
                                <th className="py-2 px-6 text-left border-r border-slate-600">Assumption Made</th>
                                <th className="py-2 px-6 text-center w-32">Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.technicalQueries.map((tq, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                                    <td className="py-3 px-6 font-mono text-slate-500 font-bold border-r border-slate-200">{tq.id}</td>
                                    <td className="py-3 px-6 text-slate-700 border-r border-slate-200">{tq.query}</td>
                                    <td className="py-3 px-6 text-slate-600 italic bg-amber-50/30 border-r border-slate-200 print:bg-transparent">"{tq.assumption}"</td>
                                    <td className="py-3 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase print:border print:border-black print:text-black print:bg-transparent ${
                                            tq.impactLevel === 'High' ? 'bg-red-100 text-red-700' : 
                                            tq.impactLevel === 'Medium' ? 'bg-orange-100 text-orange-700' : 
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {tq.impactLevel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-16 text-center flex flex-col items-center justify-center text-slate-500">
                        <AlertOctagon className="w-12 h-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">No Ambiguities Found</h3>
                        <p className="max-w-md mt-2">The drawings were clear and no major assumptions were required for this takeoff.</p>
                    </div>
                )}
                
                <div className="p-6 border-t border-slate-200 bg-slate-50 print:bg-white">
                    <p className="text-xs text-slate-500 italic">
                        * These clarifications should be included as an addendum to the Tender Document to limit liability.
                    </p>
                    {renderSignatures()}
                </div>
             </div>
          )}

        </div>
        
        {/* SIDEBAR PREVIEW - HIDE IN PRINT */}
        {activeTab === 'list' && activeFile && (
            <div className={`w-1/3 bg-slate-100 border-l border-slate-300 relative overflow-hidden hidden lg:flex flex-col print:hidden`}>
                <div className="bg-white border-b border-slate-300 px-3 py-2 flex justify-between items-center text-[10px] font-bold text-slate-500 z-10 shadow-sm">
                   <div className="flex items-center space-x-2">
                       <Eye className="w-3 h-3 mr-1" /> 
                       <div className="relative">
                          <select 
                            className="appearance-none bg-transparent font-bold text-brand-700 pr-6 cursor-pointer focus:outline-none"
                            value={activeFileIndex}
                            onChange={(e) => setActiveFileIndex(Number(e.target.value))}
                          >
                             {files.map((f, i) => (
                                <option key={i} value={i}>
                                   {f.name.length > 25 ? f.name.substring(0, 25) + '...' : f.name}
                                </option>
                             ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-brand-700 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                       </div>
                   </div>
                   <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{isPdf ? 'PDF' : (isDwg ? 'CAD' : 'IMG')}</span>
                </div>

                {isPdf && <iframe src={activeFile.url} className="w-full h-full border-none" title="PDF Viewer" />}

                {isImage && (
                    <div className="flex-1 relative overflow-hidden bg-slate-900 grid-pattern">
                        <div className="absolute top-4 left-4 z-20 bg-slate-800/80 backdrop-blur rounded shadow-sm border border-slate-600 p-1 space-y-1">
                            <button onClick={() => setCadZoom(z => Math.min(z + 0.5, 5))} className="p-1 hover:bg-white/10 rounded block"><ZoomIn className="w-3.5 h-3.5 text-white" /></button>
                            <button onClick={() => setCadZoom(z => Math.max(z - 0.5, 0.5))} className="p-1 hover:bg-white/10 rounded block"><ZoomOut className="w-3.5 h-3.5 text-white" /></button>
                        </div>
                        <div 
                            className="w-full h-full cursor-move flex items-center justify-center"
                            onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cadPan.x, y: e.clientY - cadPan.y }); }}
                            onMouseMove={(e) => { if (isDragging) setCadPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            <div style={{ transform: `translate(${cadPan.x}px, ${cadPan.y}px) scale(${cadZoom})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
                                <img src={activeFile.url} alt="Drawing Plan" className="max-w-none shadow-2xl border border-slate-700" draggable={false} />
                            </div>
                        </div>
                    </div>
                )}

                {!isPdf && !isImage && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-50">
                        <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Preview Unavailable</h3>
                        <p className="text-xs mt-2 text-slate-400">Binary file format (DWG/DXF)</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- RATE ANALYSIS MODAL --- */}
      {showRateAnalysis && (
          <RateAnalysisModal 
             item={showRateAnalysis}
             existingBreakdown={rateBreakdowns[showRateAnalysis.id]}
             onClose={() => setShowRateAnalysis(null)}
             onSave={handleSaveRateBreakdown}
             currency={projectCurrency}
          />
      )}

      {/* ... (Previous Rating Modal unchanged) ... */}
      {showRating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 print:hidden">
              <div className="bg-white p-8 rounded shadow-2xl max-w-sm w-full text-center relative overflow-hidden border border-slate-200">
                  <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4 fill-current" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">How was your experience?</h3>
                  <div className="flex justify-center space-x-2 mb-6">
                      {[1,2,3,4,5].map(star => (
                          <button key={star} onClick={() => handleRateRating(star)} className={`p-2 rounded-full hover:bg-slate-50 transition-colors transform ${userRating >= star ? 'text-yellow-400' : 'text-slate-300'}`}>
                              <Star className={`w-6 h-6 ${userRating >= star ? 'fill-current' : ''}`} />
                          </button>
                      ))}
                  </div>
                  {userRating > 0 && (
                      <div className="animate-in slide-in-from-bottom-2 duration-300">
                          <textarea 
                             className="w-full p-3 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-brand-500 outline-none resize-none mb-4 bg-white"
                             rows={3}
                             placeholder="Feedback..."
                             value={feedbackText}
                             onChange={(e) => setFeedbackText(e.target.value)}
                          />
                          <button 
                             onClick={handleSubmitRating}
                             className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded text-sm transition-colors"
                          >
                             Submit
                          </button>
                      </div>
                  )}
                  <button onClick={() => setShowRating(false)} className="text-xs text-slate-400 hover:text-slate-600 mt-4">Close</button>
              </div>
          </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: RATE ANALYSIS MODAL ---
const RateAnalysisModal: React.FC<{
    item: { id: string, name: string, unit: string },
    existingBreakdown?: RateBreakdown,
    onClose: () => void,
    onSave: (breakdown: RateBreakdown) => void,
    currency: string
}> = ({ item, existingBreakdown, onClose, onSave, currency }) => {
    
    // Default Empty State
    const defaultBreakdown: RateBreakdown = {
        materials: [{ name: '', cost: 0 }],
        labor: [{ name: '', cost: 0 }],
        plant: [{ name: '', cost: 0 }],
        overheadPct: 15,
        profitPct: 10
    };

    const [data, setData] = useState<RateBreakdown>(existingBreakdown || defaultBreakdown);

    const updateItem = (key: 'materials' | 'labor' | 'plant', index: number, field: 'name' | 'cost', value: any) => {
        const list = [...data[key]];
        list[index] = { ...list[index], [field]: value };
        setData({ ...data, [key]: list });
    };

    const addItem = (key: 'materials' | 'labor' | 'plant') => {
        setData({ ...data, [key]: [...data[key], { name: '', cost: 0 }] });
    };

    const removeItem = (key: 'materials' | 'labor' | 'plant', index: number) => {
        const list = [...data[key]];
        list.splice(index, 1);
        setData({ ...data, [key]: list });
    };

    const totalMat = data.materials.reduce((acc, i) => acc + (parseFloat(i.cost as any) || 0), 0);
    const totalLab = data.labor.reduce((acc, i) => acc + (parseFloat(i.cost as any) || 0), 0);
    const totalPlant = data.plant.reduce((acc, i) => acc + (parseFloat(i.cost as any) || 0), 0);
    
    const subTotal = totalMat + totalLab + totalPlant;
    const overheadAmt = subTotal * (data.overheadPct / 100);
    const profitAmt = (subTotal + overheadAmt) * (data.profitPct / 100);
    const grandTotal = subTotal + overheadAmt + profitAmt;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 print:hidden">
            <div className="bg-white rounded shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center uppercase tracking-wide">
                            <Calculator className="w-4 h-4 mr-2 text-slate-500" />
                            Unit Rate Build-up
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                            {item.name} ({item.unit})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                                <Package className="w-3.5 h-3.5 mr-2 text-slate-400" /> Materials
                            </h4>
                            <span className="text-xs font-bold text-slate-900 font-mono">{currency} {totalMat.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            {data.materials.map((m, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="text" placeholder="Item Name" className="flex-1 border border-slate-300 rounded-sm px-2 py-1 text-xs" value={m.name} onChange={e => updateItem('materials', i, 'name', e.target.value)} />
                                    <input type="number" placeholder="0.00" className="w-20 border border-slate-300 rounded-sm px-2 py-1 text-xs text-right font-mono" value={m.cost || ''} onChange={e => updateItem('materials', i, 'cost', parseFloat(e.target.value))} />
                                    <button onClick={() => removeItem('materials', i)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                            <button onClick={() => addItem('materials')} className="text-[10px] text-brand-600 font-bold hover:underline">+ Add Row</button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                                <HardHat className="w-3.5 h-3.5 mr-2 text-slate-400" /> Labor
                            </h4>
                            <span className="text-xs font-bold text-slate-900 font-mono">{currency} {totalLab.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            {data.labor.map((m, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="text" placeholder="Trade / Gang" className="flex-1 border border-slate-300 rounded-sm px-2 py-1 text-xs" value={m.name} onChange={e => updateItem('labor', i, 'name', e.target.value)} />
                                    <input type="number" placeholder="0.00" className="w-20 border border-slate-300 rounded-sm px-2 py-1 text-xs text-right font-mono" value={m.cost || ''} onChange={e => updateItem('labor', i, 'cost', parseFloat(e.target.value))} />
                                    <button onClick={() => removeItem('labor', i)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                            <button onClick={() => addItem('labor')} className="text-[10px] text-brand-600 font-bold hover:underline">+ Add Row</button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                                <Truck className="w-3.5 h-3.5 mr-2 text-slate-400" /> Plant
                            </h4>
                            <span className="text-xs font-bold text-slate-900 font-mono">{currency} {totalPlant.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            {data.plant.map((m, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="text" placeholder="Equipment" className="flex-1 border border-slate-300 rounded-sm px-2 py-1 text-xs" value={m.name} onChange={e => updateItem('plant', i, 'name', e.target.value)} />
                                    <input type="number" placeholder="0.00" className="w-20 border border-slate-300 rounded-sm px-2 py-1 text-xs text-right font-mono" value={m.cost || ''} onChange={e => updateItem('plant', i, 'cost', parseFloat(e.target.value))} />
                                    <button onClick={() => removeItem('plant', i)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                            <button onClick={() => addItem('plant')} className="text-[10px] text-brand-600 font-bold hover:underline">+ Add Row</button>
                        </div>
                    </div>

                    <div className="bg-slate-100 p-4 rounded-sm border border-slate-200">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-600 font-medium">Prime Cost</span>
                            <span className="font-mono font-bold">{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <div className="flex items-center">
                                <span className="text-slate-600 mr-2">Overhead</span>
                                <input type="number" className="w-10 text-center border border-slate-300 rounded-sm text-xs bg-white py-0.5" value={data.overheadPct} onChange={e => setData({...data, overheadPct: parseFloat(e.target.value) || 0})} />
                                <span className="text-[10px] ml-1 text-slate-400">%</span>
                            </div>
                            <span className="font-mono text-slate-600">{overheadAmt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-3 border-b border-slate-200 pb-3">
                            <div className="flex items-center">
                                <span className="text-slate-600 mr-2">Profit</span>
                                <input type="number" className="w-10 text-center border border-slate-300 rounded-sm text-xs bg-white py-0.5" value={data.profitPct} onChange={e => setData({...data, profitPct: parseFloat(e.target.value) || 0})} />
                                <span className="text-[10px] ml-1 text-slate-400">%</span>
                            </div>
                            <span className="font-mono text-slate-600">{profitAmt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="font-bold text-slate-900 uppercase text-xs">Final Rate</span>
                            <span className="text-lg font-bold font-mono text-brand-700 bg-white px-2 py-0.5 rounded border border-brand-200">{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-sm transition-colors border border-slate-300">Cancel</button>
                    <button onClick={() => onSave(data)} className="px-6 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-sm shadow-sm flex items-center transition-all">
                        <Save className="w-3.5 h-3.5 mr-2" /> Save Breakdown
                    </button>
                </div>
            </div>
        </div>
    );
};
