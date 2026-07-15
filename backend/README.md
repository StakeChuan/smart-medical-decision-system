# 后端启动说明

本目录是智慧医疗辅助决策系统的 FastAPI 后端。

## 1. 配置 `.env`

复制示例文件：

```bat
copy .env.example .env
```

根据本机环境修改 `.env`：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=smart_medical_system

ENVIRONMENT=development
APP_TOKEN_SECRET=
TOKEN_EXPIRE_SECONDS=43200

DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_TIMEOUT=60
```

说明：

- `DB_*` 用于连接 MySQL。
- 本机开发可使用 `ENVIRONMENT=development`；公网或正式部署应使用 `ENVIRONMENT=production`。
- production 环境必须设置至少 32 个字符的 `APP_TOKEN_SECRET`，且不能使用演示密钥。可通过 `python -c "import secrets; print(secrets.token_urlsafe(48))"` 生成。
- `TOKEN_EXPIRE_SECONDS` 控制登录凭证有效期；旧配置名 `APP_TOKEN_EXPIRE_SECONDS` 仍兼容。
- `DASHSCOPE_API_KEY` 是阿里云百炼 API Key，必须填写。
- `.env` 包含敏感信息，不能提交到 GitHub。

## 2. 初始化数据库

全新部署时，优先执行项目根目录的完整初始化脚本：

```sql
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/smart_medical_init.sql;
```

如果是旧数据库升级，再按需执行迁移脚本：

```sql
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/migrate_doctor_patient.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/create_message_tables.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/migrate_user_active_status.sql;
source E:/软件/python项目/pythonProject/基于大模型的智慧辅助医疗决策系统/update_users.sql;
```

旧账号密码迁移为 bcrypt 前，先在 `backend` 目录执行只读检查，再确认应用：

```bat
python scripts\migrate_password_hashes.py
python scripts\migrate_password_hashes.py --apply
```

迁移不会修改用户名、角色或原始密码含义，只把 `users.password` 中的历史明文替换为 bcrypt hash。即使暂未运行批量迁移，历史账号首次正确登录时也会自动升级。

## 3. 安装依赖

```bat
pip install -r requirements.txt
```

本阶段新增的运行依赖只有 `bcrypt`。

## 4. 启动服务

本机开发：

```bat
uvicorn app.main:app --reload
```

局域网访问：

```bat
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/docs
```

## 5. 核心接口

- `POST /auth/login`：医生/管理员登录
- `GET /health`：数据库连接测试
- `GET /patients`：查询患者列表
- `POST /patients`：新增患者
- `POST /consultations`：新增问诊记录
- `POST /ai/decision/{consultation_id}`：生成或重新生成 AI 报告
- `GET /admin/dashboard`：管理员看板
- `GET /admin/doctors/stats`：医生绩效统计
- `POST /admin/doctors`：管理员新增医生
- `PUT /admin/doctors/{doctor_id}`：管理员编辑医生
- `PUT /admin/doctors/{doctor_id}/password`：管理员重置医生密码
- `PUT /admin/doctors/{doctor_id}/status`：管理员启用/禁用医生
- `GET /messages/users`：查询可聊天用户
- `POST /messages`：发送消息
- `POST /messages/fetch`：手动收取消息

## 6. 默认账号

```text
管理员：admin / 228460
医生：luckyizu / 228460
```

数据库只保存以上密码的 bcrypt hash，不保存或查询明文密码。

## 7. 安全测试

```bat
python -m unittest discover -s tests -v
```

密码修改后，既有登录 token 仍按原设计有效到过期时间；本阶段没有引入 token 撤销表或改变前端认证协议。
