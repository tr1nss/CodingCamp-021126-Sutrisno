// ===== State Management =====
let expenses = [];
let budgetLimit = 0;
let chart = null;

// ===== DOM Elements =====
const expenseForm = document.getElementById('expenseForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const expenseList = document.getElementById('expenseList');
const totalBalanceElement = document.getElementById('totalBalance');
const balanceCard = document.getElementById('balanceCard');
const budgetStatusElement = document.getElementById('budgetStatus');
const themeToggle = document.getElementById('themeToggle');
const sortBySelect = document.getElementById('sortBy');
const budgetLimitInput = document.getElementById('budgetLimit');
const setBudgetButton = document.getElementById('setBudget');

// ===== Initialize App =====
function init() {
    loadFromLocalStorage();
    loadThemePreference();
    updateUI();
    setupEventListeners();
}

// ===== Event Listeners =====
function setupEventListeners() {
    expenseForm.addEventListener('submit', handleAddExpense);
    themeToggle.addEventListener('click', toggleTheme);
    sortBySelect.addEventListener('change', handleSortChange);
    setBudgetButton.addEventListener('click', handleSetBudget);
}

// ===== Handle Add Expense =====
function handleAddExpense(e) {
    e.preventDefault();

    const itemName = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;

    // Validation
    if (!itemName || !amount || !category) {
        alert('Please fill in all fields!');
        return;
    }

    if (amount <= 0) {
        alert('Amount must be greater than 0!');
        return;
    }

    // Create expense object
    const expense = {
        id: Date.now(),
        itemName,
        amount,
        category,
        date: new Date().toISOString()
    };

    // Add to expenses array
    expenses.push(expense);

    // Save to localStorage
    saveToLocalStorage();

    // Update UI
    updateUI();

    // Reset form
    expenseForm.reset();

    // Show success feedback
    showSuccessFeedback();
}

// ===== Handle Delete Expense =====
function handleDeleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveToLocalStorage();
        updateUI();
    }
}

// ===== Handle Set Budget =====
function handleSetBudget() {
    const limit = parseFloat(budgetLimitInput.value);
    
    if (!limit || limit <= 0) {
        alert('Please enter a valid budget limit!');
        return;
    }

    budgetLimit = limit;
    localStorage.setItem('budgetLimit', budgetLimit.toString());
    updateUI();
    
    // Show confirmation
    alert('Budget limit set to Rp ' + formatCurrency(budgetLimit));
}

// ===== Handle Sort Change =====
function handleSortChange() {
    const sortBy = sortBySelect.value;
    sortExpenses(sortBy);
    renderExpenseList();
}

// ===== Sort Expenses =====
function sortExpenses(sortBy) {
    switch (sortBy) {
        case 'date':
            expenses.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
            break;
        case 'amount-high':
            expenses.sort(function(a, b) { return b.amount - a.amount; });
            break;
        case 'amount-low':
            expenses.sort(function(a, b) { return a.amount - b.amount; });
            break;
        case 'category':
            expenses.sort(function(a, b) { return a.category.localeCompare(b.category); });
            break;
    }
}

// ===== Update UI =====
function updateUI() {
    renderExpenseList();
    updateTotalBalance();
    updateChart();
}

// ===== Render Expense List =====
function renderExpenseList() {
    if (expenses.length === 0) {
        expenseList.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense above! 📝</p>';
        return;
    }

    // Sort expenses based on current selection
    const sortBy = sortBySelect.value;
    sortExpenses(sortBy);

    var html = '';
    for (var i = 0; i < expenses.length; i++) {
        var expense = expenses[i];
        var isOverLimit = budgetLimit > 0 && expense.amount > (budgetLimit * 0.2);
        var overLimitClass = isOverLimit ? 'over-limit' : '';
        
        html += '<div class="expense-item ' + overLimitClass + '" data-id="' + expense.id + '">';
        html += '<div class="expense-info">';
        html += '<div class="expense-name">' + expense.itemName + '</div>';
        html += '<div class="expense-details">';
        html += '<span class="expense-amount">Rp ' + formatCurrency(expense.amount) + '</span>';
        html += '<span class="expense-category category-' + expense.category + '">' + getCategoryIcon(expense.category) + ' ' + expense.category + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<button class="btn-delete" data-id="' + expense.id + '">🗑️ Delete</button>';
        html += '</div>';
    }
    
    expenseList.innerHTML = html;

    // Add event listeners to delete buttons
    var deleteButtons = document.querySelectorAll('.btn-delete');
    for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].addEventListener('click', function() {
            var id = parseInt(this.getAttribute('data-id'));
            handleDeleteExpense(id);
        });
    }
}

