import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_PROXY_URL || 'http://localhost:3001';

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const searchParams = request.nextUrl.search;
  const url = `${BACKEND_URL}/${path.join('/')}${searchParams ? '?' + searchParams : ''}`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      headers[key] = value;
    }
  });

  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    body = await request.text();
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Proxy request failed' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}
