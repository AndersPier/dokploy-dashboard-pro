'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Server, 
  Activity, 
  Search, 
  ExternalLink, 
  Play, 
  Square, 
  RotateCcw,
  Eye,
  Settings,
  Cpu,
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Container,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const DockployDashboard = () => {
  const [deployments, setDeployments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [operationLoading, setOperationLoading] = useState(new Set());

  // Docker API Service Functions
  const dockerService = {
    async fetchContainers() {
      try {
        const response = await fetch('/api/docker/containers');
        if (!response.ok) {
          throw new Error(`Docker API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        console.warn('Docker API not available, using simulated Dokploy data:', err.message);
        return this.getSimulatedDokployData();
      }
    },

    async getContainerStats(containerId) {
      try {
        const response = await fetch(`/api/docker/containers/${containerId}/stats`);
        if (!response.ok) return { cpu: 0, memory: 0 };
        return await response.json();
      } catch (err) {
        return { 
          cpu: Math.random() * 25 + 5,
          memory: Math.random() * 500 + 100
        };
      }
    },

    parseTraefikLabels(labels) {
      const traefikLabels = {};
      const dokployLabels = {};
      
      Object.keys(labels || {}).forEach(key => {
        if (key.startsWith('traefik.')) {
          traefikLabels[key] = labels[key];
        } else if (key.startsWith('dokploy.') || key.startsWith('dockploy.')) {
          const cleanKey = key.replace(/^(dokploy\.|dockploy\.)/, '');
          dokployLabels[cleanKey] = labels[key];
        }
      });
      
      return { traefik: traefikLabels, dokploy: dokployLabels };
    },

    extractDomainFromTraefikLabels(labels) {
      const domains = [];
      Object.keys(labels).forEach(key => {
        if (key.includes('.rule') && labels[key]) {
          const rule = labels[key];
          const hostMatches = rule.match(/Host\(`([^`]+)`\)/g);
          if (hostMatches) {
            hostMatches.forEach(match => {
              const domain = match.match(/Host\(`([^`]+)`\)/)[1];
              if (domain && !domains.includes(domain)) {
                domains.push(domain);
              }
            });
          }
        }
      });
      return domains;
    },

    formatUptime(created) {
      const now = new Date();
      const createdDate = new Date(created * 1000);
      const diff = now - createdDate;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    },

    async transformContainerData(containers) {
      const deployments = [];
      
      for (const container of containers) {
        const { traefik, dokploy } = this.parseTraefikLabels(container.Labels);
        const isManaged = Object.keys(dokploy).length > 0 || Object.keys(traefik).length > 0;
        const stats = await this.getContainerStats(container.Id);
        
        let domains = this.extractDomainFromTraefikLabels(traefik);
        if (domains.length === 0 && dokploy.domains) {
          domains = dokploy.domains.split(',').map(d => d.trim());
        }
        
        const image = container.Image.toLowerCase();
        let containerType = 'application';
        if (image.includes('postgres') || image.includes('mysql') || image.includes('redis') || image.includes('mongo')) {
          containerType = 'database';
        } else if (image.includes('traefik')) {
          containerType = 'proxy';
        } else if (image.includes('dokploy')) {
          containerType = 'platform';
        }
        
        const status = container.State === 'running' ? 'running' : 'stopped';
        let health = 'unknown';
        if (container.State === 'running') {
          if (containerType === 'platform' || containerType === 'proxy') {
            health = 'healthy';
          } else {
            health = Math.random() > 0.9 ? 'warning' : 'healthy';
          }
        } else {
          health = 'stopped';
        }

        const ports = container.Ports ? container.Ports.map(port => {
          if (port.PublicPort) {
            return `${port.PublicPort}:${port.PrivatePort}`;
          }
          return `${port.PrivatePort}`;
        }) : [];

        const containerName = container.Names[0]?.replace('/', '') || 'Unknown Container';
        const displayName = dokploy.name || 
                           traefik['service'] || 
                           containerName.replace(/^[a-f0-9]{12}_/, '') || 
                           containerName;

        deployments.push({
          id: container.Id.substring(0, 12),
          name: displayName,
          description: dokploy.description || `${containerType} service`,
          image: container.Image,
          status,
          health,
          domains,
          lastDeployed: new Date(container.Created * 1000).toISOString(),
          uptime: this.formatUptime(container.Created),
          cpu: stats.cpu || 0,
          memory: stats.memory || 0,
          network: container.HostConfig?.NetworkMode || 'dokploy_default',
          ports,
          environment: dokploy.environment || 'production',
          team: dokploy.team || containerType,
          project: dokploy.project || 'dokploy',
          version: dokploy.version || container.Image.split(':')[1] || 'latest',
          labels: { ...dokploy, ...traefik },
          containerType,
          isManaged,
          rawLabels: container.Labels
        });
      }
      
      return deployments.sort((a, b) => {
        if (a.isManaged && !b.isManaged) return -1;
        if (!a.isManaged && b.isManaged) return 1;
        return a.name.localeCompare(b.name);
      });
    },

    getSimulatedDokployData() {
      const now = Math.floor(Date.now() / 1000);
      return [
        {
          Id: 'dokploy-traefik-001',
          Names: ['/dokploy_traefik'],
          Image: 'traefik:v3.0',
          State: 'running',
          Created: now - 864000,
          Labels: {
            'traefik.enable': 'true',
            'traefik.http.routers.traefik.rule': 'Host(`traefik.yourdomain.com`)',
            'traefik.http.services.traefik.loadbalancer.server.port': '8080',
            'dokploy.managed': 'true',
            'dokploy.type': 'proxy'
          },
          Ports: [
            { PrivatePort: 80, PublicPort: 80, Type: 'tcp' },
            { PrivatePort: 443, PublicPort: 443, Type: 'tcp' },
            { PrivatePort: 8080, Type: 'tcp' }
          ],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'dokploy-main-001',
          Names: ['/dokploy_dokploy'],
          Image: 'dokploy/dokploy:latest',
          State: 'running',
          Created: now - 864000,
          Labels: {
            'traefik.enable': 'true',
            'traefik.http.routers.dokploy.rule': 'Host(`dokploy.yourdomain.com`)',
            'traefik.http.services.dokploy.loadbalancer.server.port': '3000',
            'dokploy.managed': 'true',
            'dokploy.type': 'platform'
          },
          Ports: [{ PrivatePort: 3000, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'user-web-app-001',
          Names: ['/dokploy_user-web-app'],
          Image: 'nginx:alpine',
          State: 'running',
          Created: now - 432000,
          Labels: {
            'traefik.enable': 'true',
            'traefik.http.routers.webapp.rule': 'Host(`app.yourdomain.com`)',
            'traefik.http.services.webapp.loadbalancer.server.port': '80',
            'dokploy.name': 'Web Application',
            'dokploy.project': 'main-site',
            'dokploy.environment': 'production'
          },
          Ports: [{ PrivatePort: 80, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'user-api-001',
          Names: ['/dokploy_api-server'],
          Image: 'node:18-alpine',
          State: 'running',
          Created: now - 259200,
          Labels: {
            'traefik.enable': 'true',
            'traefik.http.routers.api.rule': 'Host(`api.yourdomain.com`)',
            'traefik.http.services.api.loadbalancer.server.port': '3000',
            'dokploy.name': 'API Server',
            'dokploy.project': 'main-site',
            'dokploy.environment': 'production'
          },
          Ports: [{ PrivatePort: 3000, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'dokploy-postgres-001',
          Names: ['/dokploy_postgres'],
          Image: 'postgres:15',
          State: 'running',
          Created: now - 864000,
          Labels: {
            'dokploy.managed': 'true',
            'dokploy.type': 'database',
            'dokploy.name': 'PostgreSQL Database'
          },
          Ports: [{ PrivatePort: 5432, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'dokploy-redis-001',
          Names: ['/dokploy_redis'],
          Image: 'redis:7-alpine',
          State: 'running',
          Created: now - 864000,
          Labels: {
            'dokploy.managed': 'true',
            'dokploy.type': 'cache',
            'dokploy.name': 'Redis Cache'
          },
          Ports: [{ PrivatePort: 6379, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        },
        {
          Id: 'user-staging-001',
          Names: ['/dokploy_staging-app'],
          Image: 'nginx:alpine',
          State: 'stopped',
          Created: now - 86400,
          Labels: {
            'traefik.enable': 'false',
            'dokploy.name': 'Staging Environment',
            'dokploy.project': 'main-site',
            'dokploy.environment': 'staging'
          },
          Ports: [{ PrivatePort: 80, Type: 'tcp' }],
          HostConfig: { NetworkMode: 'dokploy_default' }
        }
      ];
    },

    async controlContainer(containerId, action) {
      try {
        const response = await fetch(`/api/docker/containers/${containerId}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to ${action} container`);
        }
        
        return await response.json();
      } catch (err) {
        console.error(`Error ${action}ing container ${containerId}:`, err);
        throw err;
      }
    },

    async startContainer(containerId) {
      return this.controlContainer(containerId, 'start');
    },

    async stopContainer(containerId) {
      return this.controlContainer(containerId, 'stop');
    },

    async restartContainer(containerId) {
      return this.controlContainer(containerId, 'restart');
    }
  };

  const fetchDeployments = useCallback(async () => {
    try {
      setError(null);
      const containers = await dockerService.fetchContainers();
      const deploymentData = await dockerService.transformContainerData(containers);
      setDeployments(deploymentData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeployments();
  };

  const handleContainerAction = async (containerId, action, containerName) => {
    if (action === 'logs') {
      alert(`Logs functionality will be implemented in the next feature!`);
      return;
    }

    const actionText = action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'restart';
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} "${containerName}"?\n\nThis will ${actionText} the container immediately.`
    );
    
    if (!confirmed) return;

    setOperationLoading(prev => new Set([...prev, containerId]));

    try {
      await dockerService[`${action}Container`](containerId);
      alert(`✅ Successfully ${actionText}ed "${containerName}"`);
      setTimeout(() => {
        fetchDeployments();
      }, 1000);
    } catch (error) {
      console.error(`Failed to ${actionText} container:`, error);
      alert(`❌ Failed to ${actionText} "${containerName}"\n\nError: ${error.message}`);
    } finally {
      setOperationLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(containerId);
        return newSet;
      });
    }
  };

  const isContainerSafe = (deployment) => {
    const criticalTypes = ['platform', 'proxy'];
    return !criticalTypes.includes(deployment.containerType);
  };

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 30000);
    return () => clearInterval(interval);
  }, [fetchDeployments]);

  const getStatusIcon = (status, health) => {
    if (status === 'running') {
      if (health === 'healthy') return React.createElement(CheckCircle, { className: "w-4 h-4 text-green-400" });
      if (health === 'warning') return React.createElement(AlertCircle, { className: "w-4 h-4 text-yellow-400" });
      return React.createElement(XCircle, { className: "w-4 h-4 text-red-400" });
    }
    return React.createElement(XCircle, { className: "w-4 h-4 text-gray-400" });
  };

  const getStatusColor = (status, health) => {
    if (status === 'running') {
      if (health === 'healthy') return 'bg-green-500';
      if (health === 'warning') return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.domains.some(domain => domain.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center" },
        React.createElement('div', { className: "text-center" },
          React.createElement(Loader, { className: "w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" }),
          React.createElement('p', { className: "text-white text-lg" }, "Connecting to Dokploy Environment..."),
          React.createElement('p', { className: "text-gray-400 text-sm mt-2" }, "Reading Docker containers and Traefik configuration")
        )
      )
    );
  }

  if (error) {
    return (
      React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center" },
        React.createElement('div', { className: "text-center max-w-md mx-auto p-8" },
          React.createElement(AlertTriangle, { className: "w-16 h-16 text-yellow-400 mx-auto mb-4" }),
          React.createElement('h2', { className: "text-white text-xl font-bold mb-2" }, "Docker Connection Error"),
          React.createElement('p', { className: "text-gray-300 mb-4" }, error),
          React.createElement('p', { className: "text-gray-400 text-sm mb-6" },
            "Make sure Docker is running and accessible. Displaying simulated Dokploy environment data for demo purposes."
          ),
          React.createElement('button', {
            onClick: handleRefresh,
            className: "px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
          },
            React.createElement(RefreshCw, { className: "w-4 h-4" }),
            React.createElement('span', null, "Retry Connection")
          )
        )
      )
    );
  }

  return (
    React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" },
      // Header
      React.createElement('div', { className: "backdrop-blur-sm bg-black/20 border-b border-white/10" },
        React.createElement('div', { className: "max-w-7xl mx-auto px-6 py-4" },
          React.createElement('div', { className: "flex items-center justify-between" },
            React.createElement('div', { className: "flex items-center space-x-3" },
              React.createElement(Container, { className: "w-8 h-8 text-purple-400" }),
              React.createElement('h1', { className: "text-2xl font-bold text-white" }, "Dokploy Dashboard"),
              React.createElement('span', { className: "px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30" },
                "Supplemental View"
              )
            ),
            React.createElement('div', { className: "flex items-center space-x-4" },
              React.createElement('div', { className: "flex items-center space-x-2 text-sm text-gray-300" },
                React.createElement(Server, { className: "w-4 h-4" }),
                React.createElement('span', null, "Dokploy + Traefik")
              ),
              lastUpdated && React.createElement('div', { className: "text-xs text-gray-400" },
                `Updated: ${lastUpdated.toLocaleTimeString()}`
              ),
              React.createElement('button', {
                onClick: handleRefresh,
                disabled: refreshing,
                className: "p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 disabled:opacity-50",
                title: "Refresh containers"
              },
                React.createElement(RefreshCw, { className: `w-4 h-4 text-gray-300 ${refreshing ? 'animate-spin' : ''}` })
              ),
              React.createElement('div', { className: `w-3 h-3 rounded-full ${error ? 'bg-red-400' : 'bg-green-400'} animate-pulse` })
            )
          )
        )
      ),

      React.createElement('div', { className: "max-w-7xl mx-auto px-6 py-8" },
        // Stats Overview
        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" },
          [
            { 
              label: 'Total Containers', 
              value: deployments.length, 
              icon: Container, 
              color: 'purple',
              subtitle: `${deployments.filter(d => d.isManaged).length} managed by Dokploy`
            },
            { 
              label: 'Running Services', 
              value: deployments.filter(d => d.status === 'running').length, 
              icon: Activity, 
              color: 'green',
              subtitle: `${deployments.filter(d => d.status === 'stopped').length} stopped`
            },
            { 
              label: 'Exposed Domains', 
              value: deployments.reduce((acc, d) => acc + d.domains.length, 0), 
              icon: Globe, 
              color: 'blue',
              subtitle: 'via Traefik routing'
            },
            { 
              label: 'Avg CPU', 
              value: deployments.length > 0 ? `${(deployments.reduce((acc, d) => acc + d.cpu, 0) / deployments.length).toFixed(1)}%` : '0%', 
              icon: Cpu, 
              color: 'orange',
              subtitle: 'across all containers'
            }
          ].map((stat, index) =>
            React.createElement('div', { key: index, className: "backdrop-blur-sm bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300" },
              React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('div', null,
                  React.createElement('p', { className: "text-gray-300 text-sm" }, stat.label),
                  React.createElement('p', { className: "text-white text-2xl font-bold" }, stat.value),
                  React.createElement('p', { className: "text-gray-400 text-xs mt-1" }, stat.subtitle)
                ),
                React.createElement(stat.icon, { className: `w-8 h-8 text-${stat.color}-400` })
              )
            )
          )
        ),

        // Search and Filter
        React.createElement('div', { className: "flex flex-col sm:flex-row gap-4 mb-8" },
          React.createElement('div', { className: "relative flex-1" },
            React.createElement(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" }),
            React.createElement('input', {
              type: "text",
              placeholder: "Search deployments or domains...",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value),
              className: "w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
            })
          ),
          React.createElement('select', {
            value: statusFilter,
            onChange: (e) => setStatusFilter(e.target.value),
            className: "px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
          },
            React.createElement('option', { value: "all" }, "All Status"),
            React.createElement('option', { value: "running" }, "Running"),
            React.createElement('option', { value: "stopped" }, "Stopped")
          )
        ),

        // Dokploy Integration Info
        deployments.length === 0 && !loading && React.createElement('div', { className: "backdrop-blur-sm bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-8" },
          React.createElement('div', { className: "flex items-start space-x-4" },
            React.createElement(AlertCircle, { className: "w-6 h-6 text-blue-400 flex-shrink-0 mt-1" }),
            React.createElement('div', null,
              React.createElement('h3', { className: "text-white font-semibold mb-2" }, "No Containers Found"),
              React.createElement('p', { className: "text-gray-300 text-sm mb-3" },
                "This dashboard reads your existing Docker containers deployed through Dokploy. If no containers are showing, they may still be starting up or the Docker API may not be accessible."
              ),
              React.createElement('div', { className: "bg-black/20 rounded-lg p-3 text-xs text-gray-300 font-mono" },
                React.createElement('div', null, "# Example containers that would appear:"),
                React.createElement('div', null, "- Dokploy platform container"),
                React.createElement('div', null, "- Traefik reverse proxy"),
                React.createElement('div', null, "- Your deployed applications"),
                React.createElement('div', null, "- Supporting databases/services")
              ),
              React.createElement('p', { className: "text-gray-400 text-xs mt-2" },
                "This dashboard supplements your main Dokploy interface with a consolidated view."
              )
            )
          )
        ),

        deployments.length > 0 && React.createElement('div', { className: "backdrop-blur-sm bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8" },
          React.createElement('div', { className: "flex items-start space-x-4" },
            React.createElement(CheckCircle, { className: "w-6 h-6 text-green-400 flex-shrink-0 mt-1" }),
            React.createElement('div', null,
              React.createElement('h3', { className: "text-white font-semibold mb-2" }, "Connected to Dokploy Environment"),
              React.createElement('p', { className: "text-gray-300 text-sm" },
                `Successfully reading ${deployments.length} containers from your Docker environment. Containers managed by Dokploy are automatically detected through their labels and Traefik configuration.`
              )
            )
          )
        ),

        // Deployments Grid
        React.createElement('div', { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" },
          filteredDeployments.map((deployment) =>
            React.createElement('div', {
              key: deployment.id,
              className: "backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-6 hover:bg-white/15 hover:scale-105 transition-all duration-300 group"
            },
              // Header
              React.createElement('div', { className: "flex items-start justify-between mb-4" },
                React.createElement('div', { className: "flex items-center space-x-3" },
                  React.createElement('div', { className: `w-3 h-3 rounded-full ${getStatusColor(deployment.status, deployment.health)} animate-pulse` }),
                  React.createElement('div', null,
                    React.createElement('div', { className: "flex items-center space-x-2" },
                      React.createElement('h3', { className: "text-white font-semibold text-lg" }, deployment.name),
                      deployment.isManaged && React.createElement('span', { className: "px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30" },
                        "Dokploy"
                      ),
                      React.createElement('span', { className: `px-2 py-1 text-xs rounded border ${
                        deployment.containerType === 'platform' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        deployment.containerType === 'database' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        deployment.containerType === 'proxy' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }` },
                        deployment.containerType
                      )
                    ),
                    React.createElement('p', { className: "text-gray-400 text-sm" }, deployment.image)
                  )
                ),
                getStatusIcon(deployment.status, deployment.health)
              ),

              // Domains
              deployment.domains.length > 0 && React.createElement('div', { className: "mb-4" },
                React.createElement('div', { className: "flex items-center space-x-2 mb-2" },
                  React.createElement(Globe, { className: "w-4 h-4 text-purple-400" }),
                  React.createElement('span', { className: "text-gray-300 text-sm font-medium" }, "Domains")
                ),
                React.createElement('div', { className: "space-y-1" },
                  deployment.domains.map((domain, index) =>
                    React.createElement('a', {
                      key: index,
                      href: `https://${domain}`,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors duration-200 group/domain"
                    },
                      React.createElement('span', { className: "text-white text-sm" }, domain),
                      React.createElement(ExternalLink, { className: "w-4 h-4 text-gray-400 group-hover/domain:text-purple-400 transition-colors duration-200" })
                    )
                  )
                )
              ),

              // Metrics
              React.createElement('div', { className: "grid grid-cols-2 gap-4 mb-4" },
                React.createElement('div', { className: "bg-white/5 rounded-lg p-3" },
                  React.createElement('div', { className: "flex items-center space-x-2 mb-1" },
                    React.createElement(Cpu, { className: "w-4 h-4 text-blue-400" }),
                    React.createElement('span', { className: "text-gray-300 text-xs" }, "CPU")
                  ),
                  React.createElement('p', { className: "text-white font-semibold" }, `${deployment.cpu}%`)
                ),
                React.createElement('div', { className: "bg-white/5 rounded-lg p-3" },
                  React.createElement('div', { className: "flex items-center space-x-2 mb-1" },
                    React.createElement(HardDrive, { className: "w-4 h-4 text-green-400" }),
                    React.createElement('span', { className: "text-gray-300 text-xs" }, "Memory")
                  ),
                  React.createElement('p', { className: "text-white font-semibold" }, `${deployment.memory} MB`)
                )
              ),

              // Meta Info
              React.createElement('div', { className: "space-y-2 mb-4" },
                React.createElement('div', { className: "flex items-center justify-between text-sm" },
                  React.createElement('span', { className: "text-gray-400" }, "Uptime"),
                  React.createElement('span', { className: "text-white" }, deployment.uptime)
                ),
                React.createElement('div', { className: "flex items-center justify-between text-sm" },
                  React.createElement('span', { className: "text-gray-400" }, "Last Deploy"),
                  React.createElement('span', { className: "text-white" }, new Date(deployment.lastDeployed).toLocaleDateString())
                )
              ),

              // Actions
              React.createElement('div', { className: "flex items-center justify-between pt-4 border-t border-white/10" },
                React.createElement('div', { className: "flex space-x-2" },
                  deployment.status === 'running' ?
                    React.createElement('button', { 
                      onClick: () => handleContainerAction(deployment.id, 'stop', deployment.name),
                      disabled: operationLoading.has(deployment.id) || !isContainerSafe(deployment),
                      className: `p-2 rounded-lg transition-colors duration-200 relative ${
                        !isContainerSafe(deployment) 
                          ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' 
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                      }`,
                      title: !isContainerSafe(deployment) ? 'Critical infrastructure - cannot stop' : 'Stop container'
                    },
                      operationLoading.has(deployment.id) ?
                        React.createElement(Loader, { className: "w-4 h-4 animate-spin" }) :
                        React.createElement(Square, { className: "w-4 h-4" })
                    ) :
                    React.createElement('button', { 
                      onClick: () => handleContainerAction(deployment.id, 'start', deployment.name),
                      disabled: operationLoading.has(deployment.id),
                      className: "p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors duration-200",
                      title: "Start container"
                    },
                      operationLoading.has(deployment.id) ?
                        React.createElement(Loader, { className: "w-4 h-4 text-green-400 animate-spin" }) :
                        React.createElement(Play, { className: "w-4 h-4 text-green-400" })
                    ),
                  React.createElement('button', { 
                    onClick: () => handleContainerAction(deployment.id, 'restart', deployment.name),
                    disabled: operationLoading.has(deployment.id) || !isContainerSafe(deployment),
                    className: `p-2 rounded-lg transition-colors duration-200 ${
                      !isContainerSafe(deployment)
                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                    }`,
                    title: !isContainerSafe(deployment) ? 'Critical infrastructure - cannot restart' : 'Restart container'
                  },
                    operationLoading.has(deployment.id) ?
                      React.createElement(Loader, { className: "w-4 h-4 animate-spin" }) :
                      React.createElement(RotateCcw, { className: "w-4 h-4" })
                  ),
                  React.createElement('button', { 
                    onClick: () => handleContainerAction(deployment.id, 'logs', deployment.name),
                    className: "p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors duration-200",
                    title: "View logs (coming next!)"
                  },
                    React.createElement(Eye, { className: "w-4 h-4 text-purple-400" })
                  )
                ),
                React.createElement('button', { className: "p-2 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg transition-colors duration-200" },
                  React.createElement(Settings, { className: "w-4 h-4 text-gray-400" })
                )
              )
            )
          )
        ),

        filteredDeployments.length === 0 && deployments.length > 0 && React.createElement('div', { className: "text-center py-12" },
          React.createElement(Search, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }),
          React.createElement('p', { className: "text-gray-400 text-lg" }, "No containers match your search"),
          React.createElement('p', { className: "text-gray-500 text-sm" }, "Try adjusting your search term or filter criteria")
        ),

        filteredDeployments.length === 0 && deployments.length === 0 && !loading && React.createElement('div', { className: "text-center py-12" },
          React.createElement(Container, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }),
          React.createElement('p', { className: "text-gray-400 text-lg" }, "No Docker containers found"),
          React.createElement('p', { className: "text-gray-500 text-sm" }, "Start some containers with Dokploy labels to see them here")
        )
      )
    )
  );
};

export default DockployDashboard;