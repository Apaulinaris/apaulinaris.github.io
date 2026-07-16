"""Converts between projects/*.js files (window.PORTFOLIO_PROJECTS.push({...}))
and plain Python dicts, so the editor can work with normal form data without
the site's data format having to become JSON.

This is deliberately NOT a general JavaScript parser — it only understands
the one shape our project files actually use: a single `.push({...})` call
containing strings, booleans, null, arrays, and nested objects. That
narrower scope is what makes a small hand-written converter safe here.
"""
import ast
import re

PUSH_RE = re.compile(r'PORTFOLIO_PROJECTS\.push\(\s*(\{.*\})\s*\)\s*;?\s*$', re.DOTALL)

# Canonical field order for output — matches the style already used across
# the hand-written project files.
FIELD_ORDER = [
    'id', 'featured', 'titlePrefix', 'title',
    'titleFont', 'titleItalic', 'titleWeight', 'titleColor', 'titleSize',
    'detail', 'archiveBlurb', 'tags', 'previewImage', 'detailLayout',
]

BLOCK_FIELD_ORDER = {
    'image': ['type', 'src', 'width', 'align', 'valign', 'fit', 'caption'],
    'imageGrid': ['type', 'columns', 'images'],
    'text': ['type', 'content', 'width', 'align', 'valign'],
    'spacer': ['type', 'size'],
    'row': ['type', 'blocks'],
}


class ParseError(ValueError):
    pass


# ── PARSE: file text -> Python dict ─────────────────────────────────────

def _split_string_segments(text):
    """Splits text into (is_string, chunk) pieces, tracking JS single/double
    quoted string state (with backslash escaping) so later transforms can
    skip string contents entirely."""
    segments = []
    buf = []
    quote = None
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == '\\' and i + 1 < n:
                buf.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                segments.append((True, ''.join(buf)))
                buf = []
                quote = None
            i += 1
            continue
        if ch in ('"', "'"):
            if buf:
                segments.append((False, ''.join(buf)))
                buf = []
            quote = ch
            buf.append(ch)
            i += 1
            continue
        buf.append(ch)
        i += 1
    if buf:
        segments.append((quote is not None, ''.join(buf)))
    return segments


def _clean_code_segment(seg):
    # Strip `// comment` to end of line (safe here — we're only ever called
    # on the non-string segments, so this can never eat part of a string).
    seg = '\n'.join(line.split('//', 1)[0] for line in seg.split('\n'))
    # Bare identifier keys -> quoted, e.g. `{ title:` -> `{ "title":`.
    seg = re.sub(r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)', r'\1"\2"\3', seg)
    # JS literals -> Python literals.
    seg = re.sub(r'\btrue\b', 'True', seg)
    seg = re.sub(r'\bfalse\b', 'False', seg)
    seg = re.sub(r'\bnull\b', 'None', seg)
    # Trailing commas aren't valid Python literal syntax.
    seg = re.sub(r',(\s*[}\]])', r'\1', seg)
    return seg


def _clean_string_segment(seg):
    # A raw (unescaped) newline inside a quoted string is invalid JS *and*
    # invalid Python syntax — but a textarea can easily produce one (the
    # user just pressed Enter). Escaping it here makes parsing tolerant of
    # already-broken files too, not just a save-time concern.
    return seg.replace('\r\n', '\\n').replace('\n', '\\n').replace('\r', '\\n')


def parse_project_js(text):
    match = PUSH_RE.search(text)
    if not match:
        raise ParseError('Could not find window.PORTFOLIO_PROJECTS.push({...}) in file')
    obj_text = match.group(1)
    segments = _split_string_segments(obj_text)
    cleaned = [_clean_string_segment(chunk) if is_str else _clean_code_segment(chunk) for is_str, chunk in segments]
    py_src = ''.join(cleaned)
    try:
        data = ast.literal_eval(py_src)
    except (SyntaxError, ValueError) as e:
        raise ParseError(f'Could not parse project object: {e}') from e
    if not isinstance(data, dict):
        raise ParseError('Parsed value is not an object')
    return data


# ── SERIALIZE: Python dict -> file text ─────────────────────────────────

def _js_string(s):
    escaped = (
        s.replace('\\', '\\\\')
         .replace("'", "\\'")
         .replace('\r\n', '\\n')  # do the two-char sequence before the lone chars below
         .replace('\n', '\\n')
         .replace('\r', '\\n')
    )
    return "'" + escaped + "'"


def _js_scalar(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return _js_string(v)
    if isinstance(v, (int, float)):
        return str(v)
    raise TypeError(f'Not a scalar value: {v!r}')


def _field_order_for_dict(d):
    if isinstance(d.get('type'), str) and d['type'] in BLOCK_FIELD_ORDER:
        return BLOCK_FIELD_ORDER[d['type']]
    if d.keys() and set(d.keys()) <= {'text', 'style'}:
        return ['text', 'style']
    if set(d.keys()) <= {'src', 'caption', 'fit'}:
        return ['src', 'fit', 'caption']
    return list(d.keys())


def _ordered_items(d, order):
    keys = [k for k in order if k in d] + [k for k in d if k not in order]
    return [(k, d[k]) for k in keys]


def _js_inline(v):
    """Every nested object/array in our files is written on one line —
    only the top-level project object and its detailLayout array break
    onto multiple lines. This renders that inline style recursively."""
    if isinstance(v, dict):
        items = _ordered_items(v, _field_order_for_dict(v))
        parts = [f'{k}: {_js_inline(val)}' for k, val in items]
        return '{ ' + ', '.join(parts) + ' }' if parts else '{}'
    if isinstance(v, list):
        return '[' + ', '.join(_js_inline(x) for x in v) + ']'
    return _js_scalar(v)


def _render_top_field(key, value):
    if key == 'detailLayout' and isinstance(value, list):
        if not value:
            return f'{key}: []'
        inner = ',\n'.join('    ' + _js_inline(block) for block in value)
        return f'{key}: [\n{inner},\n  ]'
    if isinstance(value, (dict, list)):
        return f'{key}: {_js_inline(value)}'
    return f'{key}: {_js_scalar(value)}'


def serialize_project_js(data):
    items = _ordered_items(data, FIELD_ORDER)
    lines = ['window.PORTFOLIO_PROJECTS.push({']
    for key, value in items:
        lines.append('  ' + _render_top_field(key, value) + ',')
    lines.append('});')
    return '\n'.join(lines) + '\n'


# ── Default shape for brand-new projects (mirrors _template.js) ─────────

def default_project(project_id, title):
    return {
        'id': project_id,
        'featured': True,
        'titlePrefix': None,
        'title': title,
        'titleFont': 'Chiron Sung HK',
        'titleItalic': False,
        'titleWeight': 400,
        'titleColor': '#000000',
        'titleSize': '1.6rem',
        'detail': 'medium, year',
        'archiveBlurb': 'Add a short teaser for the archive view here.',
        'tags': [],
        'previewImage': None,
        'detailLayout': [
            {'type': 'image', 'src': None, 'width': 'full', 'align': 'left', 'caption': None},
            {'type': 'text', 'content': '', 'width': 'full', 'align': 'left'},
            {'type': 'spacer', 'size': 'lg'},
            {'type': 'imageGrid', 'columns': 2, 'images': [{'src': None}, {'src': None}]},
        ],
    }
