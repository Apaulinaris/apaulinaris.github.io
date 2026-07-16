#!/usr/bin/env python3
"""Local static server for development that disables caching entirely.
Plain `python3 -m http.server` lets browsers cache CSS/JS/HTML aggressively
(no explicit Cache-Control header), which makes edits look like they "aren't
arriving" even though the files on disk and the server response are correct.
This wrapper forces every response to be revalidated every time."""
import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    http.server.test(HandlerClass=NoCacheHandler, port=4173)
