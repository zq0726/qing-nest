# Qing Nest

基于 NestJS 11 + TypeORM + MySQL + Redis + WebSocket 的全功能后端模板，内置 JWT 认证、动态定时任务、大文件分片上传、实时通信等核心能力。

## 技术栈

| 层级      | 技术                                   |
| --------- | -------------------------------------- |
| 框架      | NestJS 11                              |
| ORM       | TypeORM + MySQL                        |
| 缓存/消息 | Redis (ioredis)                        |
| 认证      | JWT + Passport                         |
| WebSocket | Socket.IO                              |
| 定时任务  | @nestjs/schedule + cron                |
| 日志      | Winston + 按日轮转                     |
| 文档      | Swagger (OpenAPI)                      |
| 安全      | Helmet + CORS 白名单 + bcrypt          |
| 代码规范  | ESLint + Prettier + Husky + Commitlint |

## 功能模块

- **用户管理**：注册、查询、更新、删除、分页
- **JWT 认证**：登录签发 token、全局守卫、`@Public` / `@CurrentUser` 装饰器
- **文件上传**：分片上传、断点续传、合并、文件类型白名单、路径遍历防护
- **WebSocket**：实时聊天、房间、在线状态、JWT 强制验证、Redis 状态共享
- **定时任务**：数据库持久化、前端 CRUD、4 种任务类型、防并发执行、手动触发
- **健康检查**：验证 DB / Redis 实际可用性
- **静态服务**：public 目录 + uploads 目录分离托管

## 快速开始

### 环境要求

- Node.js >= 20
- MySQL >= 8.0
- Redis (可选，未启用时自动降级为内存)
- pnpm >= 9

### 安装

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env.development
```

编辑 `.env.development`，填写数据库密码和 JWT 密钥：

```bash
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=qing_nest

# JWT（至少 16 字符）
JWT_SECRET=your-strong-secret-key
```

### 启动开发服务

```bash
pnpm start:dev
```

启动后访问：

- API：http://localhost:3000/api
- Swagger 文档：http://localhost:3000/docs
- 健康检查：http://localhost:3000/api/health

### 构建

```bash
pnpm build
pnpm start:prod
```

## 项目结构

```
src/
├── common/                  # 公共模块
│   ├── decorators/          # @Public, @CurrentUser 装饰器
│   ├── entities/            # BaseEntity 基类（id/createdAt/updatedAt）
│   ├── exceptions/          # 业务异常 + 错误码枚举
│   ├── filters/             # 全局异常过滤器（HTTP + 兜底）
│   ├── interceptors/        # 统一响应格式拦截器
│   ├── middleware/          # 请求日志中间件
│   └── utils/               # bcrypt 工具封装
├── config/                  # 配置中心
│   ├── app.config.ts        # Helmet/CORS/管道/过滤器/Swagger
│   ├── database.config.ts   # TypeORM（连接池/重试/日志）
│   ├── env.validation.ts    # Joi 环境变量校验
│   ├── jwt.config.ts        # JWT 工厂配置
│   ├── logger.config.ts     # Winston 日志（控制台+文件轮转）
│   ├── redis.config.ts      # Redis 连接配置
│   └── swagger.config.ts    # Swagger 文档配置
├── modules/
│   ├── system/              # 系统基础设施模块
│   │   ├── health/          # 健康检查（DB/Redis 可用性）
│   │   ├── redis/           # Redis 服务（可开关/Set 操作）
│   │   ├── tasks/           # 定时任务（动态 CRUD/4 种类型/防并发）
│   │   └── websocket/       # WebSocket（聊天/房间/JWT 验证）
│   └── app/                 # 业务功能模块
│       ├── auth/            # 认证（登录/JWT 策略/全局守卫）
│       ├── upload/          # 文件上传（分片/断点续传/类型校验）
│       └── users/           # 用户管理（CRUD/分页）
├── utils/                   # banner 输出
├── app.module.ts            # 根模块
└── main.ts                  # 入口
```

### 模块分类说明

| 分类         | 目录              | 包含模块                        | 说明                           |
| ------------ | ----------------- | ------------------------------- | ------------------------------ |
| 系统基础设施 | `modules/system/` | health、redis、tasks、websocket | 支撑性技术能力，与具体业务无关 |
| 业务功能     | `modules/app/`    | auth、upload、users             | 具体业务领域，面向用户场景     |

## 环境变量

| 变量               | 说明                         | 默认值      |
| ------------------ | ---------------------------- | ----------- |
| `NODE_ENV`         | 环境标识                     | development |
| `PORT`             | 服务端口                     | 3000        |
| `CORS_ORIGINS`     | HTTP CORS 白名单（逗号分隔） | -           |
| `DB_HOST`          | MySQL 主机                   | localhost   |
| `DB_PORT`          | MySQL 端口                   | 3306        |
| `DB_USERNAME`      | MySQL 用户名                 | root        |
| `DB_PASSWORD`      | MySQL 密码                   | -           |
| `DB_DATABASE`      | 数据库名                     | qing_nest   |
| `REDIS_ENABLED`    | 是否启用 Redis               | false       |
| `REDIS_HOST`       | Redis 主机                   | localhost   |
| `REDIS_PORT`       | Redis 端口                   | 6379        |
| `REDIS_PASSWORD`   | Redis 密码                   | -           |
| `REDIS_DB`         | Redis 数据库                 | 0           |
| `JWT_SECRET`       | JWT 密钥（≥16字符）          | -           |
| `JWT_EXPIRES_IN`   | JWT 过期时间                 | 7d          |
| `SCHEDULE_ENABLED` | 是否启用定时任务             | true        |
| `WS_CORS_ORIGINS`  | WebSocket CORS 白名单        | -           |

## API 概览

### 认证

| 方法 | 路径                | 认证   | 说明             |
| ---- | ------------------- | ------ | ---------------- |
| POST | `/api/auth/login`   | 公开   | 登录获取 token   |
| GET  | `/api/auth/profile` | Bearer | 获取当前用户信息 |

### 用户

| 方法   | 路径             | 认证   | 说明             |
| ------ | ---------------- | ------ | ---------------- |
| POST   | `/api/users`     | 公开   | 注册用户         |
| GET    | `/api/users`     | Bearer | 用户列表（分页） |
| GET    | `/api/users/:id` | Bearer | 用户详情         |
| PATCH  | `/api/users/:id` | Bearer | 更新用户         |
| DELETE | `/api/users/:id` | Bearer | 删除用户         |

### 文件上传

| 方法   | 路径                           | 认证   | 说明                  |
| ------ | ------------------------------ | ------ | --------------------- |
| POST   | `/api/upload/chunk`            | Bearer | 上传分片（multipart） |
| GET    | `/api/upload/chunks?fileHash=` | Bearer | 查询已上传分片        |
| POST   | `/api/upload/merge`            | Bearer | 合并分片              |
| DELETE | `/api/upload?fileHash=`        | Bearer | 删除文件              |

### 定时任务

| 方法   | 路径                    | 认证   | 说明      |
| ------ | ----------------------- | ------ | --------- |
| GET    | `/api/tasks`            | Bearer | 任务列表  |
| POST   | `/api/tasks`            | Bearer | 创建任务  |
| PATCH  | `/api/tasks/:id`        | Bearer | 更新任务  |
| DELETE | `/api/tasks/:id`        | Bearer | 删除任务  |
| PATCH  | `/api/tasks/:id/toggle` | Bearer | 启用/禁用 |
| POST   | `/api/tasks/:id/run`    | Bearer | 手动触发  |

### WebSocket

连接时需在 `handshake.auth.token` 中携带 JWT：

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' },
});

socket.on('connect', () => console.log('已连接'));
socket.on('system:auth-error', (err) => console.log('认证失败', err));

// 发送消息
socket.emit('chat:message', { content: 'Hello' });

// 加入房间
socket.emit('chat:join-room', { room: 'room-1' });
```

