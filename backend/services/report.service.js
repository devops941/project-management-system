// Reporting service (Module 10: Reports).
// Builds project summary, task-status and member-workload reports and can
// export them as PDF (pdf-lib) or Excel (exceljs).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { prisma } from '../database/prisma.js';
import { TASK_STATUS } from '../utils/constants.js';
import { isOverdue } from '../utils/dates.js';

const STATUS_ORDER = [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.DONE];

function groupCount(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// Aggregate project-level performance metrics.
export async function projectSummary(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, code: true, status: true, priority: true, startDate: true, endDate: true },
  });
  if (!project) return null;

  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true, status: true, progress: true, dueDate: true, priority: true },
  });

  const total = tasks.length;
  const byStatus = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;

  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const avgProgress = total ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
  const completion = total ? Math.round(((byStatus[TASK_STATUS.DONE] || 0) / total) * 100) : 0;

  return {
    project,
    metrics: { total, byStatus, overdue, avgProgress, completion },
    byPriority: groupCount(tasks, (t) => t.priority),
  };
}

// Member-wise workload: assigned tasks and their status breakdown.
export async function memberWorkload(projectId) {
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : {},
    select: {
      id: true,
      status: true,
      progress: true,
      dueDate: true,
      assignments: { select: { user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } } } },
    },
  });

  const map = new Map();
  for (const task of tasks) {
    for (const { user } of task.assignments) {
      if (!map.has(user.id)) {
        map.set(user.id, {
          user,
          total: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
          avgProgress: 0,
          _progressSum: 0,
        });
      }
      const row = map.get(user.id);
      row.total += 1;
      row._progressSum += task.progress || 0;
      if (task.status === TASK_STATUS.TODO) row.todo += 1;
      else if (task.status === TASK_STATUS.IN_PROGRESS) row.inProgress += 1;
      else if (task.status === TASK_STATUS.DONE) row.done += 1;
      if (isOverdue(task.dueDate, task.status)) row.overdue += 1;
    }
  }

  return [...map.values()].map((row) => {
    row.avgProgress = row.total ? Math.round(row._progressSum / row.total) : 0;
    delete row._progressSum;
    return row;
  });
}

// Overall task-status distribution (optionally scoped to a project).
export async function taskStatusReport(projectId) {
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : {},
    select: { id: true, title: true, status: true, priority: true, progress: true, dueDate: true, project: { select: { name: true, code: true } } },
  });

  const byStatus = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;

  return { byStatus, total: tasks.length, tasks };
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

const TABLE_FONT_SIZE = 9;

export async function buildReportPdf({ title, columns, rows, summary = [] }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / columns.length;
  const rowHeight = 18;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = () => {
    page.drawText(title, { x: margin, y, size: 16, font: bold, color: rgb(0.1, 0.1, 0.2) });
    y -= 20;
    page.drawText(`Generated: ${new Date().toISOString()}`, { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 18;

    for (const line of summary) {
      page.drawText(line, { x: margin, y, size: TABLE_FONT_SIZE, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 12;
    }
    y -= 6;

    page.drawRectangle({ x: margin, y: y - 4, width: usableWidth, height: rowHeight, color: rgb(0.9, 0.92, 0.96) });
    columns.forEach((col, i) => {
      page.drawText(col.header, { x: margin + i * colWidth + 4, y, size: TABLE_FONT_SIZE, font: bold });
    });
    y -= rowHeight;
  };

  drawHeader();

  for (const row of rows) {
    if (y < margin + rowHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
    }
    columns.forEach((col, i) => {
      const raw = row[col.key];
      const text = String(raw ?? '').slice(0, Math.floor(colWidth / 5));
      page.drawText(text, { x: margin + i * colWidth + 4, y, size: TABLE_FONT_SIZE, font });
    });
    y -= rowHeight;
  }

  return Buffer.from(await doc.save());
}

export async function buildReportExcel({ sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Project Management System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName || 'Report');

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF7' } };
  rows.forEach((r) => sheet.addRow(r));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export const reportService = {
  projectSummary,
  memberWorkload,
  taskStatusReport,
  buildReportPdf,
  buildReportExcel,
};
