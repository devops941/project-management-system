// Module 10: Reports - summary, workload, task status and PDF/Excel export.
import { Router } from 'express';
import { authenticate, authorize } from '../auth/middleware.js';
import { asyncHandler, sendSuccess, ApiError } from '../utils/http.js';
import { ROLES, TASK_STATUS } from '../utils/constants.js';
import {
  buildReportExcel,
  buildReportPdf,
  memberWorkload,
  projectSummary,
  taskStatusReport,
} from '../services/report.service.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER));

// Combined report payload used by the Reports screen (charts + tables).
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const [summary, status, workload] = await Promise.all([
      projectId ? projectSummary(projectId) : null,
      taskStatusReport(projectId),
      memberWorkload(projectId),
    ]);

    if (projectId && !summary) throw ApiError.notFound('Project not found');

    return sendSuccess(res, { summary, taskStatus: status, workload });
  }),
);

router.get(
  '/project/:projectId',
  asyncHandler(async (req, res) => {
    const summary = await projectSummary(req.params.projectId);
    if (!summary) throw ApiError.notFound('Project not found');
    const workload = await memberWorkload(req.params.projectId);
    return sendSuccess(res, { ...summary, workload });
  }),
);

router.get(
  '/workload',
  asyncHandler(async (req, res) => {
    const workload = await memberWorkload(req.query.projectId);
    return sendSuccess(res, { workload });
  }),
);

// Exports. `?format=pdf|excel` and `?type=summary|tasks|workload`.
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { projectId, format = 'pdf', type = 'tasks' } = req.query;

    let title = 'Project Management Report';
    let columns;
    let rows;
    let sheetName = 'Report';
    const summaryLines = [];

    if (type === 'workload') {
      title = 'Member Workload Report';
      sheetName = 'Workload';
      const workload = await memberWorkload(projectId);
      columns = [
        { header: 'Member', key: 'name', width: 26 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total', key: 'total', width: 10 },
        { header: 'To Do', key: 'todo', width: 10 },
        { header: 'In Progress', key: 'inProgress', width: 12 },
        { header: 'Done', key: 'done', width: 10 },
        { header: 'Overdue', key: 'overdue', width: 10 },
        { header: 'Avg %', key: 'avgProgress', width: 10 },
      ];
      rows = workload.map((w) => ({
        name: w.user.name,
        email: w.user.email,
        total: w.total,
        todo: w.todo,
        inProgress: w.inProgress,
        done: w.done,
        overdue: w.overdue,
        avgProgress: w.avgProgress,
      }));
    } else if (type === 'summary' && projectId) {
      const data = await projectSummary(projectId);
      if (!data) throw ApiError.notFound('Project not found');
      title = `Project Summary - ${data.project.name}`;
      sheetName = 'Summary';
      summaryLines.push(
        `Project: ${data.project.name} (${data.project.code})`,
        `Status: ${data.project.status}   Priority: ${data.project.priority}`,
        `Total tasks: ${data.metrics.total}   Completed: ${data.metrics.byStatus[TASK_STATUS.DONE] || 0}`,
        `Overdue: ${data.metrics.overdue}   Average progress: ${data.metrics.avgProgress}%`,
        `Overall completion: ${data.metrics.completion}%`,
      );
      columns = [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Value', key: 'value', width: 18 },
      ];
      rows = [
        { metric: 'Total tasks', value: data.metrics.total },
        { metric: 'To Do', value: data.metrics.byStatus[TASK_STATUS.TODO] || 0 },
        { metric: 'In Progress', value: data.metrics.byStatus[TASK_STATUS.IN_PROGRESS] || 0 },
        { metric: 'Done', value: data.metrics.byStatus[TASK_STATUS.DONE] || 0 },
        { metric: 'Overdue', value: data.metrics.overdue },
        { metric: 'Average progress (%)', value: data.metrics.avgProgress },
        { metric: 'Completion (%)', value: data.metrics.completion },
      ];
    } else {
      const status = await taskStatusReport(projectId);
      title = projectId ? 'Task Status Report' : 'All Tasks Report';
      sheetName = 'Tasks';
      summaryLines.push(`Total tasks: ${status.total}`, `To Do: ${status.byStatus.TODO || 0}   In Progress: ${status.byStatus.IN_PROGRESS || 0}   Done: ${status.byStatus.DONE || 0}`);
      columns = [
        { header: 'Task', key: 'title', width: 34 },
        { header: 'Project', key: 'project', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Progress %', key: 'progress', width: 12 },
        { header: 'Due Date', key: 'dueDate', width: 16 },
      ];
      rows = status.tasks.map((t) => ({
        title: t.title,
        project: t.project?.name ?? '-',
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '-',
      }));
    }

    if (format === 'excel') {
      const buffer = await buildReportExcel({ sheetName, columns, rows });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${sheetName.toLowerCase()}-report.xlsx"`);
      return res.send(buffer);
    }

    const buffer = await buildReportPdf({ title, columns, rows, summary: summaryLines });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName.toLowerCase()}-report.pdf"`);
    return res.send(buffer);
  }),
);

export default router;
