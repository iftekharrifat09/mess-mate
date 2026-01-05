import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { User, Meal, Deposit, MealCost, OtherCost, MemberSummary } from '@/types';
import { formatCurrency, formatNumber } from './calculations';

interface ExportData {
  members: User[];
  membersSummary: MemberSummary[];
  meals: Meal[];
  deposits: Deposit[];
  mealCosts: MealCost[];
  otherCosts: OtherCost[];
  monthName: string;
  messName: string;
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.text(data.messName, pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${data.monthName} Report`, pageWidth / 2, 28, { align: 'center' });
  
  let yPos = 40;
  
  // Members Summary
  doc.setFontSize(12);
  doc.text('Members Summary', 14, yPos);
  
  const memberRows = data.membersSummary.map(m => [
    m.userName,
    formatNumber(m.totalMeals),
    formatCurrency(m.totalDeposit),
    formatCurrency(m.mealCost),
    formatCurrency(m.sharedCost),
    formatCurrency(m.balance)
  ]);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Member', 'Meals', 'Deposit', 'Meal Cost', 'Shared Cost', 'Balance']],
    body: memberRows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Deposits
  if (data.deposits.length > 0) {
    doc.text('Deposits', 14, yPos);
    
    const depositRows = data.deposits.map(d => {
      const member = data.members.find(m => m.id === d.userId);
      return [
        d.date,
        member?.fullName || 'Unknown',
        formatCurrency(d.amount),
        d.note || '-'
      ];
    });
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Member', 'Amount', 'Note']],
      body: depositRows,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  // Meal Costs
  if (data.mealCosts.length > 0) {
    doc.text('Meal Costs', 14, yPos);
    
    const mealCostRows = data.mealCosts.map(c => {
      const member = data.members.find(m => m.id === c.userId);
      return [
        c.date,
        member?.fullName || 'Unknown',
        c.description,
        formatCurrency(c.amount)
      ];
    });
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Added By', 'Description', 'Amount']],
      body: mealCostRows,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  // Other Costs
  if (data.otherCosts.length > 0) {
    doc.text('Other Costs', 14, yPos);
    
    const otherCostRows = data.otherCosts.map(c => {
      const member = data.members.find(m => m.id === c.userId);
      return [
        c.date,
        member?.fullName || 'Unknown',
        c.description,
        c.isShared ? 'Shared' : 'Individual',
        formatCurrency(c.amount)
      ];
    });
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Added By', 'Description', 'Type', 'Amount']],
      body: otherCostRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
  }
  
  // Save PDF
  doc.save(`${data.messName}_${data.monthName}_Report.pdf`);
}

export function exportToExcel(data: ExportData) {
  const workbook = XLSX.utils.book_new();
  
  // Members Summary Sheet
  const membersSummaryData = data.membersSummary.map(m => ({
    'Member': m.userName,
    'Total Meals': m.totalMeals,
    'Total Deposit': m.totalDeposit,
    'Meal Cost': m.mealCost,
    'Shared Cost': m.sharedCost,
    'Individual Cost': m.individualCost,
    'Balance': m.balance
  }));
  const membersSheet = XLSX.utils.json_to_sheet(membersSummaryData);
  XLSX.utils.book_append_sheet(workbook, membersSheet, 'Members Summary');
  
  // Deposits Sheet
  const depositsData = data.deposits.map(d => {
    const member = data.members.find(m => m.id === d.userId);
    return {
      'Date': d.date,
      'Member': member?.fullName || 'Unknown',
      'Amount': d.amount,
      'Note': d.note || ''
    };
  });
  const depositsSheet = XLSX.utils.json_to_sheet(depositsData);
  XLSX.utils.book_append_sheet(workbook, depositsSheet, 'Deposits');
  
  // Meal Costs Sheet
  const mealCostsData = data.mealCosts.map(c => {
    const member = data.members.find(m => m.id === c.userId);
    return {
      'Date': c.date,
      'Added By': member?.fullName || 'Unknown',
      'Description': c.description,
      'Amount': c.amount
    };
  });
  const mealCostsSheet = XLSX.utils.json_to_sheet(mealCostsData);
  XLSX.utils.book_append_sheet(workbook, mealCostsSheet, 'Meal Costs');
  
  // Other Costs Sheet
  const otherCostsData = data.otherCosts.map(c => {
    const member = data.members.find(m => m.id === c.userId);
    return {
      'Date': c.date,
      'Added By': member?.fullName || 'Unknown',
      'Description': c.description,
      'Type': c.isShared ? 'Shared' : 'Individual',
      'Amount': c.amount
    };
  });
  const otherCostsSheet = XLSX.utils.json_to_sheet(otherCostsData);
  XLSX.utils.book_append_sheet(workbook, otherCostsSheet, 'Other Costs');
  
  // Daily Meals Sheet
  const mealsData = data.meals.map(m => {
    const member = data.members.find(u => u.id === m.userId);
    return {
      'Date': m.date,
      'Member': member?.fullName || 'Unknown',
      'Breakfast': m.breakfast,
      'Lunch': m.lunch,
      'Dinner': m.dinner,
      'Total': m.breakfast + m.lunch + m.dinner
    };
  });
  const mealsSheet = XLSX.utils.json_to_sheet(mealsData);
  XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Daily Meals');
  
  // Save Excel file
  XLSX.writeFile(workbook, `${data.messName}_${data.monthName}_Report.xlsx`);
}
