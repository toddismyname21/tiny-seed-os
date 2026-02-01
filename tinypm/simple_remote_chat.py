#!/usr/bin/env python3
"""
Simple HTTP-based Claude Code Chat
Works through ANY tunnel - no WebSocket needed!
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import threading
import queue
import os
import time
from urllib.parse import parse_qs, urlparse

# Shared state
messages = []
output_queue = queue.Queue()
claude_process = None
TOKEN = "tinypm2026"  # Simple token

class ChatHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logging
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/':
            # Serve the chat UI
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(CHAT_HTML.encode())
        
        elif parsed.path == '/messages':
            # Return messages (polling endpoint)
            params = parse_qs(parsed.query)
            since = int(params.get('since', [0])[0])
            
            # Drain output queue
            while not output_queue.empty():
                try:
                    msg = output_queue.get_nowait()
                    messages.append({'type': 'output', 'content': msg, 'time': time.time()})
                except:
                    break
            
            # Get messages since timestamp
            new_msgs = [m for m in messages if m['time'] > since]
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'messages': new_msgs, 'time': time.time()}).encode())
        
        elif parsed.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'claude_running': claude_process is not None}).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        global claude_process
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode()
        
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}
        
        if self.path == '/send':
            message = data.get('message', '')
            token = data.get('token', '')
            
            if token != TOKEN:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid token'}).encode())
                return
            
            if message and claude_process:
                try:
                    claude_process.stdin.write(message + '\n')
                    claude_process.stdin.flush()
                    messages.append({'type': 'input', 'content': message, 'time': time.time()})
                except Exception as e:
                    messages.append({'type': 'error', 'content': str(e), 'time': time.time()})
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
        
        elif self.path == '/start':
            token = data.get('token', '')
            if token != TOKEN:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid token'}).encode())
                return
            
            if claude_process is None:
                start_claude()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
        
        else:
            self.send_response(404)
            self.end_headers()

def start_claude():
    global claude_process
    
    def read_output():
        while True:
            if claude_process and claude_process.stdout:
                line = claude_process.stdout.readline()
                if line:
                    output_queue.put(line)
                elif claude_process.poll() is not None:
                    break
            else:
                time.sleep(0.1)
    
    claude_process = subprocess.Popen(
        ['claude'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd='/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm'
    )
    
    threading.Thread(target=read_output, daemon=True).start()
    messages.append({'type': 'system', 'content': 'Claude Code started!', 'time': time.time()})

CHAT_HTML = '''<!DOCTYPE html>
<html>
<head>
    <title>TinyPM Remote Chat</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #1a1a2e; color: #fff; height: 100vh; display: flex; flex-direction: column; }
        .header { padding: 15px; background: #16213e; border-bottom: 1px solid #333; }
        .header h1 { font-size: 18px; }
        .status { font-size: 12px; color: #4ade80; margin-top: 5px; }
        .chat { flex: 1; overflow-y: auto; padding: 15px; }
        .message { margin-bottom: 10px; padding: 10px; border-radius: 8px; max-width: 90%; }
        .message.input { background: #4ade80; color: #000; margin-left: auto; }
        .message.output { background: #333; white-space: pre-wrap; font-family: monospace; font-size: 13px; }
        .message.system { background: #fbbf24; color: #000; text-align: center; }
        .message.error { background: #f87171; }
        .input-area { padding: 15px; background: #16213e; border-top: 1px solid #333; }
        .token-input { display: flex; gap: 10px; margin-bottom: 10px; }
        .token-input input { flex: 1; padding: 10px; border: 1px solid #333; border-radius: 8px; background: #1a1a2e; color: #fff; }
        .token-input button { padding: 10px 20px; background: #4ade80; color: #000; border: none; border-radius: 8px; font-weight: bold; }
        .message-input { display: flex; gap: 10px; }
        .message-input input { flex: 1; padding: 12px; border: 1px solid #333; border-radius: 8px; background: #1a1a2e; color: #fff; font-size: 16px; }
        .message-input button { padding: 12px 24px; background: #4ade80; color: #000; border: none; border-radius: 8px; font-weight: bold; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TinyPM Remote Chat</h1>
        <div class="status" id="status">Connecting...</div>
    </div>
    <div class="chat" id="chat"></div>
    <div class="input-area">
        <div class="token-input" id="token-area">
            <input type="password" id="token" placeholder="Enter token: tinypm2026" value="">
            <button onclick="connect()">Connect</button>
        </div>
        <div class="message-input hidden" id="message-area">
            <input type="text" id="msg" placeholder="Type a message..." onkeypress="if(event.key===\'Enter\')send()">
            <button onclick="send()">Send</button>
        </div>
    </div>
    <script>
        let token = '';
        let lastTime = 0;
        let connected = false;
        
        function connect() {
            token = document.getElementById('token').value || 'tinypm2026';
            fetch('/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({token})
            }).then(r => r.json()).then(d => {
                if (d.error) { alert(d.error); return; }
                connected = true;
                document.getElementById('token-area').classList.add('hidden');
                document.getElementById('message-area').classList.remove('hidden');
                document.getElementById('status').textContent = 'Connected to Claude Code';
                poll();
            }).catch(e => alert('Connection failed: ' + e));
        }
        
        function send() {
            const msg = document.getElementById('msg').value;
            if (!msg) return;
            document.getElementById('msg').value = '';
            fetch('/send', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message: msg, token})
            });
        }
        
        function poll() {
            if (!connected) return;
            fetch('/messages?since=' + lastTime)
                .then(r => r.json())
                .then(d => {
                    lastTime = d.time;
                    d.messages.forEach(m => {
                        const div = document.createElement('div');
                        div.className = 'message ' + m.type;
                        div.textContent = m.content;
                        document.getElementById('chat').appendChild(div);
                    });
                    if (d.messages.length) {
                        document.getElementById('chat').scrollTop = 999999;
                    }
                    setTimeout(poll, 500);
                })
                .catch(() => setTimeout(poll, 2000));
        }
    </script>
</body>
</html>'''

if __name__ == '__main__':
    print("Starting Simple Remote Chat on port 8888...")
    print("Token: tinypm2026")
    server = HTTPServer(('0.0.0.0', 8888), ChatHandler)
    print("Server ready!")
    server.serve_forever()
