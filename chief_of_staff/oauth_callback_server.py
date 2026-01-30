"""
Chief of Staff OAuth Callback Server
====================================
Local callback server to handle OAuth redirect on port 8001.

Usage:
    python oauth_callback_server.py

This starts a local server that:
1. Listens for OAuth callback on http://localhost:8001/auth/callback
2. Captures the authorization code
3. Exchanges it for tokens automatically
4. Saves tokens for Chief of Staff use

Created: 2026-01-30
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import webbrowser
import sys
import os
import threading

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """Handle OAuth callback requests."""

    def do_GET(self):
        """Handle GET request with authorization code."""
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if 'code' in params:
            code = params['code'][0]
            state = params.get('state', [''])[0]

            print(f"\n Authorization code received!")
            print(f"State: {state}")

            # Try auto-exchange
            success = False
            try:
                from oauth_manager import get_oauth_manager
                manager = get_oauth_manager()
                tokens = manager.exchange_code_for_tokens(code)
                if tokens:
                    manager.save_tokens('default', tokens)
                    success = True
                    print("\n Tokens saved! Chief of Staff now has full Google API access.")
                    print("\nGranted scopes:")
                    for scope in tokens.get('scope', '').split(' '):
                        if 'calendar' in scope:
                            print(f"   Calendar: {scope}")
                        elif 'gmail' in scope:
                            print(f"   Gmail: {scope}")
                        elif 'sheets' in scope or 'spreadsheet' in scope:
                            print(f"   Sheets: {scope}")
                        elif 'drive' in scope:
                            print(f"   Drive: {scope}")
            except Exception as e:
                print(f"\n Auto-exchange failed: {e}")
                print(f"\nRun manually:")
                print(f'python oauth_manager.py exchange "{code}"')

            # Send success response
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()

            if success:
                html = '''
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                padding: 60px;
                                text-align: center;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                min-height: 100vh;
                                margin: 0;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .card {
                                background: white;
                                border-radius: 16px;
                                padding: 48px;
                                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                max-width: 500px;
                            }
                            h1 {
                                color: #1a1a2e;
                                margin-bottom: 16px;
                            }
                            p {
                                color: #666;
                                font-size: 18px;
                            }
                            .success-icon {
                                font-size: 64px;
                                margin-bottom: 20px;
                            }
                            .capabilities {
                                display: flex;
                                justify-content: center;
                                gap: 16px;
                                margin-top: 24px;
                                flex-wrap: wrap;
                            }
                            .cap {
                                background: #f0f4ff;
                                padding: 8px 16px;
                                border-radius: 20px;
                                font-size: 14px;
                                color: #4a5568;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="success-icon">&#9989;</div>
                            <h1>Chief of Staff Connected!</h1>
                            <p>Full Google API access granted. You can close this window.</p>
                            <div class="capabilities">
                                <span class="cap">&#128197; Calendar</span>
                                <span class="cap">&#9993; Gmail</span>
                                <span class="cap">&#128196; Sheets</span>
                                <span class="cap">&#128193; Drive</span>
                            </div>
                        </div>
                    </body>
                    </html>
                '''
            else:
                html = '''
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                padding: 60px;
                                text-align: center;
                                background: #f5f5f5;
                            }
                            .card {
                                background: white;
                                border-radius: 16px;
                                padding: 48px;
                                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                                max-width: 500px;
                                margin: 0 auto;
                            }
                            h1 { color: #e74c3c; }
                            p { color: #666; }
                            code {
                                background: #f5f5f5;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 14px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Manual Step Required</h1>
                            <p>Authorization received but auto-save failed.</p>
                            <p>Check the terminal for the exchange command.</p>
                        </div>
                    </body>
                    </html>
                '''
            self.wfile.write(html.encode())

        elif 'error' in params:
            error = params['error'][0]
            description = params.get('error_description', ['No description'])[0]
            print(f"\n Authorization error: {error}")
            print(f"Description: {description}")

            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(f'''
                <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #e74c3c;">Authorization Failed</h1>
                <p><strong>Error:</strong> {error}</p>
                <p>{description}</p>
                </body></html>
            '''.encode())

        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'''
                <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Error: No authorization code received</h1>
                </body></html>
            ''')

        # Shutdown server after handling
        def shutdown():
            self.server.shutdown()
        threading.Thread(target=shutdown).start()

    def log_message(self, format, *args):
        """Suppress default logging."""
        pass


def run_oauth_flow():
    """
    Run the complete OAuth flow:
    1. Start callback server
    2. Open browser with authorization URL
    3. Wait for callback
    4. Return tokens

    Returns:
        Token dictionary if successful, None otherwise
    """
    from oauth_manager import get_oauth_manager

    oauth = get_oauth_manager()
    if not oauth.is_configured():
        print("ERROR: OAuth not configured.")
        print("Set COS_GOOGLE_CLIENT_ID and COS_GOOGLE_CLIENT_SECRET first.")
        return None

    port = 8001
    server = HTTPServer(('localhost', port), OAuthCallbackHandler)

    # Get authorization URL
    auth_url = oauth.get_authorization_url()

    print("\n" + "=" * 60)
    print("CHIEF OF STAFF OAUTH AUTHORIZATION")
    print("=" * 60)
    print(f"\nStarting callback server on http://localhost:{port}")
    print("\nOpening browser for authorization...")
    print("(If browser doesn't open, copy this URL manually)")
    print(f"\n{auth_url}\n")

    # Open browser
    webbrowser.open(auth_url)

    print("Waiting for authorization callback...")
    print("(Press Ctrl+C to cancel)\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAuthorization cancelled.")
        return None

    # Return tokens if they were saved
    return oauth._load_tokens('default')


if __name__ == '__main__':
    # If run directly, start the OAuth flow
    if len(sys.argv) > 1 and sys.argv[1] == 'server':
        # Just start server without browser
        port = 8001
        server = HTTPServer(('localhost', port), OAuthCallbackHandler)
        print(f"Starting OAuth callback server on http://localhost:{port}/auth/callback")
        print("Waiting for authorization callback...")
        server.serve_forever()
    else:
        # Full OAuth flow
        tokens = run_oauth_flow()
        if tokens:
            print("\n" + "=" * 60)
            print("SUCCESS!")
            print("=" * 60)
            print("\nChief of Staff is now connected to:")
            print("  - Google Calendar")
            print("  - Gmail")
            print("  - Google Sheets")
            print("  - Google Drive")
            print("\nYou can now use the Chief of Staff command center!")
