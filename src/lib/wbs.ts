import type { TaskItem } from "@/types";
import { getErrorMessage, WBS_ERROR_MESSAGES } from "./error-messages";

export { WBS_ERROR_MESSAGES };

export const getWBSErrorMessage = (code: string): string => {
  return getErrorMessage(code);
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
