# 基于大模型的智慧医疗辅助决策系统

这是一个基于 FastAPI、MySQL 和大模型能力构建的智慧医疗辅助决策系统，用于支持医生问诊、患者管理、AI 辅助分析、报告审阅、管理员运营和站内协作。

项目目前同时保留两个前端：

- `frontend`：原生 HTML/CSS/JavaScript 旧版前端，功能完整，可继续使用。
- `frontend-v2`：React 企业级新版前端，当前已完成登录、全局布局、Design System 和医生工作台，其他业务按阶段迁移。

## 主要功能

- 医生/管理员登录
- 患者新增、编辑、删除和历史查看
- 问诊录入并生成 AI 辅助决策报告
- AI 报告复制、打印、重新生成
- 管理员看板、医生管理、医生绩效统计
- 管理员新增/编辑/禁用医生、重置医生密码
- 消息中心：管理员与医生、医生与医生之间发送消息
- 手机端局域网访问适配

## 技术栈

- 后端：FastAPI、SQLAlchemy、PyMySQL
- 旧版前端：HTML、CSS、JavaScript
- 新版前端：React 18、Vite、TypeScript、TailwindCSS、shadcn/ui
- 前端数据与表单：TanStack Query、React Hook Form、Zod
- 数据库：MySQL
- 大模型：阿里云百炼 DashScope 兼容 OpenAI SDK 调用

## 项目结构

```text
backend/
  app/
    main.py        后端接口
    models.py      SQLAlchemy 数据库模型
    schemas.py     Pydantic 数据结构
    database.py    MySQL 连接
  requirements.txt
  .env.example

frontend/
  index.html       前端页面
  app.js           前端主逻辑
  messages.js      消息中心逻辑
  styles.css       前端样式

frontend-v2/
  src/
    api/            FastAPI 请求与数据转换
    components/     Design System、布局和业务组件
    features/       认证、工作台等功能模块
    pages/          React 页面
    routes/         路由与角色守卫
    styles/         TailwindCSS 与设计变量
  package.json      Node.js 依赖与运行脚本
  .env.example      新版前端 API 地址示例

smart_medical_init.sql              完整初始化数据库脚本
migrate_doctor_patient.sql          旧库补 patients.doctor_id
create_message_tables.sql           旧库补消息中心表
migrate_user_active_status.sql      旧库补 users.is_active
update_users.sql                    旧库补演示账号
```

## 环境要求

- Python 3.10+
- Node.js 18+（推荐使用当前 LTS 版本）
- npm 9+
- MySQL 8.0 或兼容版本
- Git
- 现代浏览器：Chrome、Edge 等

## 1. 下载项目

```bat
git clone https://github.com/StakeChuan/smart-medical-decision-system.git
cd smart-medical-decision-system
```

如果是在本机已有项目目录中使用，直接进入项目根目录即可。

## 2. 初始化数据库

### 全新数据库推荐方式

如果是第一次部署，直接执行完整初始化脚本：

```bat
mysql -u root -p
```

进入 MySQL 后执行：

```sql
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/smart_medical_init.sql;
```

这张脚本会创建：

- 数据库：`smart_medical_system`
- 用户表：`users`
- 患者表：`patients`
- 问诊表：`consultations`
- AI 报告表：`ai_reports`
- 消息会话表：`message_conversations`
- 消息表：`messages`

同时会创建演示账号：

```text
管理员：admin / 228460
医生：luckyizu / 228460
```

### 已有旧数据库升级方式

如果数据库已经存在，只是缺少后续功能字段或表，可以按需要执行：

```sql
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/migrate_doctor_patient.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/create_message_tables.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/migrate_user_active_status.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/update_users.sql;
```

说明：

- `migrate_doctor_patient.sql`：给 `patients` 表增加 `doctor_id`
- `create_message_tables.sql`：创建消息中心相关表
- `migrate_user_active_status.sql`：给 `users` 表增加 `is_active`
- `update_users.sql`：更新/创建演示账号

## 3. 配置后端环境变量

进入后端目录：

```bat
cd backend
copy .env.example .env
```

编辑 `backend/.env`，至少填写：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=smart_medical_system

