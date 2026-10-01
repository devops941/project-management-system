// Seed script: creates roles, demo users, projects, teams, tasks, assignments,
// progress updates and notifications. Safe to re-run - it clears only the
// pms_* collections owned by this application.
import 'dotenv/config';
import { prisma, disconnectDatabase } from './prisma.js';
import { hashPassword } from '../auth/tokens.js';
import { NOTIFICATION_TYPE, PRIORITY, PROJECT_STATUS, ROLES, TASK_STATUS, ROLE_DESCRIPTIONS } from '../utils/constants.js';
import { addDays } from '../utils/dates.js';

const DEMO_PASSWORD = 'Password@123';

async function clearCollections() {
  await prisma.notification.deleteMany({});
  await prisma.taskUpdate.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
}

async function seedRoles() {
  const roles = {};
  for (const name of Object.values(ROLES)) {
    roles[name] = await prisma.role.create({
      data: { name, description: ROLE_DESCRIPTIONS[name] },
    });
  }
  return roles;
}

async function seedUsers(roles) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const people = [
    { name: 'System Administrator', email: 'admin@pms.local', role: ROLES.ADMIN, phone: '+1-555-0100' },
    { name: 'Priya Manager', email: 'manager@pms.local', role: ROLES.MANAGER, phone: '+1-555-0101' },
    { name: 'Daniel Lead', email: 'lead@pms.local', role: ROLES.MANAGER, phone: '+1-555-0102' },
    { name: 'Alice Cooper', email: 'alice@pms.local', role: ROLES.MEMBER, phone: '+1-555-0103' },
    { name: 'Bob Martin', email: 'bob@pms.local', role: ROLES.MEMBER, phone: '+1-555-0104' },
    { name: 'Carol Singh', email: 'carol@pms.local', role: ROLES.MEMBER, phone: '+1-555-0105' },
    { name: 'Evan Wright', email: 'evan@pms.local', role: ROLES.MEMBER, phone: '+1-555-0106' },
  ];

  const users = {};
  for (const person of people) {
    const { role, ...rest } = person;
    users[person.email] = await prisma.user.create({
      data: { ...rest, passwordHash, isActive: true, roleId: roles[role].id },
    });
  }
  return users;
}

async function seedProjects() {
  const today = new Date();
  const projects = [
    {
      name: 'Customer Portal Revamp',
      code: 'CPR-2026',
      description: 'Redesign the customer self-service portal with a modern UI and faster search.',
      startDate: addDays(today, -30),
      endDate: addDays(today, 45),
      priority: PRIORITY.HIGH,
      status: PROJECT_STATUS.ACTIVE,
    },
    {
      name: 'Mobile Banking App',
      code: 'MBA-2026',
      description: 'Deliver the first release of the mobile banking application.',
      startDate: addDays(today, -15),
      endDate: addDays(today, 90),
      priority: PRIORITY.CRITICAL,
      status: PROJECT_STATUS.ACTIVE,
    },
    {
      name: 'Internal HR Toolkit',
      code: 'HRT-2026',
      description: 'Automate leave requests, appraisals and onboarding paperwork.',
      startDate: addDays(today, -120),
      endDate: addDays(today, -10),
      priority: PRIORITY.MEDIUM,
      status: PROJECT_STATUS.COMPLETED,
    },
  ];

  const records = {};
  for (const project of projects) {
    records[project.code] = await prisma.project.create({ data: project });
  }
  return records;
}

async function seedTeams(projects, users) {
  const teams = [
    {
      name: 'Portal Frontend Squad',
      description: 'Owns the Angular front-end of the customer portal.',
      projectId: projects['CPR-2026'].id,
      leadId: users['lead@pms.local'].id,
      memberEmails: ['alice@pms.local', 'bob@pms.local'],
    },
    {
      name: 'Mobile Core Team',
      description: 'Backend and API work for the mobile banking app.',
      projectId: projects['MBA-2026'].id,
      leadId: users['manager@pms.local'].id,
      memberEmails: ['carol@pms.local', 'evan@pms.local', 'alice@pms.local'],
    },
    {
      name: 'HR Automation Team',
      description: 'Delivered the internal HR toolkit.',
      projectId: projects['HRT-2026'].id,
      leadId: users['manager@pms.local'].id,
      memberEmails: ['bob@pms.local', 'carol@pms.local'],
    },
  ];

  const records = [];
  for (const team of teams) {
    const created = await prisma.team.create({
      data: {
        name: team.name,
        description: team.description,
        projectId: team.projectId,
        leadId: team.leadId,
      },
    });
    for (const email of team.memberEmails) {
      await prisma.teamMember.create({ data: { teamId: created.id, userId: users[email].id } });
    }
    records.push(created);
  }
  return records;
}

