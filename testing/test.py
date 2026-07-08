from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
import time

# --- Setup ---
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
driver.maximize_window()
wait = WebDriverWait(driver, 25)
actions = ActionChains(driver)

def slow_scroll():
    """Video recording ke liye slow scroll function"""
    height = int(driver.execute_script("return document.body.scrollHeight"))
    for i in range(1, height, 18):
        driver.execute_script(f"window.scrollTo(0, {i});")
    time.sleep(1)

try:
    # --- 1. USER REGISTRATION & LOGIN (Customer/Client) ---
    print("✨ STEP 1: TMS User Registration & Login...")
    driver.get("http://localhost:3000/register") # MERN routes usually don't have .html
    
    unique_email = f"parth_trans_{int(time.time())}@gmail.com"
    driver.find_element(By.NAME, "name").send_keys("Parth Transport")
    driver.find_element(By.NAME, "email").send_keys(unique_email)
    driver.find_element(By.NAME, "password").send_keys("Transport@2026")
    
    # Click Register
    driver.find_element(By.ID, "register-btn").click()
    time.sleep(2)

    # Login
    driver.get("http://localhost:3000/login")
    driver.find_element(By.NAME, "email").send_keys(unique_email)
    driver.find_element(By.NAME, "password").send_keys("Transport@2026")
    driver.find_element(By.ID, "login-btn").click()
    time.sleep(3)

    # --- 2. FLEET EXPLORATION (Available Trucks/Vehicles) ---
    print("🚛 STEP 2: Exploring Available Fleet...")
    driver.get("http://localhost:3000/vehicles")
    slow_scroll()

    # --- 3. BOOKING A SHIPMENT ---
    print("📦 STEP 3: Booking a New Shipment...")
    driver.get("http://localhost:3000/book-shipment")
    
    # Fill Shipment Details
    driver.find_element(By.NAME, "origin").send_keys("Surat, Gujarat")
    driver.find_element(By.NAME, "destination").send_keys("Mumbai, Maharashtra")
    
    # Select Vehicle Type (Dropdown)
    vehicle_select = Select(driver.find_element(By.ID, "vehicle-type"))
    vehicle_select.select_by_value("Heavy Truck")
    
    driver.find_element(By.NAME, "weight").send_keys("500") # 500kg
    time.sleep(2)
    
    # --- 4. CONFIRM BOOKING & PAYMENT ---
    print("💳 STEP 4: Confirming Booking...")
    booking_btn = driver.find_element(By.ID, "confirm-booking")
    driver.execute_script("arguments[0].click();", booking_btn)
    
    # Wait for success message/page
    wait.until(EC.url_contains("booking-success"))
    print("✅ Shipment Booked Successfully!")
    time.sleep(3)

    # --- 5. ADMIN PANEL TOUR ---
    print("👨‍💼 STEP 5: Admin Panel - Managing Fleet & Orders...")
    driver.get("http://localhost:3000/admin/login")
    driver.find_element(By.NAME, "email").send_keys("admin@tms.com")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.ID, "admin-login-btn").click()
    time.sleep(2)

    # Admin Dashboard Tour
    admin_pages = ["dashboard", "manage-vehicles", "all-shipments", "drivers"]
    
    for pg in admin_pages:
        print(f"📊 Viewing Admin Page: {pg}")
        driver.get(f"http://localhost:3000/admin/{pg}")
        time.sleep(2)
        slow_scroll()

    print("\n🏁 TMS FULL SYSTEM TEST COMPLETE!")

finally:
    time.sleep(5)
    driver.quit()