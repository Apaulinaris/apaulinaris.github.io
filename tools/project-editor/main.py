#!/usr/bin/env python3
"""Local GUI editor for this site's projects/*.js files.

Runs entirely against THIS portfolio's own projects/ folder and index.html
(paths are resolved relative to this file, two directories up — see
SITE_ROOT below) — there's no "open a file" step, the sidebar always
shows whatever is currently in projects/.
"""
import http.server
import json
import re
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, str(Path(__file__).parent))
from js_project import parse_project_js, serialize_project_js, default_project, ParseError

PORT = 3001
HERE = Path(__file__).parent
STATIC = HERE / 'public'
SITE_ROOT = HERE.parent.parent  # portfolio-website-v1/
PROJECTS_DIR = SITE_ROOT / 'projects'
INDEX_HTML = SITE_ROOT / 'index.html'

CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
}

MAIN_SCRIPT_TAG = '<script src="js/main.js"></script>'


def _project_files():
    return sorted(
        f for f in PROJECTS_DIR.glob('*.js')
        if not f.name.startswith('_')
    )


def _script_tag(stem):
    return f'<script src="projects/{stem}.js"></script>'


def _add_script_tag(stem):
    text = INDEX_HTML.read_text(encoding='utf-8')
    tag = _script_tag(stem)
    if tag in text:
        return
    idx = text.index(MAIN_SCRIPT_TAG)
    text = text[:idx] + tag + '\n' + text[idx:]
    INDEX_HTML.write_text(text, encoding='utf-8')


def _remove_script_tag(stem):
    text = INDEX_HTML.read_text(encoding='utf-8')
    pattern = re.compile(r'^\s*' + re.escape(_script_tag(stem)) + r'\s*\n?', re.MULTILINE)
    text = pattern.sub('', text)
    INDEX_HTML.write_text(text, encoding='utf-8')


class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if parsed.path == '/api/projects':
            self._list_projects()
        elif parsed.path == '/api/project':
            self._get_project(qs.get('file', [''])[0])
        else:
            self._static(parsed.path)

    def do_POST(self):
        if self.path != '/api/project':
            self.send_response(404); self.end_headers(); return
        length = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(length).decode())
            filename = body['file']
            data = body['data']
            if not re.fullmatch(r'[a-z0-9-]+\.js', filename):
                raise ValueError(f'Invalid project filename: {filename}')
            path = PROJECTS_DIR / filename
            is_new = not path.exists()
            path.write_text(serialize_project_js(data), encoding='utf-8')
            if is_new:
                _add_script_tag(path.stem)
            self._json({'ok': True, 'file': filename})
        except Exception as e:
            self._json({'error': str(e)}, 400)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/project':
            self.send_response(404); self.end_headers(); return
        qs = parse_qs(parsed.query)
        filename = qs.get('file', [''])[0]
        try:
            if not re.fullmatch(r'[a-z0-9-]+\.js', filename):
                raise ValueError(f'Invalid project filename: {filename}')
            path = PROJECTS_DIR / filename
            if path.exists():
                path.unlink()
            _remove_script_tag(path.stem)
            self._json({'ok': True})
        except Exception as e:
            self._json({'error': str(e)}, 400)

    def _list_projects(self):
        out = []
        for f in _project_files():
            try:
                data = parse_project_js(f.read_text(encoding='utf-8'))
                out.append({
                    'file': f.name,
                    'id': data.get('id', ''),
                    'title': data.get('title', f.name),
                    'featured': bool(data.get('featured')),
                })
            except ParseError as e:
                out.append({'file': f.name, 'id': '', 'title': f.name, 'featured': False, 'error': str(e)})
        self._json({'projects': out})

    def _get_project(self, filename):
        if not filename:
            self._json({'error': 'No file provided'}, 400); return
        path = PROJECTS_DIR / filename
        try:
            data = parse_project_js(path.read_text(encoding='utf-8'))
            self._json({'file': filename, 'data': data})
        except (ParseError, OSError) as e:
            self._json({'error': str(e)}, 400)

    def _static(self, path):
        if path in ('/', ''):
            path = '/index.html'
        f = STATIC / path.lstrip('/')
        try:
            content = f.read_bytes()
            ct = CONTENT_TYPES.get(f.suffix, 'application/octet-stream')
            self.send_response(200)
            self.send_header('Content-Type', ct)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except (FileNotFoundError, IsADirectoryError):
            self.send_response(404); self.end_headers()

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # suppress request logs


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == '__main__':
    if not PROJECTS_DIR.is_dir() or not INDEX_HTML.is_file():
        print(f'Could not find projects/ or index.html relative to this tool.')
        print(f'Expected site root at: {SITE_ROOT}')
        sys.exit(1)

    server = _Server(('127.0.0.1', PORT), Handler)
    print(f'Project Editor  →  http://localhost:{PORT}')
    print(f'Editing:  {PROJECTS_DIR}')
    print('Stop with Ctrl-C\n')

    threading.Timer(0.4, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Stopped.')
