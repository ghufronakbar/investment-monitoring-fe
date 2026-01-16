/**
 * Query Keys for TanStack Query
 * Centralized query key definitions for easy invalidation
 */

// Query key factory pattern
export const queryKeys = {
  // Auth & User
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
    memberships: () => [...queryKeys.auth.all, "memberships"] as const,
    profile: () => [...queryKeys.auth.all, "profile"] as const,
  },

  // Organizations
  organizations: {
    all: ["organizations"] as const,
    registered: () => [...queryKeys.organizations.all, "registered"] as const,
    my: () => [...queryKeys.organizations.all, "my"] as const,
    detail: (orgId: string) =>
      [...queryKeys.organizations.all, "detail", orgId] as const,
    members: (orgId: string) =>
      [...queryKeys.organizations.all, "members", orgId] as const,
  },

  // Projects
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (projectId: string) =>
      [...queryKeys.projects.all, "detail", projectId] as const,
  },

  // Monitoring - Tasks
  tasks: {
    all: ["tasks"] as const,
    tree: (projectId: string) =>
      [...queryKeys.tasks.all, "tree", projectId] as const,
    leaf: (projectId: string) =>
      [...queryKeys.tasks.all, "leaf", projectId] as const,
    detail: (taskId: string) =>
      [...queryKeys.tasks.all, "detail", taskId] as const,
  },

  // Monitoring - Progress
  progress: {
    all: ["progress"] as const,
    logs: (projectId: string) =>
      [...queryKeys.progress.all, "logs", projectId] as const,
    pending: (projectId: string) =>
      [...queryKeys.progress.all, "pending", projectId] as const,
    scurve: (projectId: string) =>
      [...queryKeys.progress.all, "scurve", projectId] as const,
  },

  // Tickets
  tickets: {
    all: ["tickets"] as const,
    list: (projectId: string, filter?: string) =>
      [...queryKeys.tickets.all, "list", projectId, filter].filter(
        Boolean
      ) as readonly string[],
    detail: (ticketId: string) =>
      [...queryKeys.tickets.all, "detail", ticketId] as const,
  },

  // Finance - Payments
  payments: {
    all: ["payments"] as const,
    list: (projectId: string) =>
      [...queryKeys.payments.all, "list", projectId] as const,
    detail: (requestId: string) =>
      [...queryKeys.payments.all, "detail", requestId] as const,
    summary: (projectId: string) =>
      [...queryKeys.payments.all, "summary", projectId] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: (projectId: string) =>
      [...queryKeys.dashboard.all, "stats", projectId] as const,
    scurve: (projectId: string) =>
      [...queryKeys.dashboard.all, "scurve", projectId] as const,
  },

  // Monitoring - convenience grouping
  monitoring: {
    tasks: (projectId: string) => queryKeys.tasks.tree(projectId),
    leafTasks: (projectId: string) => queryKeys.tasks.leaf(projectId),
    logs: (projectId: string) => queryKeys.progress.logs(projectId),
    pending: (projectId: string) => queryKeys.progress.pending(projectId),
    scurve: (projectId: string) => queryKeys.progress.scurve(projectId),
  },
} as const;

/**
 * Invalidation helpers - which keys to invalidate after mutations
 */
export const invalidationMap = {
  // After login/logout - invalidate all auth-related queries
  auth: [queryKeys.auth.all, queryKeys.organizations.my()],

  // After creating/updating organization
  organization: (orgId?: string) => [
    queryKeys.organizations.all,
    ...(orgId
      ? [
          queryKeys.organizations.detail(orgId),
          queryKeys.organizations.members(orgId),
        ]
      : []),
  ],

  // After project mutations
  project: (projectId?: string) => [
    queryKeys.projects.list(),
    ...(projectId ? [queryKeys.projects.detail(projectId)] : []),
  ],

  // After task mutations - also invalidate progress and dashboard
  task: (projectId: string) => [
    queryKeys.tasks.tree(projectId),
    queryKeys.tasks.leaf(projectId),
    queryKeys.progress.scurve(projectId),
    queryKeys.dashboard.stats(projectId),
    queryKeys.dashboard.scurve(projectId),
  ],

  // After progress submission
  progressSubmit: (projectId: string) => [
    queryKeys.progress.logs(projectId),
    queryKeys.progress.pending(projectId),
    queryKeys.tasks.tree(projectId), // Update task percentages
  ],

  // After progress validation
  progressValidate: (projectId: string) => [
    queryKeys.progress.logs(projectId),
    queryKeys.progress.pending(projectId),
    queryKeys.progress.scurve(projectId),
    queryKeys.tasks.tree(projectId),
    queryKeys.dashboard.stats(projectId),
    queryKeys.dashboard.scurve(projectId),
  ],

  // After ticket mutations
  ticket: (projectId: string, ticketId?: string) => [
    queryKeys.tickets.list(projectId),
    ...(ticketId ? [queryKeys.tickets.detail(ticketId)] : []),
    queryKeys.dashboard.stats(projectId), // Update ticket stats
  ],

  // After payment mutations
  payment: (projectId: string, requestId?: string) => [
    queryKeys.payments.list(projectId),
    queryKeys.payments.summary(projectId),
    ...(requestId ? [queryKeys.payments.detail(requestId)] : []),
    queryKeys.dashboard.stats(projectId), // Update disbursed amount
  ],
} as const;
