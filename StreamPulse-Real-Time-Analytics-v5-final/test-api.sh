#!/bin/bash

echo "🧪 Kafka Demo API Test"
echo "====================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed. Installing jq for better JSON output...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install jq
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y jq
        else
            echo -e "${RED}❌ Cannot install jq automatically. Please install it manually.${NC}"
            exit 1
        fi
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}🔍 Testing: $description${NC}"
    echo "   Method: $method"
    echo "   URL: $url"
    
    if [ -n "$data" ]; then
        echo "   Data: $data"
        response=$(curl -s -X $method "$url" -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s -X $method "$url")
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success${NC}"
        echo "$response" | jq 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
}

# Check if backend is running
echo -e "${YELLOW}🔍 Checking if backend is running...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}❌ Backend is not running on http://localhost:3001${NC}"
    echo -e "${YELLOW}💡 Please start the backend with: cd backend && npm start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend is running${NC}"

# Check jq installation
check_jq

# Test 1: Health Check
test_endpoint "GET" "http://localhost:3001/health" "" "Health Check"

# Test 2: Get initial statistics
test_endpoint "GET" "http://localhost:3001/stats" "" "Initial Statistics"

# Test 3: Send click event
test_endpoint "POST" "http://localhost:3001/events" '{"eventType": "click", "userId": "test_user_english"}' "Click Event"

# Test 4: Send view event
test_endpoint "POST" "http://localhost:3001/events" '{"eventType": "view", "userId": "test_user_english"}' "View Event"

# Test 5: Send signup event
test_endpoint "POST" "http://localhost:3001/events" '{"eventType": "signup", "userId": "test_user_english"}' "Signup Event"

# Wait for Kafka to process messages
echo -e "\n${YELLOW}⏳ Waiting 2 seconds for Kafka to process messages...${NC}"
sleep 2

# Test 6: Get updated statistics
test_endpoint "GET" "http://localhost:3001/stats" "" "Updated Statistics"

# Test 7: Error handling - Invalid event type
echo -e "\n${YELLOW}🧪 Testing error handling...${NC}"
test_endpoint "POST" "http://localhost:3001/events" '{"eventType": "invalid", "userId": "test_user"}' "Invalid Event Type (should fail)"

# Test 8: Error handling - Missing userId
test_endpoint "POST" "http://localhost:3001/events" '{"eventType": "click"}' "Missing User ID (should fail)"

echo -e "\n${GREEN}🎉 API Test completed!${NC}"
echo -e "${YELLOW}💡 Check the backend logs to see the event processing in real-time${NC}"
echo -e "${YELLOW}🌐 You can also test the frontend at http://localhost:5173${NC}"
echo -e "${YELLOW}🖥️  Visit Kafka UI at http://localhost:8080 to see the messages${NC}" 