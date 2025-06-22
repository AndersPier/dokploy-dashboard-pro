import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(params.id);
    await container.stop({ t: 10 }); // 10 second timeout
    
    return NextResponse.json({ 
      success: true, 
      message: 'Container stopped successfully' 
    });
  } catch (error) {
    console.error('Failed to stop container:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop container' },
      { status: 500 }
    );
  }
}