## 统一响应格式

所有接口返回统一结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

错误时返回业务错误码（见 `ErrorCode` 枚举）：

```json
{
  "code": 12001,
  "message": "用户名或密码错误",
  "data": null
}
```

## 定时任务类型

| 类型           | 说明                 | payload 示例                            |
| -------------- | -------------------- | --------------------------------------- |
| `notify`       | 系统通知（记录日志） | `{"message":"心跳正常"}`                |
| `cleanup_tmp`  | 清理临时文件         | `{"maxAgeHours":24}`                    |
| `ws_broadcast` | WebSocket 广播       | `{"event":"ping","data":{}}`            |
| `webhook`      | HTTP 调用            | `{"url":"https://...","method":"POST"}` |

## 脚本

| 命令              | 说明               |
| ----------------- | ------------------ |
| `pnpm start:dev`  | 开发模式（热重载） |
| `pnpm build`      | 构建               |
| `pnpm start:prod` | 生产模式启动       |
| `pnpm lint`       | ESLint 检查并修复  |
| `pnpm format`     | Prettier 格式化    |
| `pnpm test`       | 单元测试           |
| `pnpm test:e2e`   | E2E 测试           |

## 安全设计

- **JWT 强制验证**：HTTP 接口通过全局 `JwtAuthGuard` 保护，`@Public()` 标记公开接口；WebSocket 连接时也强制验证 JWT
- **CORS 白名单**：HTTP 和 WebSocket 分别从环境变量读取允许的源
- **密码安全**：bcrypt 哈希存储，`select: false` 防止密码泄露
- **Helmet**：设置安全 HTTP 头
- **输入校验**：全局 `ValidationPipe`（whitelist + forbidNonWhitelisted + transform）
- **文件上传**：扩展名白名单、路径遍历防护（basename）、分片大小限制
- **Swagger**：生产环境关闭
- **数据库**：生产环境关闭 synchronize

## License

UNLICENSED