// ===== Update Total Balance =====
function updateTotalBalance() {
    var total = 0;
    for (var i = 0; i < expenses.length; i++) {
        total += expenses[i].amount;
    }
    totalBalanceElement.textContent = 'Rp ' + formatCurrency(total);

    // Update budget status
    if (budgetLimit > 0) {
        var percentage = (total / budgetLimit) * 100;
        var remaining = budgetLimit - total;

        if (total > budgetLimit) {
            balanceCard.classList.add('over-budget');
            budgetStatusElement.textContent = '⚠️ Over budget by Rp ' + formatCurrency(Math.abs(remaining)) + ' (' + percentage.toFixed(1) + '%)';
        } else {
            balanceCard.classList.remove('over-budget');
            var remainingPercentage = 100 - percentage;
            budgetStatusElement.textContent = 'Budget: Rp ' + formatCurrency(budgetLimit) + ' | Remaining: Rp ' + formatCurrency(remaining) + ' (' + remainingPercentage.toFixed(1) + '%)';
        }
    } else {
        balanceCard.classList.remove('over-budget');
        budgetStatusElement.textContent = '';
    }
}

// ===== Update Chart =====
function updateChart() {
    var categoryTotals = {};
    for (var i = 0; i < expenses.length; i++) {
        var expense = expenses[i];
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
    }

    var categories = Object.keys(categoryTotals);
    var amounts = Object.values(categoryTotals);

    // If no expenses, show empty chart message
    if (categories.length === 0) {
        var ctx = document.getElementById('expenseChart');
        if (chart) {
            chart.destroy();
            chart = null;
        }
        ctx.style.display = 'none';
        document.querySelector('.chart-container').innerHTML = '<p class="empty-state">Add expenses to see the chart ▪</p>';
        document.getElementById('chartLegend').innerHTML = '';
        return;
    }

    // Show canvas if hidden
    var canvas = document.getElementById('expenseChart');
    canvas.style.display = 'block';
    if (document.querySelector('.chart-container p')) {
        document.querySelector('.chart-container').innerHTML = '<canvas id="expenseChart"></canvas>';
        canvas = document.getElementById('expenseChart');
    }

    var colors = {
        'Food': '#f56565',
        'Transport': '#4299e1',
        'Fun': '#9f7aea'
    };

    var backgroundColors = [];
    for (var i = 0; i < categories.length; i++) {
        backgroundColors.push(colors[categories[i]] || '#718096');
    }

    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }

    // Create new chart
    var ctx = canvas.getContext('2d');
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var label = context.label || '';
                            var value = context.parsed || 0;
                            var total = 0;
                            for (var i = 0; i < context.dataset.data.length; i++) {
                                total += context.dataset.data[i];
                            }
                            var percentage = ((value / total) * 100).toFixed(1);
                            return label + ': Rp ' + formatCurrency(value) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    // Update custom legend
    updateChartLegend(categories, amounts, backgroundColors);
}

// ===== Update Chart Legend =====
function updateChartLegend(categories, amounts, colors) {
    var total = 0;
    for (var i = 0; i < amounts.length; i++) {
        total += amounts[i];
    }
    
    var legendHTML = '';
    for (var i = 0; i < categories.length; i++) {
        var percentage = ((amounts[i] / total) * 100).toFixed(1);
        legendHTML += '<div class="legend-item">';
        legendHTML += '<div class="legend-color" style="background-color: ' + colors[i] + '"></div>';
        legendHTML += '<span class="legend-label">' + getCategoryIcon(categories[i]) + ' ' + categories[i] + ': ' + percentage + '%</span>';
        legendHTML += '</div>';
    }

    document.getElementById('chartLegend').innerHTML = legendHTML;
}

// ===== Theme Toggle =====
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    var isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update icon
    var themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    
    // Save preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    // Update chart if it exists
    if (chart) {
        updateChart();
    }
}

// ===== Load Theme Preference =====
function loadThemePreference() {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('.theme-icon').textContent = '☀️';
    }
}

// ===== Local Storage Functions =====
function saveToLocalStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function loadFromLocalStorage() {
    var savedExpenses = localStorage.getItem('expenses');
    var savedBudget = localStorage.getItem('budgetLimit');
    
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    }
    
    if (savedBudget) {
        budgetLimit = parseFloat(savedBudget);
        budgetLimitInput.value = budgetLimit;
    }
}

// ===== Helper Functions =====
function formatCurrency(amount) {
    return amount.toLocaleString('id-ID');
}

function getCategoryIcon(category) {
    var icons = {
        'Food': '🍔',
        'Transport': '🚗',
        'Fun': '🎮'
    };
    return icons[category] || '📦';
}

function showSuccessFeedback() {
    // Simple success animation on balance card
    balanceCard.style.transform = 'scale(1.05)';
    setTimeout(function() {
        balanceCard.style.transform = 'scale(1)';
    }, 200);
}

// ===== Initialize App on Load =====
document.addEventListener('DOMContentLoaded', init);
      
