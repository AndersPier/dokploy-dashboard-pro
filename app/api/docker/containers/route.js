import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const containers = await docker.listContainers({ all: true });
    return NextResponse.json(containers);
  } catch (error) {
    console.error('Docker API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch containers: ' + error.message },
      { status: 500 }
    );
  }
}