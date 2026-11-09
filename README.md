# 免费 AI 算力栈（free-stack）

给 MIYO 用的免费推理栈：生图、生视频、备用模型接口，配数据库、存储与自动任务。
**只含部署文件，不含任何账号与密钥。** 所有需要注册、登录、拿 Key 的步骤都由 leo 本人确认后做。

## 已排除的（不要再接回来）

| 排除项 | 原因 |
| --- | --- |
| Kaggle GPU | 手机验证锁死，leo 的中国号被拒，leo 已定直接排除 |
| Cloudflare R2 | 开通要绑卡，leo 没卡 |
| Sakupa | 免费只 30 天临时站，已有 GitHub Pages 更稳 |

## 约束（写进部署计划的前提）

- **Google Colab 免费 GPU 是 T4 16GB，只能人在浏览器里手动跑，没有合规自动跑法**；结果必须存 Google Drive（断开即失）。
- **OpenRouter 免费模型 50 次/天**，OpenAI 兼容 API；Key 由 leo 注册后取得，不进仓库。
- **Supabase 免费档 500MB 库 + 1GB 存储，7 天不用会暂停**；至少每周碰一次（每日健康检查的 `/jobs` 读不算写操作，仍建议每周至少手动打开一次项目）。
- **GitHub Actions 公开仓库免费分钟不限**，支持 schedule 定时。

## 文件清单

| 文件 | 说明 |
| --- | --- |
| `colab/qwen-image-2.1.ipynb` | Colab 文生图：Qwen-Image-2.1（7B，bf16 + CPU offload），1024×1024，产物存 Drive |
| `colab/wan2.2-5b.ipynb` | Colab 文生视频：Wan2.2-TI2V-5B（Apache 2.0），480p / 33 帧，产物存 Drive |
| `worker/src/index.js` | Cloudflare Worker 轻接口：`GET /health`、`GET /jobs`、`POST /job`（代理 Supabase REST） |
| `worker/wrangler.toml` | Worker 配置；Supabase 地址与 anon key 只用 secret 占位，不写真实值 |
| `.github/workflows/stack-daily.yml` | 每日 00:00 UTC + 手动触发：curl Worker `/health`，结果写 `status/health.json` 并提交 |
| `supabase/schema.sql` | 建 `jobs` 与 `generations` 两张表；RLS 需在 Supabase 面板另配（见文件末尾注释） |

两个笔记本顶部都已注明“未在 GPU 上实测，首跑需在 Colab 里验证”；**没有任何文件声称已测试通过**。

## 部署顺序

1. **Supabase 建项目**（leo 授权）：在 Supabase 新建免费项目 → SQL Editor 里执行 `supabase/schema.sql` → 记下项目 URL 与 anon key（不进仓库）。
2. **Worker 部署**（leo 授权）：`cd worker && npx wrangler deploy` → 用 `wrangler secret put` 配 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY` → 浏览器打开 `https://<worker>/health` 核对 `{"ok":true}`，再测 `GET /jobs` 与 `POST /job`。
3. **GitHub 公开仓库 + 工作流**（leo 授权）：新建公开仓库（工作流在 `.github/workflows/`）→ 在仓库 Variables 里设 `WORKER_URL` → 手动触发一次，核对 `status/health.json` 被提交。
4. **Colab 首跑**（leo 授权，浏览器手动跑）：上传两个 `.ipynb` 到 Colab，运行时选 T4 GPU，按笔记本内顺序执行；先跑 Qwen 生图，再跑 Wan 视频；产物核对 Drive 目录。
5. **OpenRouter 注册拿 Key**（leo 授权）：注册后 Key 只存 Worker secret 或本地，不进任何文件；免费模型 50 次/天，用作备用文本模型接口。

## 需要 leo 授权的步骤（其余自动化都由 MIYO 做）

- OpenRouter 注册拿 Key
- Supabase 建项目（+ SQL 执行）
- Colab 首跑（浏览器里手动跑，无法代跑）
- Worker 部署（`wrangler deploy` 与 secret 配置）
- GitHub 公开仓库新建与工作流启用

## 注意事项

- Qwen-Image-2.1 是 **Qwen Research License，仅限非商用**；Wan2.2-TI2V-5B 是 Apache 2.0。
- Wan2.2-TI2V-5B 官方参考称单卡推理至少 24GB 显存，T4 16GB 低于下限，笔记本用 CPU offload + VAE tiling 硬上，首跑即验证点；若 OOM，按笔记本内清单降帧/降分辨率。
- Qwen 首次加载约下载 30GB 权重，Colab 磁盘与下载时间都要留够。
- Supabase 免费档 7 天不用会暂停，记得每周至少打开一次项目。
- OpenRouter 免费档 50 次/天，超了当天即停，等次日恢复。
