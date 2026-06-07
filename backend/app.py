"""
TONY AI — Complete Flask Backend
100% Offline · No Internet Required
"""

import os, json, platform, datetime, subprocess, requests
import time
from functools import lru_cache
import psutil
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
REACT_DIST = os.path.join(BASE_DIR, '..', 'frontend', 'dist')

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'static'))
CORS(app)

OLLAMA_URL   = 'http://localhost:11434/api/generate'
OLLAMA_MODEL = 'llama3.2'   # change to: phi3, mistral, gemma2:2b

SYSTEM_PROMPT = """
You are TONY — Tactical Offline Neural-network Yielding Assistant.
You are brilliant, witty, slightly sarcastic but always helpful.
You speak with confidence and precision. Address the user as 'Boss' occasionally.
You run 100% OFFLINE on the user's local machine — no cloud, no internet.

RULES:
- Be concise. Every sentence earns its place.
- For code: give clean working code with brief explanation.
- Never start with "I" as first word.
- Never use: "certainly", "absolutely", "of course", "great question".
- Decline harmful requests briefly — no lectures.
"""

# ── OLLAMA ────────────────────────────────────────────────────────────
def query_ollama(prompt: str) -> str | None:
    """Send a prompt to Ollama with caching and timing.
    Returns the response string or None on failure.
    """
    start = time.time()
    response = _cached_ollama(prompt)
    # Log latency (ms)
    elapsed_ms = int((time.time() - start) * 1000)
    print(f"[OLLAMA] prompt cached={response is not None and response != ''} latency={elapsed_ms}ms")
    # Store latency in a thread‑local var for the route to read
    # We'll attach it to Flask's g object via request context
    try:
        from flask import g
        g.ollama_latency = elapsed_ms
    except Exception:
        pass
    return response if response != '' else None

@lru_cache(maxsize=256)
def _cached_ollama(prompt: str) -> str:
    """Low‑level request to Ollama that is cached.
    Returns the raw response string (empty on error).
    """
    try:
        r = requests.post(OLLAMA_URL, json={
            'model':  OLLAMA_MODEL,
            'prompt': prompt,
            'system': SYSTEM_PROMPT,
            'stream': False,
            'options': {'temperature': 0.7, 'top_p': 0.9, 'num_predict': 512}
        }, timeout=60)
        if r.status_code == 200:
            return r.json().get('response', '').strip()
    except Exception:
        pass
    return ''

# ── FALLBACK ──────────────────────────────────────────────────────────
def smart_fallback(msg: str) -> str:
    m = msg.lower().strip()

    if any(w in m for w in ['hello','hi','hey','greet']):
        return "Online and ready, Boss. What do you need?"
    if 'time' in m:
        return f"Current time: {datetime.datetime.now().strftime('%I:%M %p, %A %B %d, %Y')}."
    if 'date' in m:
        return f"Today is {datetime.datetime.now().strftime('%A, %B %d, %Y')}."
    if 'battery' in m:
        try:
            b = psutil.sensors_battery()
            if b:
                s = 'charging' if b.power_plugged else 'on battery'
                return f"Battery at {b.percent:.1f}%, {s}."
        except: pass
        return "Battery sensor not available on this machine."
    if 'cpu' in m:
        c = psutil.cpu_percent(interval=0.5)
        return f"CPU at {c}% — {psutil.cpu_count(logical=False)} cores, {psutil.cpu_count()} threads."
    if 'memory' in m or 'ram' in m:
        mem = psutil.virtual_memory()
        return f"RAM: {mem.used/1e9:.1f}GB used of {mem.total/1e9:.1f}GB ({mem.percent}%)."
    if 'disk' in m or 'storage' in m:
        d = psutil.disk_usage('/')
        return f"Disk: {d.used/1e9:.1f}GB used of {d.total/1e9:.1f}GB ({d.percent}%)."
    if 'os' in m or 'system' in m:
        return f"Running {platform.system()} {platform.release()} on {platform.machine()}."
    if any(w in m for w in ['thank','thanks']):
        return "Always a pleasure, Boss."
    if 'joke' in m:
        return "Why do programmers prefer dark mode? Because light attracts bugs. I'm here all week, Boss."
    if 'name' in m:
        return "TONY — Tactical Offline Neural-network Yielding Assistant. Built to serve, Boss."
    if 'help' in m:
        return ("I can help with: CPU/RAM/disk/battery stats, time & date, coding, math, "
                "general knowledge, jokes, and system control. Just ask, Boss.")
    if any(w in m for w in ['bye','shutdown','quit','exit']):
        return "I'll be here when you need me, Boss."
    if 'weather' in m:
        city = m.replace('weather','').strip().title() or 'your city'
        return f"I'm running offline, Boss. For {city} weather, connect to the internet and check a weather service."
    if 'search' in m:
        query = m.replace('search','').strip()
        return f"Offline mode active. To search '{query}', I'd need internet access. Try a browser when online."

    return ("Ollama isn't running right now. Start it with 'ollama serve' and pull a model with "
            "'ollama pull llama3.2' for full AI. Meanwhile, try asking about CPU, RAM, battery, or time.")

