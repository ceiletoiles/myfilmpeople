#!/bin/bash

# MyFilmPeople Cross-Browser Testing Script
# Run this script to test the website across different browsers

echo "🎬 MyFilmPeople - Cross-Browser Testing"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test URLs
BASE_URL="http://localhost:8000"
MAIN_PAGE="$BASE_URL/index.html"
PROFILE_PAGE="$BASE_URL/profile.html"
TEST_SUITE="$BASE_URL/test-suite.html"

echo -e "${BLUE}Testing URLs:${NC}"
echo "Main Page: $MAIN_PAGE"
echo "Profile Page: $PROFILE_PAGE"  
echo "Test Suite: $TEST_SUITE"
echo ""

# Function to test URL accessibility
test_url() {
    local url=$1
    local name=$2
    
    echo -n "Testing $name... "
    
    if curl -s --head "$url" | head -n 1 | grep -q "200 OK"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Test basic connectivity
echo -e "${YELLOW}🔍 Basic Connectivity Tests${NC}"
echo "================================"

test_url "$MAIN_PAGE" "Main Page"
test_url "$PROFILE_PAGE" "Profile Page"
test_url "$TEST_SUITE" "Test Suite"
test_url "$BASE_URL/assets/js/script.js" "Main JavaScript"
test_url "$BASE_URL/assets/js/profile.js" "Profile JavaScript"
test_url "$BASE_URL/assets/css/styles.css" "Main CSS"
test_url "$BASE_URL/assets/css/profile.css" "Profile CSS"

echo ""

# Browser-specific testing instructions
echo -e "${YELLOW}🌐 Manual Browser Testing${NC}"
echo "============================"
echo ""

echo -e "${BLUE}Chrome Testing:${NC}"
echo "1. Open Chrome and navigate to: $MAIN_PAGE"
echo "2. Open DevTools (F12)"
echo "3. Check Console for errors"
echo "4. Test responsive design (Ctrl+Shift+M)"
echo "5. Test all core functionality"
echo ""

echo -e "${BLUE}Firefox Testing:${NC}"
echo "1. Open Firefox and navigate to: $MAIN_PAGE"
echo "2. Open DevTools (F12)"
echo "3. Check Network tab for failed requests"
echo "4. Test responsive design"
echo "5. Verify localStorage functionality"
echo ""

echo -e "${BLUE}Safari Testing (if available):${NC}"
echo "1. Open Safari and navigate to: $MAIN_PAGE"
echo "2. Enable Develop menu (Safari > Preferences > Advanced)"
echo "3. Open Web Inspector"
echo "4. Test all functionality"
echo ""

echo -e "${BLUE}Edge Testing:${NC}"
echo "1. Open Edge and navigate to: $MAIN_PAGE"
echo "2. Open DevTools (F12)"
echo "3. Test compatibility with Chromium engine"
echo ""

# Automated test runner
echo -e "${YELLOW}🤖 Automated Testing${NC}"
echo "==================="
echo ""

echo "To run automated tests:"
echo "1. Navigate to: $TEST_SUITE"
echo "2. Click 'Run All Tests'"
echo "3. Review results for any failures"
echo ""

# Performance testing
echo -e "${YELLOW}📊 Performance Testing${NC}"
echo "======================"
echo ""

echo "Performance testing steps:"
echo "1. Open Chrome DevTools"
echo "2. Go to Lighthouse tab"
echo "3. Run audit for Performance, Accessibility, Best Practices"
echo "4. Aim for scores > 90 in all categories"
echo ""

# Mobile testing
echo -e "${YELLOW}📱 Mobile Testing${NC}"
echo "=================="
echo ""

echo "Mobile device testing:"
echo "1. Use Chrome DevTools Device Mode"
echo "2. Test these screen sizes:"
echo "   - iPhone SE (375px)"
echo "   - iPhone 12 (390px)"
echo "   - iPad (768px)"
echo "   - Desktop (1200px+)"
echo "3. Verify touch targets are 44px+ minimum"
echo "4. Check text readability"
echo ""

# Accessibility testing
echo -e "${YELLOW}♿ Accessibility Testing${NC}"
echo "======================="
echo ""

echo "Accessibility testing tools:"
echo "1. Chrome DevTools Lighthouse (Accessibility audit)"
echo "2. axe DevTools browser extension"
echo "3. WAVE Web Accessibility Evaluator"
echo "4. Manual keyboard navigation testing"
echo ""

# Final checklist
echo -e "${YELLOW}✅ Final Testing Checklist${NC}"
echo "=========================="
echo ""

cat << 'EOF'
Core Functionality:
□ Tab navigation works (Directors/Actors/Others)
□ Add Person modal opens and functions
□ Search functionality works in each tab
□ Sort options work (A-Z, Z-A, Random)
□ Profile pages load correctly
□ Notes modal displays and functions
□ Data persists after page refresh

Error Handling:
□ API failures show appropriate messages
□ Form validation prevents invalid submissions
□ Network errors don't break the app
□ Graceful degradation when TMDb unavailable

Performance:
□ Page loads in < 1 second
□ No memory leaks after extended use
□ Smooth animations and transitions
□ Responsive to user interactions

Cross-Browser:
□ Works in Chrome (latest)
□ Works in Firefox (latest)
□ Works in Safari (if available)
□ Works in Edge (latest)

Mobile/Responsive:
□ Functions on mobile devices
□ Touch targets are appropriately sized
□ Text remains readable at all screen sizes
□ No horizontal scrolling required

Accessibility:
□ Can navigate with keyboard only
□ Screen reader compatible
□ Good color contrast
□ Proper focus indicators
EOF

echo ""
echo -e "${GREEN}🎯 Testing Complete!${NC}"
echo "Review all checklist items and address any issues found."
echo ""
echo "For automated testing, visit: $TEST_SUITE"