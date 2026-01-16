# Frontend Rules - JICA Investment System

Panduan standar untuk pengembangan frontend Next.js 15 dengan TailwindCSS dan shadcn/ui.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # UI components (shadcn + custom)
│   │   └── ui/              # shadcn/ui components
│   ├── constants/           # Constants & environment variables
│   │   ├── env.ts           # Environment variables (NEVER call process.env directly)
│   │   ├── query-keys.ts    # TanStack Query keys & invalidation map
│   │   └── index.ts         # Storage keys, response codes
│   ├── hooks/               # Custom React hooks
│   │   └── use-auth.ts      # Re-export from providers (backward compat)
│   ├── lib/                 # Utilities & configurations
│   │   ├── auth/            # Auth utilities (tokens, helpers)
│   │   ├── api.ts           # API request utilities
│   │   ├── axios.ts         # Axios instance with interceptors
│   │   └── utils.ts         # General utilities (cn function)
│   ├── providers/           # React Context Providers
│   │   ├── query-provider.tsx   # TanStack Query client
│   │   ├── auth-provider.tsx    # Auth context (global state)
│   │   └── index.ts
│   ├── services/            # API services (organized by module)
│   │   ├── iam/             # IAM module
│   │   ├── project/         # Project module
│   │   ├── monitoring/      # Monitoring module
│   │   ├── tracker/         # Tracker module
│   │   ├── finance/         # Finance module
│   │   ├── support/         # Support module
│   │   └── index.ts         # Re-export services
│   └── types/               # TypeScript type definitions
├── .env                     # Environment variables
└── Md/                      # Documentation
```

---

## Global State Management

### React Context for Auth

Gunakan **React Context** untuk global auth state:

```typescript
// Di layout.tsx - wrap app dengan providers
import { QueryProvider, AuthProvider } from "@/providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

```typescript
// Akses auth state di component
import { useAuth } from "@/hooks/use-auth";

const { user, login, logout, isAuthenticated, activeMembership } = useAuth();
```

---

## TanStack Query untuk Data Fetching

### Basic Query Usage

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidationMap } from "@/constants";
import { getProjects, createProject } from "@/services";

// Query
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.projects.list(),
  queryFn: getProjects,
});

// Mutation dengan invalidation
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: createProject,
  onSuccess: () => {
    // Invalidate related queries
    invalidationMap.project().forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  },
});
```

### Query Keys Pattern

Query keys didefinisikan di `constants/query-keys.ts` dengan factory pattern:

```typescript
import { queryKeys } from "@/constants";

// Get query key
queryKeys.projects.list(); // ['projects', 'list']
queryKeys.projects.detail("123"); // ['projects', 'detail', '123']
queryKeys.tasks.tree("proj-id"); // ['tasks', 'tree', 'proj-id']
```

### Query Invalidation Rules

**PENTING:** Setelah mutation, invalidate queries terkait untuk mencegah stale data:

| Mutation          | Invalidate                                                   |
| ----------------- | ------------------------------------------------------------ |
| Login/Logout      | `auth.all`, `organizations.my()`                             |
| Create Task       | `tasks.tree`, `tasks.leaf`, `progress.scurve`, `dashboard.*` |
| Submit Progress   | `progress.logs`, `progress.pending`, `tasks.tree`            |
| Validate Progress | `progress.*`, `tasks.tree`, `dashboard.*`                    |
| Create Ticket     | `tickets.list`, `dashboard.stats`                            |
| Payment Mutation  | `payments.*`, `dashboard.stats`                              |

```typescript
// Gunakan invalidationMap dari constants
import { invalidationMap } from "@/constants";

// Setelah submit progress
invalidationMap.progressSubmit(projectId).forEach((key) => {
  queryClient.invalidateQueries({ queryKey: key });
});
```

---

## Coding Conventions

### 1. Environment Variables

**NEVER** panggil `process.env` langsung. Gunakan `@/constants`:

```typescript
import { ENV } from "@/constants";
const url = ENV.API_URL;
```

### 2. API Response Handling

Semua response mengikuti format `BaseResponse<T>`:

```typescript
interface BaseResponse<T> {
  metaData: MetaData;
  responseMessage: string;
  data: T | null;
  validationErrors: Record<string, string> | null;
  filterQuery?: FilterQuery | null; // optional chaining
  pagination?: PaginationInfo | null; // optional chaining
}
```

### 3. Services Structure

Services diorganisir per module:

```typescript
// Import by namespace
import { projectService } from "@/services";
await projectService.getProjects();

// Atau langsung
import { getProjects } from "@/services";
```

### 4. Error Handling dengan TanStack Query

```typescript
const mutation = useMutation({
  mutationFn: createProject,
  onError: (error) => {
    if (isValidationError(error)) {
      Object.entries(error.validationErrors).forEach(([field, message]) => {
        form.setError(field, { message });
      });
    } else if (isApiError(error)) {
      toast.error(error.responseMessage);
    }
  },
});
```

### 5. Authentication

```typescript
import { useAuth } from "@/hooks/use-auth";

const {
  user,
  login,
  logout,
  isAuthenticated,
  isLoggingIn, // loading state dari mutation
  activeMembership,
  setActiveMembership,
} = useAuth();
```

### 6. Role-Based Access

```typescript
const canCreateTask =
  activeMembership?.orgRole === "EXECUTING_AGENCY" &&
  activeMembership?.memberRole === "ADMIN";
```

---

## Component Guidelines

### 1. shadcn/ui Components

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

### 2. Form Handling

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### 3. Client Components

Tambahkan `'use client'` untuk components dengan:

- Hooks (useState, useQuery, dll)
- Browser APIs
- Event handlers

---

## API Integration Pattern

### Query dengan Custom Hook (Recommended)

```typescript
// src/hooks/use-projects.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/constants";
import { getProjects } from "@/services";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: getProjects,
  });
}
```

### Mutation dengan Proper Invalidation

```typescript
// src/hooks/use-create-task.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidationMap } from "@/constants";
import { createTask } from "@/services";

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createTask(projectId, data),
    onSuccess: () => {
      // Invalidate all related queries
      invalidationMap.task(projectId).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}
```

---

## File Naming Conventions

| Type       | Convention                         | Example             |
| ---------- | ---------------------------------- | ------------------- |
| Components | PascalCase                         | `LoginForm.tsx`     |
| Hooks      | camelCase with `use-` prefix       | `use-projects.ts`   |
| Services   | kebab-case with `.service` suffix  | `auth.service.ts`   |
| Providers  | kebab-case with `-provider` suffix | `auth-provider.tsx` |
| Types      | kebab-case                         | `organization.ts`   |

---

## Important Rules

1. **English UI Text**: All UI text (labels, messages, placeholders, buttons, toasts) MUST be in English
2. **Query Keys**: Always use `queryKeys` from constants, never hardcode
3. **Invalidation**: After mutation, MUST invalidate related queries via `invalidationMap`
4. **Pagination/FilterQuery**: Use optional chaining (`?.`)
5. **SSR Safety**: Check `typeof window !== 'undefined'` for browser APIs
6. **Type Safety**: All API responses and requests must be typed
7. **Modular Services**: Separate services per module
8. **Context First**: For global state, use React Context instead of local state
