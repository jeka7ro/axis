import sqlite3

def migrate():
    conn = sqlite3.connect("axis_dev.db")
    cursor = conn.cursor()
    
    tables_to_migrate = [
        ("users", "axis_users"),
        ("clients", "axis_clients"),
        ("vehicles", "axis_vehicles"),
        ("vehicle_brands", "axis_vehicle_brands"),
        ("vehicle_models", "axis_vehicle_models"),
        ("offers", "axis_offers"),
        ("contracts", "axis_contracts"),
        ("gps_data", "axis_gps_data"),
        ("gps_alerts", "axis_gps_alerts"),
        ("evaluations", "axis_evaluations")
    ]
    
    for old, new in tables_to_migrate:
        try:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{old}';")
            if cursor.fetchone():
                print(f"Migrating {old} -> {new}")
                cursor.execute(f"INSERT OR IGNORE INTO {new} SELECT * FROM {old};")
        except Exception as e:
            print(f"Error on {old}: {e}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
