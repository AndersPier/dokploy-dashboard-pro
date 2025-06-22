import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(params.id);
    const stats = await container.stats({ stream: false });
    
    // Calculate CPU and memory percentages
    const cpuPercent = calculateCPUPercent(stats);
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 0;
    
    return NextResponse.json({
      cpu: cpuPercent,
      memory: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
      memoryLimit: Math.round(memoryLimit / 1024 / 1024)
    });
  } catch (error) {
    console.error('Failed to get container stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get container stats' },
      { status: 500 }
    );
  }
}

function calculateCPUPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                   (stats.precpu_stats?.cpu_usage?.total_usage || 0);
  const systemDelta = stats.cpu_stats.system_cpu_usage - 
                      (stats.precpu_stats?.system_cpu_usage || 0);
  
  if (systemDelta > 0 && cpuDelta > 0) {
    const cpuPercent = (cpuDelta / systemDelta) * 
                       (stats.cpu_stats.online_cpus || 1) * 100;
    return Math.round(cpuPercent * 100) / 100;
  }
  return 0;
}