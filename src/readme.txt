# Project Maintainability

- All field names, status values, config paths, and API response keys are defined as constants in hotel_constants.py.
- All business logic is moved to helper modules (hotel_helpers.py, etc.) for clean, maintainable code.
- All test files use these constants for full synchronization and DRY code.

# How to Run Unittests in hotel_connect/src

## 1. Core Logic Tests
- Run all core logic unittests (json_utils, hotel_schema_service, hotel_request_report_service):

    python3 -m unittest test_unit_core.py

## 2. API/Integration Tests
- Run all API (Flask) endpoint tests:

    python3 -m unittest test_service.py
    
  (for schema API only)

- Run extended API tests (request, approve, reject, report, ...):

    python3 -m unittest test_api.py

## 3. Coverage (optional)
- To check code coverage (if coverage is installed):

    coverage run -m unittest test_unit_core.py
    coverage report -m

## 4. Python Dependencies
- Ensure pip (Python package manager) is installed.
- Install the required libraries (if not already done):

    pip install flask flask-cors

- If using coverage:

    pip install coverage

## Notes
- All test files are in this folder.
- You can run all tests at once:

    python3 -m unittest discover

- Ensure all dependencies (Flask, etc.) are installed in your environment.
