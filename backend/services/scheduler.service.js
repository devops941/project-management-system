// Scheduled deadline scanner. Runs on the DEADLINE_CRON expression (hourly by
// default) and raises "due soon" / "overdue" notifications.
import cron from 'node-cron';
import { runDeadlineScan } from '../services/deadline.service.js';

let task = null;

export function startDeadlineScheduler() {
  const expression = process.env.DEADLINE_CRON || '0 * * * *';
  if (!cron.validate(expression)) {
    console.warn(`[scheduler] invalid DEADLINE_CRON expression "${expression}" - scheduler disabled`);
    return null;
  }

  task = cron.schedule(expression, async () => {
    try {
      const result = await runDeadlineScan();
      console.info(`[scheduler] deadline scan complete - dueSoon=${result.dueSoon}, overdue=${result.overdue}`);
    } catch (err) {
      console.error('[scheduler] deadline scan failed:', err.message);
    }
  });

  console.info(`[scheduler] deadline scanner scheduled with "${expression}"`);
  return task;
}

export function stopDeadlineScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
}
