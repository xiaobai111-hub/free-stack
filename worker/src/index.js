// free-stack Worker：轻接口，代理读写 Supabase（jobs 表）
// 环境变量（在 Cloudflare Dashboard 或 wrangler secret 设置，勿写真实值进代码）：
//   SUPABASE_URL       例：https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  Supabase 项目的 anon public key
// 路由：
//   GET  /health  健康检查
//   GET  /jobs    读最近 50 条任务（代理 Supabase REST）
//   POST /job     新建一条任务 {kind, prompt}

const JSON_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function handleJobs(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json({ error: "SUPABASE_URL / SUPABASE_ANON_KEY 未配置" }, 500);
  }
  const url = `${env.SUPABASE_URL}/rest/v1/jobs?select=*&order=created_at.desc&limit=50`;
  const res = await fetch(url, { headers: supabaseHeaders(env) });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: JSON_HEADERS });
}

async function handleCreateJob(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json({ error: "SUPABASE_URL / SUPABASE_ANON_KEY 未配置" }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体不是合法 JSON" }, 400);
  }
  const kind = body.kind;
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!["image", "video", "text"].includes(kind) || !prompt) {
    return json({ error: "需要 kind（image/video/text）与 prompt" }, 400);
  }
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/jobs`, {
    method: "POST",
    headers: { ...supabaseHeaders(env), Prefer: "return=representation" },
    body: JSON.stringify({ kind, prompt, status: "queued" }),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (request.method === "GET" && pathname === "/health") {
      return json({ ok: true, service: "free-stack", time: new Date().toISOString() });
    }
    if (request.method === "GET" && pathname === "/jobs") return handleJobs(env);
    if (request.method === "POST" && pathname === "/job") return handleCreateJob(request, env);
    return json({ error: "not found", routes: ["GET /health", "GET /jobs", "POST /job"] }, 404);
  },
};
