# Snail TodoList

<img align="right" height="96px" src="./public/logo.png" alt="Snail TodoList" />

An open-source, self-hosted task management application. Your tasks, your data, your control — no tracking, no ads, no subscription fees.

[![Home](https://img.shields.io/badge/🏠-Home-blue?style=flat-square)](https://github.com/wuuJiawei/snail-todolist)
[![Live Demo](https://img.shields.io/badge/✨-Try%20Demo-orange?style=flat-square)](https://snail-todolist.vercel.app)
[![Docs](https://img.shields.io/badge/📚-Documentation-green?style=flat-square)](./docs)
[![Docker](https://img.shields.io/docker/pulls/wujiawei0926/snail-todolist?style=flat-square&logo=docker)](https://hub.docker.com/r/wujiawei0926/snail-todolist)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

<img src="./docs/screenshots/snailtodo-screenshot-1.png" alt="Snail TodoList Demo Screenshot" width="100%" />

## Overview

Snail TodoList is a privacy-first, self-hosted task management tool designed for personal todos, team collaboration, and project management. Built with React + TypeScript frontend and Go backend, it delivers a smooth user experience while ensuring complete data ownership.

**Why choose Snail TodoList over cloud services?**

| Feature            | Snail TodoList                  | Cloud Services                |
| ------------------ | ------------------------------- | ----------------------------- |
| **Privacy**        | ✅ Self-hosted, zero telemetry  | ❌ Data on third-party servers|
| **Cost**           | ✅ Free forever, MIT license    | ❌ Subscription fees          |
| **Performance**    | ✅ Local, instant response      | ⚠️ Depends on internet        |
| **Data Ownership** | ✅ Full control & export        | ❌ Vendor lock-in             |
| **Offline Mode**   | ✅ Complete offline support     | ❌ Requires internet          |
| **Customization**  | ✅ Open source, freely modifiable| ❌ Closed ecosystem          |

## Features

### 🔒 Privacy-First Architecture
- Self-hosted on your infrastructure with zero telemetry
- Complete data ownership and export capabilities
- No tracking, no ads, no vendor lock-in

### 📝 Markdown Native
- Full Markdown editing experience
- Rich text editor with code highlighting and image upload
- Plain text storage for easy data migration

### 💾 Dual Storage Modes
- **Online Mode**: Self-hosted backend with multi-device sync
- **Offline Mode**: IndexedDB local storage, no network required

### ⚡ Blazing Fast
- Modern frontend built with React 18 + TypeScript
- Go backend for high performance and low resource usage
- Optimized for handling large task lists

### 🐳 Simple Deployment
- One-line Docker installation
- PostgreSQL database support
- Desktop client available (Wails)

### 🎯 Feature-Rich
- Project grouping and task management
- Tag system with smart filtering
- Pomodoro timer
- Check-in calendar and statistics
- Task activity tracking
- Data import/export

### 🎨 Beautiful Interface
- Clean, modern design
- Dark mode support
- Responsive layout for all screen sizes

## Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/wuuJiawei/snail-todolist.git
cd snail-todolist

# One-line deployment
./scripts/quick-deploy.sh
```

Visit `http://localhost` to start using!

### Offline Mode (No Backend Required)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` and click "Offline Mode" to start.

### Desktop Client

Download the client for your operating system:

- **macOS**: [Download .dmg](https://github.com/wuuJiawei/snail-todolist/releases)
- **Windows**: [Download .exe](https://github.com/wuuJiawei/snail-todolist/releases)
- **Linux**: [Download .AppImage](https://github.com/wuuJiawei/snail-todolist/releases)

### Other Deployment Methods

- **Docker Compose** - For production deployments
- **Vercel** - One-click deploy to Vercel
- **Static Hosting** - Deploy to any static hosting service
- **Build from Source** - For development and customization

See our [deployment documentation](./docs/DOCKER_DEPLOY_SIMPLE.md) for detailed instructions.

## Documentation

- 📖 [Quick Start Guide](./docs/DOCKER_DEPLOY_SIMPLE.md)
- 🐳 [Docker Deployment](./docs/DOCKER_DEPLOYMENT.md)
- 🖥️ [Desktop Client Guide](./docs/wails-guide.md)
- 🔧 [Development Setup](./docs/SETUP.md)
- 📦 [Data Import/Export](./docs/DOCKER_DEPLOY_SIMPLE.md#data-backup)

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite build tool
- shadcn/ui + Radix UI components
- TailwindCSS styling
- Zustand state management
- TanStack Query for data fetching

**Backend**
- Go language
- PostgreSQL database
- RESTful API

**Desktop Client**
- Wails (Go + WebView)

## Contributing

We welcome contributions of all kinds! Whether you're fixing bugs, adding features, improving documentation, or helping with translations — every contribution matters.

**Ways to contribute:**

- 🐛 [Report bugs](https://github.com/wuuJiawei/snail-todolist/issues/new)
- 💡 [Suggest features](https://github.com/wuuJiawei/snail-todolist/issues/new)
- 🔧 [Submit pull requests](https://github.com/wuuJiawei/snail-todolist/pulls)
- 📖 [Improve documentation](https://github.com/wuuJiawei/snail-todolist/tree/main/docs)
- 🌍 [Help with translations](./src/locales)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Roadmap

- [ ] 📱 Native mobile apps (iOS/Android)
- [ ] 👥 Team collaboration features
- [ ] 📅 Calendar view
- [ ] 📋 Subtask support
- [ ] 🔌 More integrations (Telegram, Slack, etc.)
- [ ] 📖 API documentation and SDK
- [ ] 🌐 More language support
- [ ] 🔔 Notification and reminder system

Check [Issues](https://github.com/wuuJiawei/snail-todolist/issues) for more planned features.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=wuuJiawei/snail-todolist&type=Date)](https://star-history.com/#wuuJiawei/snail-todolist&Date)

## License

Snail TodoList is open-source software licensed under the [MIT License](LICENSE).

## Privacy Policy

Snail TodoList is built with privacy as a core principle. As a self-hosted application, all your data stays on your infrastructure. There is no telemetry, no tracking, and no data collection.

**Our commitment:**
- ✅ No personal information collected
- ✅ No tracking or analytics tools used
- ✅ No data shared with third parties
- ✅ Fully open source and auditable

---

**[Home](https://github.com/wuuJiawei/snail-todolist)** • **[Live Demo](https://snail-todolist.vercel.app)** • **[Documentation](./docs)** • **[Issues](https://github.com/wuuJiawei/snail-todolist/issues)**

---

<p align="center">
  <sub>Made with ❤️</sub>
</p>
