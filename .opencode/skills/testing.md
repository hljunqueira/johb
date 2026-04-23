# Salada Soul - Testing Guide

## Test Reports Location
- `docs/test_reports/` - Test results and reports

## Backend Tests
```bash
cd backend
python -m pytest

# Run specific test file
python -m pytest tests/test_salada_soul.py

# Run with verbose output
python -m pytest -v
```

## Frontend Tests
```bash
cd frontend
npm test

# Run tests with coverage
npm test -- --coverage
```

## API Tests
- `scripts/backend_test.py` - Integration tests
- `frontend/src/lib/__tests__/` - Frontend unit tests
- `frontend/src/context/__tests__/` - Context tests

## Known Test Status
- **Iteration 2**: 100% pass (23/23 tests)
- See `docs/test_reports/iteration_2.json` for details

## Testing API Manually
```bash
# Health check
curl http://localhost:8001/api/health

# Create test order
curl -X POST http://localhost:8001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"phone": "11999999999", "items": [...]}'
```

## Database Diagnostics
```bash
# Check table structure
python backend/check_table.py

# Test database connection
python backend/test_db.py
```
