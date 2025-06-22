# 🚀 Dokploy Dashboard Pro

Modern Docker container management dashboard that supplements your existing Dokploy setup with real-time monitoring and container controls.

![Dokploy Dashboard](https://img.shields.io/badge/Dokploy-Dashboard-purple?style=for-the-badge&logo=docker)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)

## ✨ Features

- 🎮 **Real Container Controls** - Start, stop, restart containers with safety checks
- 📊 **Live Monitoring** - Real-time CPU, memory, and network metrics
- 🌐 **Traefik Integration** - Automatic domain detection from routing rules
- 🔍 **Smart Detection** - Identifies Dokploy-managed vs user containers
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations
- 🔒 **Safety First** - Prevents stopping critical infrastructure (Dokploy/Traefik)
- 📱 **Responsive** - Works perfectly on desktop and mobile

## 🏗️ Architecture

This dashboard **supplements** your existing Dokploy setup:
- Reads containers via Docker API
- Identifies services through Traefik labels
- Provides additional monitoring and control
- Does NOT replace Dokploy - works alongside it!

## 🚀 Quick Deploy with Dokploy

### Option 1: Deploy via Dokploy UI (Recommended)

1. **Create New Project** in your Dokploy dashboard
2. **Add Service** → **Docker Compose**
3. **Repository**: `https://github.com/AndersPier/dokploy-dashboard-pro.git`
4. **Update domains** in docker-compose.yml:
   ```yaml
   labels:
     - "traefik.http.routers.dashboard.rule=Host(`dashboard.yourdomain.com`)"
   ```
5. **Deploy!**

### Option 2: Manual Docker Compose

```bash
# Clone the repository
git clone https://github.com/AndersPier/dokploy-dashboard-pro.git
cd dokploy-dashboard-pro

# Update your domain in docker-compose.yml
# Then deploy
docker-compose up -d
```

## 🔧 Configuration

### Update Domain
Edit `docker-compose.yml` and change:
```yaml
labels:
  - "traefik.http.routers.dashboard.rule=Host(`dashboard.yourdomain.com`)"
```

Replace `dashboard.yourdomain.com` with your actual domain.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `3000` | Application port |

## 🎯 Container Detection

The dashboard automatically detects and categorizes containers:

- **🟣 Platform** (Dokploy) - Core platform services
- **🟠 Proxy** (Traefik) - Reverse proxy and load balancer
- **🟢 Database** (PostgreSQL, Redis, etc.) - Data services
- **⚪ Application** - Your deployed apps

## 🛡️ Safety Features

- **Critical Service Protection**: Prevents stopping Dokploy/Traefik
- **Confirmation Dialogs**: Confirms destructive actions
- **Loading States**: Visual feedback during operations
- **Error Handling**: Clear error messages and recovery

## 📊 Monitoring

- **Real-time Stats**: CPU, memory usage per container
- **Health Status**: Visual indicators for container health
- **Uptime Tracking**: Shows how long containers have been running
- **Domain Mapping**: Lists all exposed domains via Traefik

## 🔗 Integration

### Traefik Labels
Automatically reads domains from Traefik labels:
```yaml
labels:
  - "traefik.http.routers.myapp.rule=Host(`app.example.com`)"
```

### Dokploy Labels
Recognizes Dokploy metadata:
```yaml
labels:
  - "dokploy.name=My Application"
  - "dokploy.environment=production"
  - "dokploy.project=main-site"
```

## 🚀 Next Features

- 📋 **Live Log Streaming** - Real-time container logs
- 📈 **Resource Monitoring** - Historical metrics and charts
- 🔔 **Alerts & Notifications** - Custom alert rules
- 📦 **Deployment Pipeline** - Visual deployment tracking

## 🧪 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📋 Requirements

- Docker with API access
- Existing Dokploy setup
- Node.js 18+ (for development)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this in your projects!

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/AndersPier/dokploy-dashboard-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AndersPier/dokploy-dashboard-pro/discussions)

---

**Made with ❤️ for the Dokploy community**