# Frontend New Version Implementation Plan

Dokumen ini adalah plan implementasi frontend berdasarkan perubahan backend pada `server/Md/NewVersion.md` dan kondisi frontend saat ini. Fokusnya bukan membuat ulang UI, tetapi menutup gap contract, auth, upload, WBS validation, SLA ticket, dan realtime delivery agar frontend siap mengikuti backend versi baru.

## 1. Ringkasan Backend yang Sudah Dibuat

Backend versi baru sudah menambahkan fondasi berikut:

- centralized policy layer untuk authorization lintas module;
- FSM transition engine untuk monitoring, tracker, dan finance;
- SLA tracking untuk ticket;
- audit log global;
- finance concurrency control;
- refresh token rotation dan revocation;
- rate limiting endpoint auth;
- dashboard cache;
- domain event dan outbox pattern;
- WBS integrity validation;
- secure upload dengan file metadata;
- WebSocket realtime transport, topic authorization, Redis fanout, dan outbox delivery;
- unit test dan controller contract test backend untuk area utama.

Dampak utama ke frontend:

- REST endpoint lama mayoritas tetap ada;
- beberapa response type bertambah field;
- beberapa error code baru harus di-handle;
- auth flow perlu memakai refresh token baru setiap refresh;
- logout sebaiknya memanggil backend, bukan hanya clear localStorage;
- WebSocket menjadi channel baru untuk refetch/invalidation realtime, bukan pengganti REST.

## 2. Gap Frontend Saat Ini

Berdasarkan struktur frontend sekarang:

- API client ada di `src/lib/api.ts` dan `src/lib/axios.ts`.
- Auth flow ada di `src/services/iam/auth.service.ts` dan `src/providers/auth-provider.tsx`.
- Types tersebar di `src/types/*`.
- Service REST per module sudah ada di `src/services/*`.
- Query keys dan invalidation sudah ada di `src/constants/query-keys.ts`.

Gap yang terlihat:

- `src/lib/axios.ts` refresh interceptor memakai URL absolut `ENV.API_URL + "/iam/auth/refresh-token"`, padahal base REST backend memakai `/api`; ini perlu dikoreksi.
- `src/services/iam/auth.service.ts` `refreshToken` juga memakai URL absolut tanpa `/api`.
- `logout()` frontend saat ini hanya `clearTokens()`, belum memanggil `POST /api/iam/auth/logout`.
- belum ada `revoke-all` service.
- belum ada handling khusus `429 RATE_LIMIT_EXCEEDED` dan header `Retry-After`.
- `UploadResponse` masih hanya `publicId`, `url`, `format`, belum metadata baru.
- `Ticket` belum punya optional `sla`.
- belum ada type/service untuk WBS validation endpoint.
- belum ada WebSocket client/provider dan query invalidation dari realtime event.
- belum ada type untuk realtime envelope/domain event.

## 3. Prinsip Implementasi Frontend

Frontend harus tetap menjadikan REST sebagai source of truth.

Aturan implementasi:

- WebSocket hanya memberi sinyal untuk refetch/invalidate query.
- Semua TypeScript type harus null-safe untuk field baru optional seperti `ticket.sla`.
- Error domain backend ditampilkan sebagai pesan yang bisa dipahami user, tetapi kode asli tetap dipertahankan untuk debugging.
- Auth refresh harus single-flight, menyimpan refresh token baru, dan menghentikan retry jika refresh gagal.
- UI action harus mengikuti role dan status agar tidak memicu FSM/policy error yang sebenarnya bisa dicegah di client.
- Perubahan harus masuk bertahap dengan build aman setelah tiap tahap.

## 4. Tahap 1: Contract dan API Client Foundation

Target file:

```text
src/lib/axios.ts
src/services/iam/auth.service.ts
src/types/api.ts
src/types/auth.ts
src/constants/env.ts
```

Checklist:

- [x] Perbaiki refresh URL di `src/lib/axios.ts` agar memakai `/api/iam/auth/refresh-token`.
- [x] Perbaiki refresh URL di `src/services/iam/auth.service.ts`.
- [x] Pastikan refresh success selalu memanggil `setTokens(accessToken, newRefreshToken)`.
- [x] Jika refresh gagal dengan `INVALID_REFRESH_TOKEN`, `INVALID_REFRESH_TOKEN_CLAIMS`, `REFRESH_TOKEN_REVOKED`, atau `USER_NOT_FOUND`, clear auth state dan arahkan user login ulang.
- [x] Tambah type `ApiRateLimitError` atau helper untuk membaca `Retry-After` dari Axios response.
- [x] Tambah helper `getApiErrorCode(error)` dan `getValidationErrors(error)` jika belum ada.
- [x] Audit semua raw axios call agar tidak bypass `apiRequest` tanpa alasan.

Status implementasi:

- `src/lib/api-errors.ts` ditambahkan sebagai utilitas shared untuk `ApiError`, `ApiRateLimitError`, `Retry-After`, validation errors, dan fatal refresh error code.
- `src/lib/api.ts` tetap menjadi public API helper dan me-re-export utilitas error agar import lama dari `@/lib/api` tetap kompatibel.
- Raw axios call hanya tersisa pada refresh token dan upload multipart. Refresh sengaja memakai raw axios untuk menghindari interceptor loop, sedangkan upload multipart memakai `apiClient` karena butuh `FormData`.
- `npm run build` sudah berhasil setelah dijalankan di luar sandbox karena Turbopack diblokir sandbox saat binding port internal.

Catatan implementasi:

- `apiClient` sudah punya `baseURL = ENV.API_URL + "/api"`, jadi endpoint relatif lebih aman.
- Raw `axios.post` di interceptor boleh dipakai untuk menghindari loop, tetapi URL harus lengkap: `${ENV.API_URL}/api/iam/auth/refresh-token`.

Definition of done:

- refresh token endpoint benar;
- token rotation tersimpan;
- build TypeScript aman;
- no infinite refresh loop.

## 5. Tahap 2: Auth Logout, Revoke All, dan Rate Limit UX

Target file:

```text
src/services/iam/auth.service.ts
src/providers/auth-provider.tsx
src/app/login/page.tsx
src/components/auth/*
```

Checklist:

- [x] Tambah type:
  - `LogoutRequest`
  - `LogoutResponse`
  - `RevokeAllResponse`
- [x] Ubah `logout()` service menjadi async:
  - baca refresh token;
  - call `POST /iam/auth/logout`;
  - tetap clear local tokens walaupun request gagal.
- [x] Tambah `revokeAllRefreshTokens(refreshToken)` service untuk `POST /iam/auth/revoke-all`.
- [x] Ubah `AuthProvider.logout()` agar await backend logout sebelum clear state atau minimal fire-and-forget dengan fallback clear.
- [x] Tambah UI/flow untuk logout semua sesi jika diperlukan.
- [x] Handle `429 RATE_LIMIT_EXCEEDED` pada login/check-email:
  - baca header `Retry-After`;
  - disable submit;
  - tampilkan countdown.
- [x] Pastikan refresh-token auto retry tidak agresif ketika 429.

Status implementasi:

- `src/types/auth.ts` sekarang punya `LogoutRequest`, `LogoutResponse`, dan `RevokeAllResponse`.
- `src/services/iam/auth.service.ts` sekarang memanggil backend logout dengan refresh token aktif, lalu tetap membersihkan token lokal di `finally`.
- `revokeAllRefreshTokens(refreshToken)` tersedia untuk `POST /iam/auth/revoke-all`.
- `AuthProvider.logout()` dan `AuthProvider.revokeAllSessions()` membersihkan state lokal dan cache walaupun backend sedang tidak bisa dihubungi.
- Navbar user menu sekarang punya opsi `Logout` dan `Logout all sessions`.
- Login page membaca `RATE_LIMIT_EXCEEDED`, memakai `Retry-After`, menampilkan countdown, dan men-disable submit selama window rate limit.
- Auto refresh token tetap hanya berjalan pada `401`; response `429` tidak memicu retry refresh tambahan.
- `npm run build` pass.

