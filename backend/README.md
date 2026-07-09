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

APP_TOKEN_SECRET=smart-medical-demo-secret
APP_TOKEN_EXPIRE_SECONDS=43200

DASHSCOPE_API_KEY=你的阿里云百炼APIKey
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_TIMEOUT=60
```

说明：

- `DB_*` 用于连接 MySQL。
- `APP_TOKEN_SECRET` 用于生成登录 token，正式环境建议改成更复杂的随机字符串。
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

## 3. 安装依赖

```bat
pip install -r requirements.txt
```

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