async function seedTasks(projects, users) {
  const today = new Date();
  const taskDefs = [
    {
      project: 'CPR-2026',
      title: 'Design new dashboard wireframes',
      description: 'Produce low-fidelity wireframes for the redesigned dashboard.',
      priority: PRIORITY.HIGH,
      status: TASK_STATUS.DONE,
      progress: 100,
      dueDate: addDays(today, -12),
      assignees: ['alice@pms.local'],
      updates: [{ status: TASK_STATUS.DONE, progress: 100, comment: 'Wireframes approved by the client.', by: 'alice@pms.local' }],
    },
    {
      project: 'CPR-2026',
      title: 'Implement global search API',
      description: 'Add a fuzzy search endpoint across customers and invoices.',
      priority: PRIORITY.HIGH,
      status: TASK_STATUS.IN_PROGRESS,
      progress: 55,
      dueDate: addDays(today, 3),
      assignees: ['bob@pms.local', 'alice@pms.local'],
      updates: [
        { status: TASK_STATUS.IN_PROGRESS, progress: 30, comment: 'Endpoint scaffolded.', by: 'bob@pms.local' },
        { status: TASK_STATUS.IN_PROGRESS, progress: 55, comment: 'Indexing tuned for large datasets.', by: 'bob@pms.local' },
      ],
    },
    {
      project: 'CPR-2026',
      title: 'Accessibility audit (WCAG 2.1 AA)',
      description: 'Audit all portal screens and fix contrast and keyboard issues.',
      priority: PRIORITY.MEDIUM,
      status: TASK_STATUS.TODO,
      progress: 0,
      dueDate: addDays(today, 1),
      assignees: ['alice@pms.local'],
      updates: [],
    },
    {
      project: 'CPR-2026',
      title: 'Write regression test suite',
      description: 'Cover the checkout flow with end-to-end tests.',
      priority: PRIORITY.MEDIUM,
      status: TASK_STATUS.TODO,
      progress: 10,
      dueDate: addDays(today, -4),
      assignees: ['bob@pms.local'],
      updates: [{ status: TASK_STATUS.TODO, progress: 10, comment: 'Drafting scenarios.', by: 'bob@pms.local' }],
    },
    {
      project: 'MBA-2026',
      title: 'Set up JWT authentication service',
      description: 'Issue and verify tokens, hash passwords with bcrypt.',
      priority: PRIORITY.CRITICAL,
      status: TASK_STATUS.DONE,
      progress: 100,
      dueDate: addDays(today, -6),
      assignees: ['carol@pms.local'],
      updates: [{ status: TASK_STATUS.DONE, progress: 100, comment: 'Merged and deployed to staging.', by: 'carol@pms.local' }],
    },
    {
      project: 'MBA-2026',
      title: 'Build account balance screen',
      description: 'Angular screen showing balances and recent transactions.',
      priority: PRIORITY.HIGH,
      status: TASK_STATUS.IN_PROGRESS,
      progress: 65,
      dueDate: addDays(today, 5),
      assignees: ['evan@pms.local'],
      updates: [{ status: TASK_STATUS.IN_PROGRESS, progress: 65, comment: 'Chart component integrated.', by: 'evan@pms.local' }],
    },
    {
      project: 'MBA-2026',
      title: 'Integrate payment gateway sandbox',
      description: 'Wire up the sandbox credentials and test transfers.',
      priority: PRIORITY.CRITICAL,
      status: TASK_STATUS.TODO,
      progress: 0,
      dueDate: addDays(today, 2),
      assignees: ['carol@pms.local', 'evan@pms.local'],
      updates: [],
    },
    {
      project: 'MBA-2026',
      title: 'Security penetration test',
      description: 'Third-party pen test before release.',
      priority: PRIORITY.HIGH,
      status: TASK_STATUS.TODO,
      progress: 0,
      dueDate: addDays(today, 20),
      assignees: ['alice@pms.local'],
      updates: [],
    },
    {
      project: 'HRT-2026',
      title: 'Leave request workflow',
      description: 'Approve and reject leave requests with notifications.',
      priority: PRIORITY.MEDIUM,
      status: TASK_STATUS.DONE,
      progress: 100,
      dueDate: addDays(today, -40),
      assignees: ['bob@pms.local'],
      updates: [{ status: TASK_STATUS.DONE, progress: 100, comment: 'Released to production.', by: 'bob@pms.local' }],
    },
    {
      project: 'HRT-2026',
      title: 'Appraisal PDF export',
      description: 'Generate appraisal letters as PDF.',
      priority: PRIORITY.LOW,
      status: TASK_STATUS.DONE,
      progress: 100,
      dueDate: addDays(today, -25),
      assignees: ['carol@pms.local'],
      updates: [{ status: TASK_STATUS.DONE, progress: 100, comment: 'Templates signed off.', by: 'carol@pms.local' }],
    },
  ];

  const createdTasks = [];
  for (const def of taskDefs) {
    const completedAt = def.status === TASK_STATUS.DONE ? def.dueDate : null;
    const task = await prisma.task.create({
      data: {
        title: def.title,
        description: def.description,
        priority: def.priority,
        status: def.status,
        progress: def.progress,
        dueDate: def.dueDate,
        completedAt,
        projectId: projects[def.project].id,
      },
    });

    for (const email of def.assignees) {
      await prisma.taskAssignment.create({ data: { taskId: task.id, userId: users[email].id } });
    }
    for (const update of def.updates) {
      await prisma.taskUpdate.create({
        data: {
          taskId: task.id,
          userId: users[update.by].id,
          status: update.status,
          progress: update.progress,
          comment: update.comment,
        },
      });
    }
    createdTasks.push(task);
  }
  return createdTasks;
}

