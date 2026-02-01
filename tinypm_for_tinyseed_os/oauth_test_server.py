"""OAuth test server with detailed logging."""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
import os

# Load env
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if 'code' in params:
            code = params['code'][0]
            print(f'\n✅ Got authorization code: {code[:30]}...')

            # Exchange for tokens
            try:
                from oauth_manager import get_oauth_manager
                manager = get_oauth_manager()
                print('Exchanging code for tokens...')
                tokens = manager.exchange_code_for_tokens(code)

                if tokens:
                    print(f'✅ Got tokens!')
                    print(f'   Access token: {tokens.get("access_token", "")[:30]}...')
                    # Save tokens
                    success = manager.save_tokens_to_supabase('default', tokens)
                    if success:
                        print('✅ Tokens saved to Supabase!')
                    else:
                        # Try local save
                        manager._save_tokens_local('default', tokens)
                        print('✅ Tokens saved locally!')
                else:
                    print('❌ No tokens received')
            except Exception as e:
                print(f'❌ Error: {e}')
                import traceback
                traceback.print_exc()

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>Success! Close this window.</h1>')
        else:
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>No code received</h1>')

        def shutdown():
            self.server.shutdown()
        import threading
        threading.Thread(target=shutdown).start()

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    print('Starting callback server on http://localhost:8000')
    print('Complete authorization in browser...')
    server = HTTPServer(('localhost', 8000), Handler)
    server.serve_forever()
