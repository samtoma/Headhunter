#!/bin/bash
# Script to run Cypress tests multiple times to check for flakiness
# Usage: ./run_tests_multiple_times.sh [number_of_runs]

RUNS=${1:-5}  # Default to 5 runs if not specified
PASS_COUNT=0
FAIL_COUNT=0
RESULTS_FILE="test_results_$(date +%Y%m%d_%H%M%S).txt"

echo "Running Cypress tests $RUNS times..." | tee "$RESULTS_FILE"
echo "=================================" | tee -a "$RESULTS_FILE"

for i in $(seq 1 $RUNS); do
    echo "" | tee -a "$RESULTS_FILE"
    echo "Run $i of $RUNS" | tee -a "$RESULTS_FILE"
    echo "-------------------" | tee -a "$RESULTS_FILE"
    
    # Run the tests and capture exit code
    docker exec headhunter_frontend npx cypress run --spec "cypress/e2e/auth.cy.js" > "run_${i}.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ PASS" | tee -a "$RESULTS_FILE"
        ((PASS_COUNT++))
    else
        echo "❌ FAIL (Exit code: $EXIT_CODE)" | tee -a "$RESULTS_FILE"
        ((FAIL_COUNT++))
        # Save failed run log
        cp "run_${i}.log" "failed_run_${i}.log"
    fi
done

echo "" | tee -a "$RESULTS_FILE"
echo "=================================" | tee -a "$RESULTS_FILE"
echo "Final Results:" | tee -a "$RESULTS_FILE"
echo "  Passed: $PASS_COUNT / $RUNS" | tee -a "$RESULTS_FILE"
echo "  Failed: $FAIL_COUNT / $RUNS" | tee -a "$RESULTS_FILE"

# Calculate success rate
SUCCESS_RATE=$((PASS_COUNT * 100 / RUNS))
echo "  Success Rate: $SUCCESS_RATE%" | tee -a "$RESULTS_FILE"

# Clean up individual run logs (keep failed ones)
rm -f run_*.log

echo "" | tee -a "$RESULTS_FILE"
echo "Results saved to: $RESULTS_FILE" | tee -a "$RESULTS_FILE"

if [ $FAIL_COUNT -gt 0 ]; then
    echo "Failed run logs saved as: failed_run_*.log" | tee -a "$RESULTS_FILE"
fi

# Exit with failure if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi
