import { APP_NAME } from '@/lib/constants'

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline - ${APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      text-align: center;
      max-width: 420px;
    }
    .icon {
      margin-bottom: 24px;
      display: flex;
      justify-content: center;
    }
    .icon svg {
      width: 64px;
      height: 64px;
      color: #a3a3a3;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #f5f5f5;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #a3a3a3;
      margin-bottom: 32px;
    }
    .retry-btn {
      display: inline-block;
      padding: 12px 32px;
      background-color: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .retry-btn:hover { background-color: #2563eb; }
    .retry-btn:active { background-color: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg></div>
    <h1>You're offline</h1>
    <p>Check your internet connection and try again.</p>
    <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