DASHSCOPE_API_KEY=你的阿里云百炼APIKey
```

注意：

- `backend/.env` 不要提交到 GitHub。
- `.gitignore` 已经忽略 `.env` 和 `backend/.env`。
- `backend/.env.example` 可以提交，用作配置示例。

## 4. 安装后端依赖

在 `backend` 目录执行：

```bat
pip install -r requirements.txt
```

如果提示缺少 `openai`，也可以单独安装：

```bat
pip install openai
```

## 5. 启动后端

电脑本机访问：

```bat
uvicorn app.main:app --reload
```

局域网手机访问时，建议使用：

```bat
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动成功后访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/docs
```

## 6. 启动新版前端（推荐）

新版 React 前端不能直接双击 `index.html`，需要通过 Vite 启动。

首次运行时进入新版前端目录并安装依赖：

```bat
cd frontend-v2
npm install
```

如果 npm 提示 `esbuild` 安装脚本尚未批准，执行：

```bat
npm approve-scripts esbuild
npm rebuild esbuild
```

启动开发服务：

```bat
npm run dev
```

浏览器访问：

```text
http://127.0.0.1:5175
```

日常使用时，只需要分别保持两个终端运行：

```text
Anaconda Prompt：backend 目录启动 FastAPI（8000）
CMD / PyCharm Terminal：frontend-v2 目录运行 npm run dev（5175）
```

### 新版前端 API 配置

`.env.example` 是配置模板，Vite 实际读取的是 `frontend-v2/.env`。

本机开发通常不需要创建 `.env`，代码默认连接：

```text
http://127.0.0.1:8000
```

也可以复制模板：

```bat
cd frontend-v2
copy .env.example .env
```

本机配置：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

通过 Cloudflare Tunnel 公网访问时，将 `frontend-v2/.env` 改为后端 Tunnel 地址：

```env
VITE_API_BASE_URL=https://你的后端地址.trycloudflare.com
```

修改 `.env` 后需要停止并重新运行 `npm run dev`；生产构建则需要重新执行 `npm run build`。

注意：`frontend-v2/.env` 只能存放可公开的前端配置，不能写入数据库密码、AI API Key 或账号密码。所有 `VITE_` 开头的变量都会进入浏览器代码。

### 新版前端检查与构建

```bat
npm run typecheck
npm run lint
npm run build
```

构建结果输出到 `frontend-v2/dist/`，该目录不提交 Git。

## 7. 启动旧版前端

旧版前端仍可用于尚未迁移到 React 的功能。

简单方式：

```text
直接打开 frontend/index.html
```

如果需要手机访问，建议在项目根目录启动静态服务：

```bat
python -m http.server 5500 --bind 0.0.0.0
```

电脑访问：

```text
http://127.0.0.1:5500/frontend/
```

手机访问：

```text
http://电脑IPv4地址:5500/frontend/
```

手机和电脑需要连接同一个局域网。

## 8. 默认账号

```text
管理员：admin / 228460
医生：luckyizu / 228460
```

管理员登录后可以新增医生、编辑医生、重置密码、禁用/启用医生账号。

## 9. 常见问题

### 1. 登录失败

检查：

- 后端是否启动
- MySQL 是否启动
- `.env` 数据库密码是否正确
- 是否已经执行 `smart_medical_init.sql`
- 账号是否被管理员禁用

### 2. AI 报告生成失败

检查：

- `DASHSCOPE_API_KEY` 是否填写
- 网络是否能访问阿里云百炼接口
- `openai` 依赖是否安装
- 后端控制台是否有错误日志

### 3. 手机打不开页面

检查：

- 后端是否使用 `--host 0.0.0.0`
- 前端是否使用 `python -m http.server 5500 --bind 0.0.0.0`
- 手机和电脑是否在同一 Wi-Fi
- Windows 防火墙是否拦截 8000 或 5500 端口

### 4. GitHub 上没有 `.env`

这是正常的。`.env` 包含数据库密码和 API Key，不应该上传。

### 5. 新版前端无法启动

在 `frontend-v2` 目录依次检查：

```bat
npm install
npm run typecheck
npm run build
```

如果提示 `esbuild` 未批准，执行：

```bat
npm approve-scripts esbuild
npm rebuild esbuild
```

### 6. 新版前端能打开但无法登录

检查：

- FastAPI 是否运行在 `http://127.0.0.1:8000`
- `frontend-v2/.env` 是否配置了正确的后端地址
- 修改 `.env` 后是否重新启动 Vite
- 公网访问时填写的是后端 Tunnel，而不是前端 Tunnel

## 10. Git 日常提交

查看改动：

```bat
git status
```

提交改动：

```bat
git add .
git commit -m "本次修改说明"
git push
```

如果只想提交指定文件：

```bat
git add frontend/app.js frontend/styles.css
git commit -m "优化前端样式"
git push
```

新版前端的 `node_modules/`、`dist/`、`.env` 和 `*.tsbuildinfo` 已由 `.gitignore` 排除；`package-lock.json`、`.env.example` 和 `src/` 应正常提交。