# ── ROUTES ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    # Serve React build if available, else a simple redirect message
    dist = os.path.join(BASE_DIR, '..', 'frontend', 'dist', 'index.html')
    if os.path.exists(dist):
        return send_from_directory(os.path.dirname(dist), 'index.html')
    return "<h2>Run 'npm run build' in the frontend folder first, or use 'npm run dev' for development.</h2>", 200

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

# Serve React static assets
@app.route('/assets/<path:filename>')
def react_assets(filename):
    dist_assets = os.path.join(BASE_DIR, '..', 'frontend', 'dist', 'assets')
    return send_from_directory(dist_assets, filename)


@app.route('/api/chat', methods=['POST'])
def chat():
    data    = request.get_json()
    message = (data or {}).get('message', '').strip()
    if not message:
        return jsonify({'error': 'Empty message'}), 400

    response = query_ollama(message)
    source   = 'ollama'
    if not response:
        response = smart_fallback(message)
        source   = 'fallback'

    # Retrieve latency stored by query_ollama, if any
    from flask import g, make_response
    resp = make_response(jsonify({
        'response':  response,
        'source':    source,
        'timestamp': datetime.datetime.now().isoformat()
    }))
    if hasattr(g, 'ollama_latency'):
        resp.headers['X-Search-Time'] = f"{g.ollama_latency}ms"
    return resp