Error code yang harus dikenal:

```text
RATE_LIMIT_EXCEEDED
INVALID_REFRESH_TOKEN
INVALID_REFRESH_TOKEN_CLAIMS
REFRESH_TOKEN_REVOKED
USER_NOT_FOUND
```

Definition of done:

- logout memanggil backend;
- revoke-all service tersedia;
- login UI bisa menampilkan rate limit state;
- user dengan token lama diarahkan login ulang secara jelas.

## 6. Tahap 3: Upload Metadata dan Secure Upload Contract

Target file:

```text
src/types/support.ts
src/services/support/upload.service.ts
src/components/ui/file-uploader.tsx
```

Checklist:

- [x] Update `UploadResponse`:

```ts
export interface UploadResponse {
  id: string;
  publicId: string;
  url: string;
  format: string;
  fileName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedByUserId: string;
  uploadedByOrgId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}
```

- [x] Tambah upload options:

```ts
interface UploadOptions {
  organizationId?: string;
  entityType?: string;
  entityId?: string;
}
```

- [x] `uploadSingle(file, options?)` append `organizationId`, `entityType`, `entityId` bila ada.
- [x] `uploadMultiple(files, options?)` append field yang sama.
- [x] Pastikan `entityType` dan `entityId` selalu dikirim bersama.
- [x] UI uploader menampilkan error:
  - `FILE_EMPTY`
  - `INVALID_FILE_TYPE`
  - `FILE_TOO_LARGE_5MB_MAX`
  - `USER_NOT_MEMBER_OF_ORGANIZATION`
  - `ENTITY_TYPE_AND_ENTITY_ID_REQUIRED_TOGETHER`
- [x] Tetap pakai `url` sebagai value utama untuk form lama agar tidak breaking.

Status implementasi:

- `src/types/support.ts` sekarang mengikuti response metadata backend: file id, public id, url, format, file name, mime type, size, checksum, uploader user/org, entity binding, dan created at.
- `UploadOptions` tersedia untuk `organizationId`, `entityType`, dan `entityId`.
- `src/services/support/upload.service.ts` sekarang menerima `options?`, append metadata ke `FormData`, dan memvalidasi `entityType`/`entityId` harus dikirim bersama.
- Upload service memakai `apiRequest` agar error backend tetap menjadi `ApiError` dan bisa dibaca UI.
- `src/components/ui/file-uploader.tsx` menerima prop `uploadOptions`, meneruskan metadata ke service, memetakan error code upload ke pesan yang jelas, dan tetap mengembalikan URL lewat `onChange`.
- Callback `onUpload` sekarang membawa metadata file penuh melalui `UploadedFile`, tanpa mematahkan pemakai lama.
- `npm run build` pass.

Definition of done:

- TypeScript upload response sesuai backend;
- upload lama tetap berjalan;
- metadata bisa dipakai UI detail/admin nanti.

## 7. Tahap 4: WBS Integrity Validation

Target file:

```text
src/types/monitoring.ts
src/services/monitoring/task.service.ts
src/constants/query-keys.ts
src/app/dashboard/[projectId]/monitoring/tasks/page.tsx
src/app/dashboard/[projectId]/monitoring/tasks/create/page.tsx
src/app/dashboard/[projectId]/monitoring/tasks/[taskId]/edit/page.tsx
```

Checklist:

- [x] Tambah type:

```ts
export interface WBSValidation {
  isValid: boolean;
  totalRootWeight: number;
  totalLeafWeight: number;
  errors: string[];
}
```

- [x] Tambah service:

```ts
getWBSValidation(projectId: string): Promise<WBSValidation>
```

- [x] Tambah query key:

```ts
queryKeys.tasks.validation(projectId)
```

- [x] Invalidate validation setelah create/update/delete task.
- [x] Tambah panel status WBS di halaman task:
  - total root weight;
  - total leaf weight;
  - valid/invalid badge;
  - daftar error.
- [x] Tambah inline warning di form create/edit sebelum submit jika sibling/root/leaf weight berpotensi >100.
- [x] Tetap handle error backend sebagai source of truth.

Status implementasi:

- `src/types/monitoring.ts` sekarang punya `WBSValidation`.
- `src/services/monitoring/task.service.ts` sekarang punya `getWBSValidation(projectId)` untuk `GET /monitoring/project/{projectId}/wbs/validation`.
- `src/constants/query-keys.ts` sekarang punya `queryKeys.tasks.validation(projectId)` dan `invalidationMap.task(projectId)` ikut meng-invalidate validation.
- `src/lib/wbs.ts` ditambahkan untuk mapping error code WBS dan warning lokal root/sibling/leaf weight.
- Halaman `monitoring/tasks` menampilkan panel WBS Integrity dengan total root weight, total leaf weight, badge valid/invalid, dan daftar error dari backend.
- Dialog create task, halaman create task, dan halaman edit task menampilkan warning lokal sebelum submit ketika perubahan berpotensi membuat root/sibling/leaf weight melebihi 100%.
- Mutation create/update/delete tetap memakai backend sebagai source of truth dan menampilkan pesan error WBS yang lebih jelas.
- `npm run build` pass.

Error code yang perlu mapping:

```text
WBS_EMPTY
TASK_CANNOT_PARENT_ITSELF
PARENT_TASK_NOT_FOUND
PARENT_TASK_NOT_IN_CONTRACT
CHILD_DEADLINE_EXCEEDS_PARENT
WBS_CYCLE_DETECTED
ORPHAN_TASK
TOTAL_ROOT_WEIGHT_EXCEEDS_100
TOTAL_LEAF_WEIGHT_EXCEEDS_100
SIBLING_WEIGHT_EXCEEDS_100
```

Definition of done:

- user bisa melihat apakah WBS valid;
- form task menampilkan alasan backend secara jelas;
- invalidasi query task mencakup WBS validation.

## 8. Tahap 5: Ticket SLA UI

Target file:

```text
src/types/tracker.ts
src/services/tracker/ticket.service.ts
src/app/dashboard/[projectId]/tickets/page.tsx
src/app/dashboard/[projectId]/tickets/[ticketId]/page.tsx
```

Checklist:

- [x] Tambah type:

```ts
export type SLAStatus = "ON_TRACK" | "SLA_WARNING" | "SLA_VIOLATED" | "RESOLVED";

export interface SLAReturn {
  id: string;
  entityType: string;
  entityId: string;
  state: string;
  ownerOrgId: string | null;
  enteredAt: string;
  dueAt: string;
  resolvedAt: string | null;
  status: SLAStatus;
  remainingSeconds: number;
  isViolated: boolean;
}
```

- [x] Update `Ticket`:

```ts
sla?: SLAReturn | null;
```

- [x] Ticket list menampilkan compact SLA badge:
  - `ON_TRACK`;
  - `SLA_WARNING`;
  - `SLA_VIOLATED`;
  - `RESOLVED`.
- [x] Ticket detail menampilkan:
  - due date;
  - owner org;
  - remaining time;
  - resolved time jika ada.
- [x] Null-safe: ticket lama tanpa `sla` tidak boleh crash.
- [x] Action UI disesuaikan dengan FSM:
  - closed ticket tidak menampilkan update/assign action yang tidak valid;
  - status change hanya tampil sesuai allowed transition.

Status implementasi:

- `src/types/tracker.ts` sekarang punya `SLAStatus`, `SLAReturn`, dan `Ticket.sla?: SLAReturn | null`.
- `src/lib/sla.ts` ditambahkan untuk mapping visual SLA badge dan format `remainingSeconds`.
- Ticket list menampilkan compact SLA badge secara null-safe di sebelah status ticket.
- Ticket detail menampilkan card SLA berisi status, due date, owner org, remaining time, dan resolved time jika tersedia.
- Ticket lama tanpa field `sla` tetap menampilkan fallback `No SLA data available`.
- Assign/reassign disembunyikan untuk `CLOSED`; closed ticket juga tidak menampilkan form update.
- Dropdown status update hanya menampilkan transisi yang relevan untuk state ticket saat ini.
- `npm run build` pass.

Definition of done:

- ticket response baru tidak breaking;
- SLA visible di list/detail;
- UI action lebih sesuai backend workflow.

## 9. Tahap 6: Finance Concurrency dan FSM UX

Target file:

```text
src/types/finance.ts
src/services/finance/payment.service.ts
src/app/dashboard/[projectId]/finance/*
```

Checklist:

- [x] Pastikan `PaymentSummary` dipakai sebelum submit payment request.
- [x] Disable submit jika `canSubmit=false`.
- [x] Validasi amount client-side terhadap `availableAmount`, tetapi backend tetap source of truth.
- [x] Setelah create/approve/disburse:
  - invalidate payment list;
  - invalidate payment detail;
  - invalidate summary;
  - invalidate dashboard stats.
- [x] UI action mengikuti FSM:
  - `SUBMITTED`: auditor approve/reject;
  - `AUDITOR_APPROVED`: agency approve/reject;
  - `AGENCY_APPROVED`: loan provider disburse;
  - rejected/paid: terminal.
- [x] Tampilkan error:
  - `PENDING_REQUEST_EXISTS`
  - `AMOUNT_EXCEEDS_CONTRACT_VALUE`
  - `AMOUNT_EXCEEDS_AVAILABLE`
  - `INVALID_STATUS_TRANSITION`
  - `NOT_CONTRACT_AUDITOR`
  - `NOT_CONTRACT_EXECUTING_AGENCY`

Status implementasi:

- `src/lib/finance.ts` ditambahkan untuk mapping error finance dan helper FSM action.
- Create payment request memakai `PaymentSummary` sebelum submit, memblokir submit saat `canSubmit=false`, dan menolak amount yang melebihi `availableAmount` sebelum request dikirim.
- Backend tetap source of truth: error code finance dari API dimapping menjadi pesan user-facing di create/detail flow.
- Payment request list tetap menampilkan tombol `New Request` untuk contractor, tetapi disabled ketika summary `canSubmit=false`.
- Detail payment request memakai helper FSM:
  - `SUBMITTED` hanya menampilkan auditor approve/reject untuk auditor;
  - `AUDITOR_APPROVED` hanya menampilkan agency approve/reject untuk executing agency;
  - `AGENCY_APPROVED` hanya menampilkan disburse untuk loan provider;
  - rejected/paid dianggap terminal.
- Mutasi create/approve/reject/disburse memakai `invalidationMap.payment`, sehingga list, detail, summary, dan dashboard stats ikut di-refresh.
- `npm run build` pass.

Definition of done:

- duplicate/parallel submit lebih sulit dari UI;
- status action finance sesuai backend;
- query invalidation benar.

## 10. Tahap 7: WebSocket Realtime Client

Target file baru yang disarankan:

```text
src/types/realtime.ts
src/services/realtime/websocket.service.ts
src/providers/realtime-provider.tsx
src/hooks/use-realtime.ts
```

Target file existing:

```text
src/providers/index.ts
src/providers/query-provider.tsx
src/constants/query-keys.ts
src/constants/env.ts
```

Checklist:

- [x] Tambah env optional:

```ts
NEXT_PUBLIC_WS_URL
```

Jika tidak ada, derive dari `NEXT_PUBLIC_API_URL`:

```text
http://localhost:7777 -> ws://localhost:7777/api/realtime/ws
https://api.example.com -> wss://api.example.com/api/realtime/ws
```

- [x] Tambah type realtime:
  - `RealtimeEnvelope<T>`;
  - `RealtimeConnectedData`;
  - `RealtimeSubscriptionUpdatedData`;
  - `DomainEventData`;
  - event type union.
- [x] Buat WebSocket client:
  - connect ke `/api/realtime/ws?accessToken={accessToken}`;
  - handle `realtime.connected`;
  - support `subscribe(topics)`;
  - support `unsubscribe(topics)`;
  - ping interval 25-30 detik;
  - reconnect dengan exponential backoff;
  - stop reconnect saat logout.
- [x] Buat `RealtimeProvider` yang hidup hanya saat authenticated.
- [x] Subscribe default:
  - `user.{userId}`.
- [x] Subscribe project topics sesuai halaman aktif:
  - `project.{projectId}`;
  - `project.{projectId}.monitoring`;
  - `project.{projectId}.ticket`;
  - `project.{projectId}.finance`.
- [x] Saat event domain masuk, invalidasi query:
  - monitoring event -> task/log/scurve/dashboard;
  - ticket event -> ticket list/detail/dashboard;
  - payment event -> payment list/detail/summary/dashboard;
  - member invited -> organization/user related.
- [x] Jika topic masuk `rejected`, tampilkan dev log atau silent fallback; jangan tutup koneksi.

Status implementasi:

- `src/constants/env.ts` sekarang mendukung optional `NEXT_PUBLIC_WS_URL`; jika kosong, client derive URL dari `NEXT_PUBLIC_API_URL` ke `/api/realtime/ws`.
- `src/types/realtime.ts` ditambahkan untuk envelope, connected data, subscription update, domain event, error/pong, dan status koneksi.
- `src/services/realtime/websocket.service.ts` ditambahkan sebagai WebSocket client dengan `accessToken` query param, subscribe/unsubscribe, ping 28 detik, reconnect exponential backoff, dan close tanpa reconnect saat logout.
- `src/providers/realtime-provider.tsx` hidup di bawah `AuthProvider`, connect hanya saat authenticated, subscribe `user.{userId}`, dan subscribe topic project dari pathname aktif.
- `src/hooks/use-realtime.ts` tersedia untuk membaca status/topik realtime jika nanti perlu UI indicator.
- `src/constants/query-keys.ts` punya `queryKeys.realtime.connection()` dan `invalidateByRealtimeEvent(queryClient, envelope)` untuk invalidasi monitoring, ticket, payment, dan organization/member event.
- `src/app/layout.tsx` sudah membungkus aplikasi dengan `RealtimeProvider`.
- Rejected topics hanya di-log dengan `console.debug`; koneksi tidak ditutup.
- `npm run build` pass.

Domain event penting:

```text
progress.submitted
progress.validated
ticket.created
ticket.assigned
ticket.resolved
ticket.closed
payment.approved
payment.paid
organization.member.invited
```

Definition of done:

- REST tetap berjalan tanpa WebSocket;
- realtime hanya mempercepat refetch;
- logout menutup socket;
- reconnect tidak membuat koneksi dobel.

## 11. Tahap 8: Query Invalidation Matrix

Target file:

```text
src/constants/query-keys.ts
```

Checklist:

- [x] Tambah `queryKeys.tasks.validation(projectId)`.
- [x] Tambah query keys realtime jika perlu untuk connection state.
- [x] Update `invalidationMap.task(projectId)` agar mencakup WBS validation.
- [x] Update `invalidationMap.progressSubmit(projectId)` agar mencakup dashboard dan realtime-driven invalidation.
- [x] Update `invalidationMap.ticket(projectId, ticketId)` agar cocok dengan SLA/dashboard.
- [x] Update `invalidationMap.payment(projectId, requestId)` agar summary/dashboard/list/detail selalu sinkron.
- [x] Buat helper `invalidateByRealtimeEvent(queryClient, envelope)`.

Status implementasi:

- `queryKeys.tasks.validation(projectId)` dan invalidasi WBS sudah masuk sejak Tahap 4.
- `queryKeys.realtime.connection()` ditambahkan untuk status koneksi jika nanti perlu dipakai UI.
- `invalidationMap.progressSubmit(projectId)` sekarang ikut invalidasi progress scurve dan dashboard.
- `invalidationMap.ticket(projectId, ticketId)` dan `invalidationMap.payment(projectId, requestId)` menjadi policy yang dipakai mutation manual dan event realtime.
- `invalidateByRealtimeEvent(queryClient, envelope)` sudah memetakan event monitoring, ticket, payment, dan organization member ke invalidasi query terkait.

Definition of done:

- mutation manual dan event realtime memakai invalidation policy yang sama;
- tidak ada hardcoded invalidation tersebar di banyak component.

## 12. Tahap 9: UI Error Mapping

Target file baru yang disarankan:

```text
src/lib/error-messages.ts
```

Checklist:

- [ ] Buat map error domain backend ke label user-facing.
- [ ] Group per module:
  - auth;
  - policy;
  - WBS;
  - finance;
  - upload;
  - tracker.
- [ ] Tetap tampilkan fallback kode backend jika mapping belum ada.
- [ ] Integrasikan ke form error/toast.

Contoh:

```ts
export const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: "Terlalu banyak percobaan. Coba lagi beberapa saat.",
  WBS_CYCLE_DETECTED: "Struktur WBS tidak valid karena membentuk siklus.",
  AMOUNT_EXCEEDS_AVAILABLE: "Nominal melebihi sisa dana yang tersedia.",
};
```

Definition of done:

- user tidak hanya melihat kode mentah untuk error utama;
- developer tetap bisa melihat code backend.

## 13. Tahap 10: Testing dan Build Frontend

Target:

```text
npm run lint
npm run build
```

Checklist manual:

- [ ] Login berhasil.
- [ ] Login rate limit menampilkan countdown.
- [ ] Refresh token rotation menyimpan token baru.
- [ ] Logout memanggil backend dan membersihkan state.
- [ ] Upload image/PDF sukses dan metadata tersimpan.
- [ ] Upload invalid MIME ditolak.
- [ ] WBS validation tampil dan berubah setelah task mutation.
- [ ] Ticket list/detail tidak crash saat `sla` null/undefined.
- [ ] Finance request tidak bisa submit jika `canSubmit=false`.
- [ ] WebSocket connect, subscribe, ping/pong, reconnect.
- [ ] Realtime event membuat data list/detail ter-refetch.

Definition of done:

- `npm run lint` pass;
- `npm run build` pass;
- no TypeScript error;
- auth regression manual pass;
- realtime tetap graceful jika backend WebSocket disabled.

## 14. Urutan Eksekusi yang Disarankan

1. Tahap 1: Contract dan API client foundation.
2. Tahap 2: Auth logout/revoke/rate-limit.
3. Tahap 3: Upload metadata.
4. Tahap 4: WBS validation.
5. Tahap 5: Ticket SLA UI.
6. Tahap 6: Finance FSM/concurrency UX.
7. Tahap 8: Query invalidation matrix.
8. Tahap 7: WebSocket realtime client.
9. Tahap 9: UI error mapping.
10. Tahap 10: lint, build, dan manual QA.

Urutan ini sengaja menaruh WebSocket setelah REST contract siap, karena realtime paling aman jika hanya menginvalidasi query yang sudah benar.

## 15. Checklist Akhir

- [ ] Auth refresh URL benar memakai `/api`.
- [ ] Refresh token baru selalu disimpan.
- [ ] Logout backend dan local state sinkron.
- [ ] Revoke all tersedia.
- [ ] Rate limit UX tersedia.
- [ ] Upload response type sesuai metadata backend.
- [ ] WBS validation type/service/UI tersedia.
- [ ] Ticket SLA type/UI tersedia.
- [ ] Finance actions mengikuti FSM.
- [ ] Query invalidation mencakup dashboard/cache-sensitive data.
- [ ] WebSocket provider tersedia dan optional.
- [ ] Realtime event hanya trigger refetch/invalidation.
- [ ] Error domain utama punya mapping UI.
- [ ] `npm run lint` pass.
- [ ] `npm run build` pass.
