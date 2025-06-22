import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(params.id);
    await container.restart({ t: 10 }); // 10 second timeout
    
    return NextResponse.json({ 
      success: true, 
      message: 'Container restarted successfully' 
    });
  } catch (error) {
    console.error('Failed to restart container:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restart container' },
      { status: 500 }
    );
  }
}