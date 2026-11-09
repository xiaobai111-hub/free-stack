-- free-stack Supabase 建表脚本
-- 用法：在 Supabase Dashboard → SQL Editor 里粘贴执行。
-- 注意：本脚本只建表，不配 RLS 策略。RLS 需在 Dashboard 里另配（见文件末尾注释）。

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video', 'text')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  prompt text,
  result_url text,
  created_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'text')),
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists jobs_created_at_idx on jobs (created_at desc);
create index if not exists generations_job_id_idx on generations (job_id);

-- RLS（行级安全）说明：
-- 本脚本故意不启用 RLS、不写 policy：Worker 用 anon key 经 REST 读写 jobs 表，
-- 一旦启用 RLS 而无匹配 policy，anon 请求会被全部拒绝，Worker 的 /jobs 与 /job 会直接 401。
-- 正确做法是在 Dashboard 里按需配置，示例思路：
--   1. Authentication → Settings 里确认 anon key 仅用于本项目；
--   2. 在 Table Editor → jobs → RLS 开启后，给 anon 角色加 policy，例如：
--      仅允许 select（读）与 insert（写），且 insert 时 kind 限 image/video/text；
--   3. 配完后用 Worker 的 GET /jobs 与 POST /job 各测一次，确认 200 再投入使用。
-- 在 RLS 配好之前，不要把 Worker 地址公开，也不要在 jobs 里放敏感内容。
