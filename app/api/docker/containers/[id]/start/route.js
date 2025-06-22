import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const container = docker.getContainer(params.id);
    await container.start();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Container started successfully' 
    });
  } catch (error) {
    console.error('Failed to start container:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start container' },
      { status: 500 }
    );
  }
}