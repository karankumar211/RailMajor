"""RailOpt AI - Quick Database Record Viewer
Usage:
    python view_records.py                  # Shows summary of all tables and record counts
    python view_records.py stations         # View records from 'stations' table
    python view_records.py trains           # View records from 'trains' table
    python view_records.py conflicts        # View records from 'conflicts' table
    python view_records.py users            # View records from 'users' table
"""
import sys
import os
import sqlite3
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "railopt.db")

def format_row(val):
    if val is None:
        return "NULL"
    s = str(val)
    if len(s) > 35:
        return s[:32] + "..."
    return s

def main():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database file not found at: {DB_PATH}")
        print("Run 'python seed.py' first to initialize and populate the database.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    tables = [row["name"] for row in cursor.fetchall()]

    if not tables:
        print(f"[WARN] Database at {DB_PATH} contains no tables.")
        conn.close()
        return

    target_table = sys.argv[1] if len(sys.argv) > 1 else None

    if not target_table:
        print("=" * 65)
        print(f" RAILOPT AI DATABASE SUMMARY ({os.path.basename(DB_PATH)})")
        print("=" * 65)
        print(f"{'Table Name':<25} | {'Row Count':<10}")
        print("-" * 65)
        for tbl in tables:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM \"{tbl}\"")
            cnt = cursor.fetchone()["cnt"]
            print(f"{tbl:<25} | {cnt:<10}")
        print("-" * 65)
        print("\nTip: To view rows of a specific table, run:")
        print(f"  python view_records.py <table_name>")
        print(f"  e.g.: python view_records.py trains")
        conn.close()
        return

    if target_table not in tables:
        print(f"[ERROR] Table '{target_table}' not found in database.")
        print(f"Available tables: {', '.join(tables)}")
        conn.close()
        return

    # Fetch rows
    limit = 20
    cursor.execute(f"SELECT * FROM \"{target_table}\" LIMIT {limit}")
    rows = cursor.fetchall()

    cursor.execute(f"SELECT COUNT(*) as total FROM \"{target_table}\"")
    total = cursor.fetchone()["total"]

    print("=" * 80)
    print(f" TABLE: {target_table} (Showing {len(rows)} of {total} rows)")
    print("=" * 80)

    if not rows:
        print("(Table is currently empty)")
        conn.close()
        return

    col_names = rows[0].keys()
    
    # Calculate column widths (capped at 35 chars)
    col_widths = {col: max(len(col), max(len(format_row(r[col])) for r in rows)) for col in col_names}

    # Header
    header = " | ".join(f"{col:<{col_widths[col]}}" for col in col_names)
    print(header)
    print("-" * len(header))

    # Rows
    for r in rows:
        line = " | ".join(f"{format_row(r[col]):<{col_widths[col]}}" for col in col_names)
        print(line)

    if total > limit:
        print(f"\n... and {total - limit} more rows.")

    conn.close()

if __name__ == "__main__":
    main()

