import type { TaskItem } from "@/types";

export const WBS_ERROR_MESSAGES: Record<string, string> = {
  WBS_EMPTY: "WBS is empty. Add at least one task.",
  TASK_CANNOT_PARENT_ITSELF: "A task cannot be its own parent.",
  PARENT_TASK_NOT_FOUND: "Selected parent task was not found.",
  PARENT_TASK_NOT_IN_CONTRACT: "Selected parent task belongs to another contract.",
  CHILD_DEADLINE_EXCEEDS_PARENT:
    "Child task deadline cannot exceed its parent deadline.",
  WBS_CYCLE_DETECTED: "This parent selection would create a WBS cycle.",
  ORPHAN_TASK: "WBS contains a task whose parent no longer exists.",
  TOTAL_ROOT_WEIGHT_NOT_100: "Total root task weight should equal 100%.",
  TOTAL_ROOT_WEIGHT_EXCEEDS_100: "Total root task weight exceeds 100%.",
  TOTAL_LEAF_WEIGHT_NOT_100: "Total leaf task weight should equal 100%.",
  TOTAL_LEAF_WEIGHT_EXCEEDS_100: "Total leaf task weight exceeds 100%.",
  SIBLING_WEIGHT_EXCEEDS_100:
    "Total weight among sibling tasks exceeds 100%.",
};

export const getWBSErrorMessage = (code: string): string => {
  return WBS_ERROR_MESSAGES[code] || code;
};

export const flattenTasks = (tasks: TaskItem[]): TaskItem[] => {
  return tasks.flatMap((task) => [
    task,
    ...flattenTasks(task.children ?? []),
  ]);
};

export const findTaskById = (
  tasks: TaskItem[],
  taskId: string
): TaskItem | null => {
  for (const task of tasks) {
    if (task.id === taskId) {
      return task;
    }

    const found = findTaskById(task.children ?? [], taskId);
    if (found) {
      return found;
    }
  }

  return null;
};

const hasChildren = (task: TaskItem): boolean => {
  return (task.children?.length ?? 0) > 0;
};

const getRootWeightAfterMutation = (
  tasks: TaskItem[],
  weight: number,
  parentId: string | null,
  excludeTask?: TaskItem | null
): number => {
  const currentRootWeight = tasks.reduce((sum, task) => {
    if (task.id === excludeTask?.id) {
      return sum;
    }

    return sum + task.weight;
  }, 0);

  return parentId ? currentRootWeight : currentRootWeight + weight;
};

const getSiblingWeightAfterMutation = (
  tasks: TaskItem[],
  weight: number,
  parentId: string | null,
  excludeTask?: TaskItem | null
): number => {
  const siblings = parentId
    ? findTaskById(tasks, parentId)?.children ?? []
    : tasks;

  return siblings.reduce((sum, task) => {
    if (task.id === excludeTask?.id) {
      return sum;
    }

    return sum + task.weight;
  }, weight);
};

const getLeafWeightAfterMutation = (
  tasks: TaskItem[],
  weight: number,
  parentId: string | null,
  excludeTask?: TaskItem | null
): number => {
  const flatTasks = flattenTasks(tasks);
  let totalLeafWeight = flatTasks.reduce((sum, task) => {
    if (task.id === excludeTask?.id) {
      return sum;
    }

    return task.isLeaf ? sum + task.weight : sum;
  }, 0);

  if (parentId && !excludeTask) {
    const parent = findTaskById(tasks, parentId);
    if (parent?.isLeaf) {
      totalLeafWeight -= parent.weight;
    }
  }

  if (!excludeTask || excludeTask.isLeaf || !hasChildren(excludeTask)) {
    totalLeafWeight += weight;
  }

  return totalLeafWeight;
};

interface WBSWeightWarningInput {
  tasks: TaskItem[];
  weight: number;
  parentId?: string | null;
  excludeTask?: TaskItem | null;
}

export const getWBSWeightWarning = ({
  tasks,
  weight,
  parentId = null,
  excludeTask = null,
}: WBSWeightWarningInput): string | null => {
  const rootWeight = getRootWeightAfterMutation(
    tasks,
    weight,
    parentId,
    excludeTask
  );
  if (!parentId && rootWeight > 100) {
    return `Root task weight would become ${rootWeight}%, exceeding 100%.`;
  }

  const siblingWeight = getSiblingWeightAfterMutation(
    tasks,
    weight,
    parentId,
    excludeTask
  );
  if (siblingWeight > 100) {
    return `Sibling task weight would become ${siblingWeight}%, exceeding 100%.`;
  }

  const leafWeight = getLeafWeightAfterMutation(
    tasks,
    weight,
    parentId,
    excludeTask
  );
  if (leafWeight > 100) {
    return `Leaf task weight would become ${leafWeight}%, exceeding 100%.`;
  }

  return null;
};