async function seedNotifications(users, tasks) {
  const [first, second, third] = tasks;
  const rows = [
    {
      userId: users['alice@pms.local'].id,
      type: NOTIFICATION_TYPE.ASSIGNMENT,
      title: 'New task assigned',
      message: `You have been assigned "${third.title}".`,
      link: `/tasks/${third.id}`,
    },
    {
      userId: users['bob@pms.local'].id,
      type: NOTIFICATION_TYPE.DEADLINE_SOON,
      title: 'Task due soon',
      message: `"${second.title}" is due in 3 day(s).`,
      link: `/tasks/${second.id}`,
    },
    {
      userId: users['alice@pms.local'].id,
      type: NOTIFICATION_TYPE.OVERDUE,
      title: 'Task overdue',
      message: `"${first.title}" is past its due date.`,
      link: `/tasks/${first.id}`,
      isRead: true,
    },
  ];

  for (const row of rows) {
    await prisma.notification.create({ data: row });
  }
}

async function main() {
  console.log('Seeding Project Management System database...');
  await clearCollections();

  const roles = await seedRoles();
  const users = await seedUsers(roles);
  const projects = await seedProjects();
  await seedTeams(projects, users);
  const tasks = await seedTasks(projects, users);
  await seedNotifications(users, tasks);

  console.log('\nSeed complete. Demo credentials (password for all: %s):', DEMO_PASSWORD);
  console.log('  admin@pms.local     -> ADMIN');
  console.log('  manager@pms.local   -> MANAGER');
  console.log('  lead@pms.local      -> MANAGER');
  console.log('  alice@pms.local     -> MEMBER');
  console.log('  bob@pms.local       -> MEMBER');
  console.log('  carol@pms.local     -> MEMBER');
  console.log('  evan@pms.local      -> MEMBER');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