@app.route('/api/system', methods=['GET'])
def system_info():
    try:
        cpu  = psutil.cpu_percent(interval=0.5)
        mem  = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        bat  = psutil.sensors_battery()
        freq = psutil.cpu_freq()
        net1 = psutil.net_io_counters()
        import time; time.sleep(0.5)
        net2 = psutil.net_io_counters()

        # Try to get CPU model name
        cpu_model = 'Unknown CPU'
        try:
            if platform.system() == 'Windows':
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                    r'HARDWARE\DESCRIPTION\System\CentralProcessor\0')
                cpu_model = winreg.QueryValueEx(key, 'ProcessorNameString')[0].strip()
            elif platform.system() == 'Linux':
                with open('/proc/cpuinfo') as f:
                    for line in f:
                        if 'model name' in line:
                            cpu_model = line.split(':')[1].strip()
                            break
            elif platform.system() == 'Darwin':
                cpu_model = subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string']).decode().strip()
        except:
            pass

        return jsonify({
            'cpu_percent':      round(cpu, 1),
            'cpu_model':        cpu_model[:40],
            'cpu_cores':        psutil.cpu_count(logical=False),
            'cpu_threads':      psutil.cpu_count(logical=True),
            'cpu_freq_current': round(freq.current) if freq else None,
            'cpu_freq_max':     round(freq.max)     if freq else None,
            'ram_used_gb':      round(mem.used  / 1e9, 1),
            'ram_total_gb':     round(mem.total / 1e9, 1),
            'ram_percent':      mem.percent,
            'disk_used_gb':     round(disk.used  / 1e9, 1),
            'disk_total_gb':    round(disk.total / 1e9, 1),
            'disk_percent':     disk.percent,
            'battery_percent':  round(bat.percent, 1) if bat else None,
            'battery_plugged':  bat.power_plugged      if bat else None,
            'battery_time':     str(datetime.timedelta(seconds=int(bat.secsleft))) if bat and bat.secsleft > 0 else None,
            'net_down_kb':      round((net2.bytes_recv - net1.bytes_recv) / 512),
            'net_up_kb':        round((net2.bytes_sent - net1.bytes_sent) / 512),
            'proc_count':       len(psutil.pids()),
            'os':               f'{platform.system()} {platform.release()}',
            'hostname':         platform.node(),
            'uptime_hours':     round((datetime.datetime.now().timestamp() - psutil.boot_time()) / 3600, 1),
            'timestamp':        datetime.datetime.now().strftime('%H:%M:%S')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ollama_status', methods=['GET'])
def ollama_status():
    try:
        r = requests.get('http://localhost:11434/api/tags', timeout=2)
        models = [m['name'] for m in r.json().get('models', [])]
        return jsonify({'online': True, 'models': models})
    except:
        return jsonify({'online': False, 'models': []})


@app.route('/api/launch', methods=['POST'])
def launch_app():
    data    = request.get_json()
    app_name = (data or {}).get('app', '').lower().strip()
    if not app_name:
        return jsonify({'success': False, 'response': 'No app specified.'})

    OS = platform.system()
    WIN_APPS = {
        'notepad':      'notepad.exe',
        'calculator':   'calc.exe',
        'paint':        'mspaint.exe',
        'explorer':     'explorer.exe',
        'cmd':          'cmd.exe',
        'powershell':   'powershell.exe',
        'task manager': 'taskmgr.exe',
        'settings':     'ms-settings:',
        'chrome':       r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        'firefox':      r'C:\Program Files\Mozilla Firefox\firefox.exe',
        'vscode':       'code',
        'outlook':      'outlook.exe',
        'excel':        'excel.exe',
        'word':         'winword.exe',
        'media player': 'wmplayer.exe',
        'camera':       'microsoft.windows.camera:',
    }
    MAC_APPS = {
        'safari':    'open -a Safari',
        'chrome':    'open -a "Google Chrome"',
        'firefox':   'open -a Firefox',
        'vscode':    'open -a "Visual Studio Code"',
        'terminal':  'open -a Terminal',
        'finder':    'open -a Finder',
        'calculator':'open -a Calculator',
        'notes':     'open -a Notes',
        'music':     'open -a Music',
        'photos':    'open -a Photos',
    }

    try:
        if OS == 'Windows':
            cmd = WIN_APPS.get(app_name)
            if cmd:
                if cmd.startswith('ms-'):
                    os.startfile(cmd)
                else:
                    subprocess.Popen(cmd.split(), shell=True)
                return jsonify({'success': True, 'response': f'Launched {app_name.title()}, Boss.'})
        elif OS == 'Darwin':
            cmd = MAC_APPS.get(app_name)
            if cmd:
                subprocess.Popen(cmd, shell=True)
                return jsonify({'success': True, 'response': f'Opened {app_name.title()}, Boss.'})
        elif OS == 'Linux':
            subprocess.Popen([app_name], shell=False)
            return jsonify({'success': True, 'response': f'Launched {app_name}, Boss.'})

        return jsonify({'success': False, 'response': f"App '{app_name}' not found in the launcher."})
    except Exception as e:
        return jsonify({'success': False, 'response': f'Failed to launch {app_name}: {str(e)}'})


@app.route('/api/action', methods=['POST'])
def system_action():
    data   = request.get_json()
    action = (data or {}).get('action', '').lower().strip()
    OS     = platform.system()

    ACTIONS = {
        'Windows': {
            'screenshot':  lambda: subprocess.Popen(['snippingtool']),
            'lock':        lambda: subprocess.Popen(['rundll32.exe','user32.dll,LockWorkStation']),
            'volume_up':   lambda: subprocess.Popen(['nircmd.exe','changesysvolume','5000']),
            'volume_down': lambda: subprocess.Popen(['nircmd.exe','changesysvolume','-5000']),
            'mute':        lambda: subprocess.Popen(['nircmd.exe','mutesysvolume','2']),
            'empty_bin':   lambda: subprocess.Popen(['powershell','-command','Clear-RecycleBin -Force -ErrorAction SilentlyContinue']),
            'sleep':       lambda: subprocess.Popen(['rundll32.exe','powrprof.dll,SetSuspendState','0','1','0']),
            'restart':     lambda: subprocess.Popen(['shutdown','/r','/t','5']),
            'shutdown':    lambda: subprocess.Popen(['shutdown','/s','/t','5']),
        },
        'Darwin': {
            'screenshot':  lambda: subprocess.Popen(['screencapture','-i','/tmp/tony_screen.png']),
            'lock':        lambda: subprocess.Popen(['osascript','-e','tell application "System Events" to keystroke "q" using {command down, control down}']),
            'volume_up':   lambda: subprocess.Popen(['osascript','-e','set volume output volume (output volume of (get volume settings) + 10)']),
            'volume_down': lambda: subprocess.Popen(['osascript','-e','set volume output volume (output volume of (get volume settings) - 10)']),
            'mute':        lambda: subprocess.Popen(['osascript','-e','set volume output muted true']),
            'sleep':       lambda: subprocess.Popen(['osascript','-e','tell app "System Events" to sleep']),
            'restart':     lambda: subprocess.Popen(['osascript','-e','tell app "System Events" to restart']),
            'shutdown':    lambda: subprocess.Popen(['osascript','-e','tell app "System Events" to shut down']),
        },
        'Linux': {
            'screenshot':  lambda: subprocess.Popen(['scrot', '/tmp/tony_screen.png']),
            'lock':        lambda: subprocess.Popen(['xdg-screensaver', 'lock']),
            'volume_up':   lambda: subprocess.Popen(['amixer','-D','pulse','sset','Master','5%+']),
            'volume_down': lambda: subprocess.Popen(['amixer','-D','pulse','sset','Master','5%-']),
            'mute':        lambda: subprocess.Popen(['amixer','-D','pulse','sset','Master','toggle']),
            'sleep':       lambda: subprocess.Popen(['systemctl','suspend']),
            'restart':     lambda: subprocess.Popen(['systemctl','reboot']),
            'shutdown':    lambda: subprocess.Popen(['systemctl','poweroff']),
        }
    }

    MESSAGES = {
        'screenshot': 'Screenshot captured, Boss.',
        'lock':       'Screen locked, Boss.',
        'volume_up':  'Volume increased.',
        'volume_down':'Volume decreased.',
        'mute':       'Audio muted.',
        'empty_bin':  'Recycle bin emptied, Boss.',
        'sleep':      'Initiating sleep mode, Boss.',
        'restart':    'Restarting in 5 seconds, Boss.',
        'shutdown':   'Shutting down in 5 seconds, Boss.',
    }

    try:
        fn = ACTIONS.get(OS, {}).get(action)
        if fn:
            fn()
            return jsonify({'success': True, 'response': MESSAGES.get(action, f'Done: {action}')})
        return jsonify({'success': False, 'response': f"Action '{action}' not supported on {OS}."})
    except Exception as e:
        return jsonify({'success': False, 'response': f'Action failed: {str(e)}'})


# ════════════════════════════════════════════════════════════════════════════
#  DATABASE API ROUTES — Production-Grade SQLite
# ════════════════════════════════════════════════════════════════════════════
import sqlite3
import re
from database.connection import get_db
from database.schema import init_database
from database.routes import db_routes

# Auto-init local SQLite on startup (100% offline, no cloud)
init_database()

# Register blueprint for User/Project/File CRUD API routes
app.register_blueprint(db_routes, url_prefix='/api')


def _fts_escape(query: str) -> str:
    """Build a safe FTS5 prefix query from user input."""
    terms = re.findall(r'\w+', query.lower())
    if not terms:
        return ''
    return ' OR '.join(f'"{t}"*' for t in terms[:12])


def _index_message_fts(conn, rowid, text, session_id, role):
    """Insert a single message into the FTS index."""
    if text:
        conn.execute(
            "INSERT INTO chat_messages_fts(rowid, text, session_id, role) VALUES (?, ?, ?, ?)",
            (rowid, text, session_id, role or '')
        )


# ── Session endpoints ────────────────────────────────────────────────────────

@app.route('/api/db/session', methods=['POST'])
def db_save_session():
    """Create or replace a chat session record."""
    data = request.get_json() or {}
    session_id = data.get('sessionId')
    preview    = (data.get('preview') or '')[:120]
    title      = data.get('title', preview[:60])
    if not session_id:
        return jsonify({'error': 'Missing sessionId'}), 400
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO chat_sessions (id, title, preview, message_count)
                   VALUES (?, ?, ?, 0)
                   ON CONFLICT(id) DO UPDATE SET
                       preview    = excluded.preview,
                       title      = COALESCE(NULLIF(excluded.title,''), chat_sessions.title),
                       updated_at = CURRENT_TIMESTAMP""",
                (session_id, title, preview)
            )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/session/<session_id>', methods=['GET'])
def db_load_session(session_id):
    """Load messages for a session. Supports ?page=1&limit=50 pagination."""
    try:
        page  = max(1, int(request.args.get('page',  1)))
        limit = min(200, int(request.args.get('limit', 200)))
        offset = (page - 1) * limit
        with get_db() as conn:
            rows = conn.execute(
                """SELECT id, role, text, timestamp, source
                   FROM chat_messages
                   WHERE session_id = ?
                   ORDER BY saved_at ASC
                   LIMIT ? OFFSET ?""",
                (session_id, limit, offset)
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) AS c FROM chat_messages WHERE session_id = ?",
                (session_id,)
            ).fetchone()['c']
        resp = jsonify([dict(r) for r in rows])
        resp.headers['X-Total-Messages'] = str(total)
        resp.headers['X-Page']           = str(page)
        resp.headers['X-Limit']          = str(limit)
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/session/<session_id>', methods=['DELETE'])
def db_delete_session(session_id):
    """Permanently delete a session and all its messages (cascade + FTS cleanup)."""
    try:
        with get_db() as conn:
            # Clean FTS index first (CASCADE won't clean virtual tables)
            msg_rows = conn.execute(
                "SELECT id FROM chat_messages WHERE session_id = ?", (session_id,)
            ).fetchall()
            for row in msg_rows:
                conn.execute(
                    "DELETE FROM chat_messages_fts WHERE rowid = ?", (row['id'],)
                )
            # Delete session — chat_messages cascade via FK
            conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
        return jsonify({'success': True, 'deleted': session_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/session/<session_id>/title', methods=['PATCH'])
def db_rename_session(session_id):
    """Update the user-visible title of a session."""
    data  = request.get_json() or {}
    title = (data.get('title') or '').strip()[:120]
    if not title:
        return jsonify({'error': 'Missing title'}), 400
    try:
        with get_db() as conn:
            conn.execute(
                "UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (title, session_id)
            )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Message endpoints ────────────────────────────────────────────────────────

@app.route('/api/db/message', methods=['POST'])
def db_save_message():
    """Save a single chat message and update the FTS index."""
    data = request.get_json() or {}
    session_id = data.get('sessionId')
    if not session_id:
        return jsonify({'error': 'Missing sessionId'}), 400
    try:
        with get_db() as conn:
            cur = conn.execute(
                """INSERT INTO chat_messages (session_id, role, text, timestamp, source)
                   VALUES (?, ?, ?, ?, ?)""",
                (session_id,
                 data.get('role'),
                 data.get('text'),
                 data.get('timestamp'),
                 data.get('source', 'unknown'))
            )
            _index_message_fts(conn, cur.lastrowid, data.get('text'), session_id, data.get('role'))
            # Sync message_count (trigger handles it, but keep preview fresh too)
            if data.get('role') == 'user' and not data.get('skipPreviewUpdate'):
                preview_text = (data.get('text') or '')[:120]
                conn.execute(
                    "UPDATE chat_sessions SET preview = ? WHERE id = ? AND (preview IS NULL OR preview = '')",
                    (preview_text, session_id)
                )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/batch', methods=['POST'])
def db_save_batch():
    """Atomically save a session + multiple messages in one transaction.

    Body: { sessionId, preview, title?, messages: [{role, text, timestamp, source}] }
    This is the preferred way to persist a conversation — one round-trip.
    """
    data       = request.get_json() or {}
    session_id = data.get('sessionId')
    messages   = data.get('messages', [])
    if not session_id:
        return jsonify({'error': 'Missing sessionId'}), 400
    preview = (data.get('preview') or '')[:120]
    title   = (data.get('title')   or preview[:60])

    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO chat_sessions (id, title, preview, message_count)
                   VALUES (?, ?, ?, 0)
                   ON CONFLICT(id) DO UPDATE SET
                       preview    = excluded.preview,
                       title      = COALESCE(NULLIF(excluded.title,''), chat_sessions.title),
                       updated_at = CURRENT_TIMESTAMP""",
                (session_id, title, preview)
            )
            for msg in messages:
                if not msg.get('text'):
                    continue
                cur = conn.execute(
                    """INSERT INTO chat_messages (session_id, role, text, timestamp, source)
                       VALUES (?, ?, ?, ?, ?)""",
                    (session_id,
                     msg.get('role', 'user'),
                     msg.get('text', ''),
                     msg.get('timestamp', ''),
                     msg.get('source', 'unknown'))
                )
                _index_message_fts(conn, cur.lastrowid, msg.get('text'), session_id, msg.get('role'))
        return jsonify({'success': True, 'saved': len(messages)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Listing / search endpoints ───────────────────────────────────────────────

@app.route('/api/db/sessions', methods=['GET'])
def db_list_sessions():
    """List all sessions ordered by most-recently-updated."""
    try:
        with get_db() as conn:
            rows = conn.execute(
                """SELECT id,
                          COALESCE(title, preview, '') AS title,
                          preview,
                          message_count,
                          created_at,
                          updated_at
                   FROM chat_sessions
                   ORDER BY updated_at DESC"""
            ).fetchall()
            return jsonify([dict(row) for row in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/search-index', methods=['GET'])
def db_search_index():
    """Return sessions with all user questions pre-joined for instant client-side search."""
    try:
        with get_db() as conn:
            rows = conn.execute("""
                SELECT s.id,
                       COALESCE(s.title, s.preview, '') AS title,
                       s.preview,
                       s.message_count,
                       s.created_at,
                       s.updated_at,
                       COALESCE(GROUP_CONCAT(m.text, ' '), '') AS user_questions
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.session_id = s.id AND m.role = 'user'
                GROUP BY s.id
                ORDER BY s.updated_at DESC
            """).fetchall()
            return jsonify([dict(row) for row in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/search', methods=['GET'])
def db_search():
    """FTS5 full-text search across user questions and AI replies."""
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify([])
    fts_q = _fts_escape(q)
    if not fts_q:
        return jsonify([])
    try:
        start = time.time()
        with get_db() as conn:
            rows = conn.execute("""
                SELECT DISTINCT
                       s.id,
                       COALESCE(s.title, s.preview, '') AS title,
                       s.preview,
                       s.message_count,
                       s.created_at,
                       s.updated_at,
                       snippet(chat_messages_fts, 0, '[[', ']]', '...', 64) AS match_snippet,
                       f.role AS match_role
                FROM chat_messages_fts f
                JOIN chat_sessions s ON s.id = f.session_id
                WHERE chat_messages_fts MATCH ?
                ORDER BY s.updated_at DESC
                LIMIT 50
            """, (fts_q,)).fetchall()
        elapsed_ms = int((time.time() - start) * 1000)
        resp = jsonify([dict(row) for row in rows])
        resp.headers['X-Search-Time'] = f'{elapsed_ms}ms'
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Stats / admin endpoints ──────────────────────────────────────────────────

@app.route('/api/db/stats', methods=['GET'])
def db_stats():
    """Return aggregate counts: sessions, total messages, DB file size."""
    try:
        with get_db() as conn:
            sessions  = conn.execute("SELECT COUNT(*) AS c FROM chat_sessions").fetchone()['c']
            messages  = conn.execute("SELECT COUNT(*) AS c FROM chat_messages").fetchone()['c']
        from database.connection import DB_PATH
        db_size_kb = round(os.path.getsize(DB_PATH) / 1024, 1) if os.path.exists(DB_PATH) else 0
        return jsonify({
            'sessions':      sessions,
            'totalMessages': messages,
            'dbSizeKb':      db_size_kb,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/export', methods=['GET'])
def db_export():
    """Export the entire conversation history as a JSON download."""
    try:
        with get_db() as conn:
            sessions = conn.execute(
                "SELECT * FROM chat_sessions ORDER BY updated_at DESC"
            ).fetchall()
            result = []
            for s in sessions:
                msgs = conn.execute(
                    "SELECT role, text, timestamp, source FROM chat_messages WHERE session_id = ? ORDER BY saved_at ASC",
                    (s['id'],)
                ).fetchall()
                result.append({
                    **dict(s),
                    'messages': [dict(m) for m in msgs]
                })
        from flask import make_response
        resp = make_response(json.dumps(result, indent=2, ensure_ascii=False))
        resp.headers['Content-Type']        = 'application/json'
        resp.headers['Content-Disposition'] = f'attachment; filename="tony_export_{datetime.datetime.now():%Y%m%d_%H%M%S}.json"'
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/vacuum', methods=['POST'])
def db_vacuum():
    """Checkpoint WAL and VACUUM the database to reclaim space."""
    try:
        with get_db() as conn:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        # VACUUM must run outside a transaction
        from database.connection import get_connection
        raw = get_connection()
        raw.isolation_level = None   # autocommit
        raw.execute("VACUUM")
        raw.close()
        from database.connection import DB_PATH
        db_size_kb = round(os.path.getsize(DB_PATH) / 1024, 1) if os.path.exists(DB_PATH) else 0
        return jsonify({'success': True, 'dbSizeKb': db_size_kb})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Profile endpoint ─────────────────────────────────────────────────────────

@app.route('/api/db/profile', methods=['GET', 'POST'])
def db_profile():
    """GET: load operator profile. POST: save operator profile."""
    try:
        with get_db() as conn:
            if request.method == 'POST':
                profile_data = json.dumps(request.get_json() or {})
                conn.execute(
                    "INSERT OR REPLACE INTO operator_profile (id, profile_data, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)",
                    (profile_data,)
                )
                return jsonify({'success': True})
            else:
                row = conn.execute("SELECT profile_data FROM operator_profile WHERE id = 1").fetchone()
                if row and row['profile_data']:
                    return jsonify(json.loads(row['profile_data']))
                return jsonify(None)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('\n' + '='*54)
    print('  [OK] TONY AI - Flask Backend Server')
    print('  - API:  http://127.0.0.1:5000/api/*')
    print('  - React Dev: http://localhost:3000')
    print('='*54 + '\n')
    app.run(host='0.0.0.0', port=5000, debug=False)
