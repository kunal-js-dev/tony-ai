import sqlite3
import os
path='app.db'
conn=sqlite3.connect(path)
cur=conn.cursor()
rows=cur.execute('SELECT name, type FROM sqlite_master WHERE type IN ("table","view") ORDER BY name').fetchall()
print('Tables/Views:')
for name, typ in rows:
    print(f'- {name} ({typ})')
print('\nRow counts:')
for name, typ in rows:
    if typ=='table' and not name.startswith('sqlite_'):
        cnt=cur.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        print(f'- {name}: {cnt}')
print('\nSample rows:')
for name, typ in rows:
    if typ=='table' and not name.startswith('sqlite_'):
        print(f'\n== {name} ==')
        cols=[r[1] for r in cur.execute(f'PRAGMA table_info("{name}")').fetchall()]
        print('Columns:', ', '.join(cols))
        for row in cur.execute(f'SELECT * FROM "{name}" LIMIT 5'):
            print(row)
conn.close()
