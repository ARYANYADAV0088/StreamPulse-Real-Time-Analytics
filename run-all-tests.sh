#!/bin/bash

# 🧪 Script d'exécution de tous les tests - Kafka Demo
# Usage: ./run-all-tests.sh [--coverage] [--watch] [--verbose]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
COVERAGE=false
WATCH=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --coverage)
      COVERAGE=true
      shift
      ;;
    --watch)
      WATCH=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--coverage] [--watch] [--verbose]"
      echo "  --coverage  Generate coverage reports"
      echo "  --watch     Run tests in watch mode"
      echo "  --verbose   Run tests with verbose output"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Function to print colored output
print_header() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        print_error "Directory $1 not found!"
        return 1
    fi
    return 0
}

# Function to check if package.json exists
check_package_json() {
    if [ ! -f "$1/package.json" ]; then
        print_error "package.json not found in $1!"
        return 1
    fi
    return 0
}

# Function to run tests
run_tests() {
    local dir=$1
    local name=$2
    
    print_header "Running $name Tests"
    
    if ! check_directory "$dir"; then
        return 1
    fi
    
    if ! check_package_json "$dir"; then
        return 1
    fi
    
    cd "$dir"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies for $name..."
        npm install
    fi
    
    # Build test command
    local test_cmd="npm test"
    
    if [ "$COVERAGE" = true ]; then
        test_cmd="npm run test:coverage"
    elif [ "$WATCH" = true ]; then
        test_cmd="npm run test:watch"
    fi
    
    if [ "$VERBOSE" = true ]; then
        test_cmd="$test_cmd -- --verbose"
    fi
    
    print_info "Running: $test_cmd"
    
    if eval "$test_cmd"; then
        print_success "$name tests passed!"
    else
        print_error "$name tests failed!"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Function to generate summary report
generate_summary() {
    print_header "Test Summary Report"
    
    local backend_status="❌"
    local frontend_status="❌"
    
    if [ -f "backend/.test-results" ]; then
        backend_status="✅"
    fi
    
    if [ -f "frontend/.test-results" ]; then
        frontend_status="✅"
    fi
    
    echo -e "${BLUE}Backend Tests:${NC} $backend_status"
    echo -e "${BLUE}Frontend Tests:${NC} $frontend_status"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        print_info "Coverage reports generated:"
        if [ -d "backend/coverage" ]; then
            echo "  📊 Backend: backend/coverage/lcov-report/index.html"
        fi
        if [ -d "frontend/coverage" ]; then
            echo "  📊 Frontend: frontend/coverage/lcov-report/index.html"
        fi
    fi
}

# Create temporary files to track test results
cleanup_temp_files() {
    rm -f backend/.test-results frontend/.test-results
}

# Trap to cleanup on exit
trap cleanup_temp_files EXIT

# Main execution
main() {
    print_header "Kafka Demo - Running All Tests"
    
    local project_root=$(pwd)
    local backend_success=false
    local frontend_success=false
    
    # Check if we're in the project root
    if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # If watch mode, we can only run one at a time
    if [ "$WATCH" = true ]; then
        print_warning "Watch mode detected. Choose which tests to run:"
        echo "1) Backend tests"
        echo "2) Frontend tests"
        read -p "Enter choice (1 or 2): " choice
        
        case $choice in
            1)
                run_tests "backend" "Backend"
                ;;
            2)
                run_tests "frontend" "Frontend"
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
        return
    fi
    
    # Run backend tests
    if run_tests "backend" "Backend"; then
        backend_success=true
        touch backend/.test-results
    fi
    
    echo ""
    
    # Run frontend tests
    if run_tests "frontend" "Frontend"; then
        frontend_success=true
        touch frontend/.test-results
    fi
    
    echo ""
    
    # Generate summary
    generate_summary
    
    # Exit with appropriate code
    if [ "$backend_success" = true ] && [ "$frontend_success" = true ]; then
        print_success "All tests passed! 🎉"
        exit 0
    else
        print_error "Some tests failed!"
        exit 1
    fi
}

# Run main function
main "$@" 