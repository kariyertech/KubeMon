#!/usr/bin/env python3
"""
Test script for KubeMon Events and Alerts system
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db, get_events, get_alerts, save_event, save_alert
from datetime import datetime

def test_database():
    """Test database initialization and basic operations"""
    print("=== Testing Database ===")
    
    # Initialize database
    init_db()
    print("✅ Database initialized")
    
    # Test saving a sample event
    save_event(
        cluster="test-cluster",
        namespace="default", 
        object_name="test-pod",
        object_kind="Pod",
        event_type="Warning",
        reason="Failed",
        message="Test event message",
        first_timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        last_timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        count=1
    )
    print("✅ Sample event saved")
    
    # Test saving a sample alert
    alert_id = save_alert(
        cluster="test-cluster",
        rule_name="test_rule",
        severity="warning", 
        message="Test alert message"
    )
    print(f"✅ Sample alert saved with ID: {alert_id}")
    
    # Test retrieving events
    events = get_events(hours=24)
    print(f"✅ Retrieved {len(events)} events")
    
    # Test retrieving alerts
    alerts = get_alerts(hours=24)
    print(f"✅ Retrieved {len(alerts)} alerts")

def test_api_endpoints():
    """Test API endpoints"""
    print("\n=== Testing API Endpoints ===")
    
    try:
        import requests
        base_url = "http://localhost:8000"
        
        # Test healthz
        response = requests.get(f"{base_url}/api/healthz")
        if response.status_code == 200:
            print("✅ Health check endpoint working")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            
        # Test events endpoint
        response = requests.get(f"{base_url}/api/events")
        if response.status_code == 200:
            events = response.json()
            print(f"✅ Events endpoint working - got {len(events)} events")
        else:
            print(f"❌ Events endpoint failed: {response.status_code}")
            
        # Test alerts endpoint
        response = requests.get(f"{base_url}/api/alerts")
        if response.status_code == 200:
            alerts = response.json()
            print(f"✅ Alerts endpoint working - got {len(alerts)} alerts")
        else:
            print(f"❌ Alerts endpoint failed: {response.status_code}")
            
    except ImportError:
        print("⚠️  requests module not available, skipping API tests")
    except Exception as e:
        print(f"❌ API test failed: {e}")

def test_event_collection():
    """Test event collection functionality"""
    print("\n=== Testing Event Collection ===")
    
    try:
        from events import collect_all_cluster_events
        collect_all_cluster_events()
        print("✅ Event collection completed")
        
        # Check collected events
        events = get_events(hours=1)
        print(f"✅ Found {len(events)} recent events")
        
    except Exception as e:
        print(f"❌ Event collection failed: {e}")

def test_alert_engine():
    """Test alert engine functionality"""
    print("\n=== Testing Alert Engine ===")
    
    try:
        from alerts import run_alert_checks
        run_alert_checks()
        print("✅ Alert checks completed")
        
        # Check generated alerts
        alerts = get_alerts(status='active', hours=1)
        print(f"✅ Found {len(alerts)} active alerts")
        
    except Exception as e:
        print(f"❌ Alert engine test failed: {e}")

if __name__ == "__main__":
    print("🚀 KubeMon Events & Alerts Test Suite")
    print("=" * 50)
    
    test_database()
    test_event_collection()
    test_alert_engine()
    test_api_endpoints()
    
    print("\n🎉 Test suite completed!")
    print("💡 To run the full system:")
    print("   1. Start API: python backend/api.py")
    print("   2. Start monitoring: python backend/main.py")
    print("   3. Access frontend: http://localhost:3000")
