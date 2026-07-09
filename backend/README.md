# 基于大模型的智慧医疗辅助决策系统后端

## 1. 配置环境变量

复制 `.env.example` 为 `.env`，至少补齐数据库和阿里云百炼配置：

```text
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

- `DASHSCOPE_API_KEY` 必填
- `DASHSCOPE_BASE_URL` 不填时，代码默认使用 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `DASHSCOPE_MODEL` 默认使用 `qwen-plus`

## 2. 安装依赖

```bash
pip install -r requirements.txt
```

## 3. 启动后端

```bash
uvicorn app.main:app --reload
```

启动成功后可访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/docs
```

## 4. 当前核心接口

- `POST /auth/login`：医生/管理员登录，返回用户信息和访问令牌
- `GET /health`：数据库连接测试
- `GET /patients`：查询患者列表
- `POST /patients`：新增患者
- `POST /consultations`：新增问诊记录
- `POST /ai/decision/{consultation_id}`：调用阿里云大模型生成 AI 报告
- `GET /admin/dashboard`：管理员平台概览统计
- `GET /admin/doctors/stats`：管理员医生绩效统计

## 5. AI 报告说明

系统会在保存问诊后调用阿里云百炼大模型，要求模型返回结构化 JSON，再写入：

- `possible_diseases`
- `suggested_checks`
- `treatment_advice`
- `risk_warning`
- `full_report`

如果模型没有严格返回 JSON，系统会退回为保存完整文本报告，仍可在前端展示。
