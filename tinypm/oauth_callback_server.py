"""Simple OAuth callback server for TinyPM."""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import webbrowser
import sys
import os

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        if 'code' in params:
            code = params['code'][0]
            print(f"\n✅ Authorization code received!")
            print(f"\nRun this command to complete authorization:")
            print(f'python3 oauth_manager.py exchange "{code}"')
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'''
                <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>TinyPM Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                </body></html>
            ''')
            
            # Auto-exchange the code
            try:
                from oauth_manager import get_oauth_manager
                manager = get_oauth_manager()
                tokens = manager.exchange_code_for_tokens(code)
                if tokens:
                    # Save with default user
                    manager.save_tokens_to_supabase('default', tokens)
                    print("\n✅ Tokens saved! TinyPM is now connected to your calendar and email.")
            except Exception as e:
                print(f"\n⚠️  Auto-exchange failed: {e}")
                print("Run the exchange command manually.")
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>Error: No authorization code received</h1></body></html>')
        
        # Shutdown after handling
        def shutdown():
            self.server.shutdown()
        import threading
        threading.Thread(target=shutdown).start()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('localhost', port), OAuthCallbackHandler)
    print(f"Starting OAuth callback server on http://localhost:{port}")
    print("Waiting for authorization...")
    server.serve_forever()
