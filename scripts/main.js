// Data Structures
class Transaction {
    constructor(id, date, description, amount, category) {
        this.id = id;
        this.date = new Date(date);
        this.description = description;
        this.amount = parseFloat(amount);
        this.category = category;
    }
}

class BudgetTracker {
    constructor() {
        this.transactions = [];
        this.expensesByCategory = {};
        this.income = 0;
        this.expensesTotal = 0;
        this.currentId = 0;
        this.categories = ["Housing", "Transportation", "Food", "Entertainment", "Utilities", "Miscellaneous"];

        // Load transactions and categories from localStorage
        this.loadTransactions();
        this.loadCategories();
    }

    loadTransactions() {
        const storedData = localStorage.getItem('budgetTracker');
        if (storedData) {
            const data = JSON.parse(storedData);
            this.transactions = data.transactions.map(t => new Transaction(t.id, t.date, t.description, t.amount, t.category));
            this.currentId = data.currentId;
            this.updateExpenses();
        }
    }

    saveTransactions() {
        const data = {
            transactions: this.transactions,
            currentId: this.currentId
        };
        localStorage.setItem('budgetTracker', JSON.stringify(data));
    }

    addTransaction(description, amount, category) {
        this.currentId++;
        const transaction = new Transaction(this.currentId, new Date(), description, amount, category);
        this.transactions.push(transaction);
        this.expensesByCategory[category] = (this.expensesByCategory[category] || 0) + transaction.amount;
        this.updateIncomeAndExpenses();
        this.saveTransactions();
        return transaction;
    }

    updateIncomeAndExpenses() {
        this.income = this.transactions.reduce((sum, t) => sum + t.amount, 0);
        this.expensesTotal = Object.values(this.expensesByCategory).reduce((sum, expense) => sum + expense, 0);
    }

    updateExpenses() {
        this.expensesByCategory = {};
        this.transactions.forEach(t => {
            this.expensesByCategory[t.category] = (this.expensesByCategory[t.category] || 0) + t.amount;
        });
    }

    getTransactions() {
        return [...this.transactions];
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.updateExpenses();
        this.saveTransactions();
    }

    getChartData() {
        const categories = Object.keys(this.expensesByCategory).sort((a, b) => this.expensesByCategory[b] - this.expensesByCategory[a]);

        // Function to generate random color
        const getRandomColor = () => {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        };

        // Generate random colors for each category
        const colors = categories.map(() => getRandomColor());

        return {
            labels: categories,
            datasets: [{
                label: 'Expenses',
                data: categories.map(cat => this.expensesByCategory[cat]),
                backgroundColor: colors, // Use random colors
                borderColor: colors.map(color => color.replace('0.8', '1')), // Slightly different border color
                borderWidth: 1
            }]
        };
    }

    // Load categories from localStorage
    loadCategories() {
        const storedCategories = localStorage.getItem('categories');
        if (storedCategories) {
            this.categories = JSON.parse(storedCategories);
        }
        this.updateCategoryDropdown();
    }

    // Save categories to localStorage
    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    // Update the category dropdown
    updateCategoryDropdown() {
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Select Category</option>'; // Reset dropdown

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    // Add a new custom category
    addCategory(category) {
        if (category && !this.categories.includes(category)) {
            this.categories.push(category);
            this.saveCategories();
            this.updateCategoryDropdown();
        }
    }
}

// Initialize Budget Tracker
const budgetTracker = new BudgetTracker();
let chart;

// Function to update transaction table
function updateTransactionTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = ''; // Clear existing rows
    
    budgetTracker.getTransactions().forEach(transaction => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', transaction.id); // Add data-id attribute
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.date.toLocaleDateString()}</td>
            <td>${transaction.description}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td>${transaction.category}</td>
            <td>
                <button class="text-red-600 hover:text-red-800 mr-2" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Function to update chart data
function updateChart() {
    const chartData = budgetTracker.getChartData();
    if (chart) {
        chart.data = chartData;
        chart.update();
    } else {
        const ctx = document.getElementById('myChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'doughnut', // Change to 'pie' for a pie chart
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to fill container
                plugins: {
                    legend: {
                        display: true,
                        position: 'top', // Position of the legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.label}: $${tooltipItem.raw.toFixed(2)}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Expenses by Category'
                    }
                }
            }
        });
    }
}

// Function to delete a transaction
function deleteTransaction(id) {
    budgetTracker.deleteTransaction(id);
    
    // Remove the row from the table
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) row.remove();
    
    // Update chart data
    updateChart();
}

// Handle form submission
document.getElementById('transactionForm').addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    
    const description = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const newCategory = document.getElementById('newCategory').value.trim();
    
    console.log("Attempting to add transaction:", description, amount, category);

    if (description && amount && category) {
        try {
            if (newCategory) {
                budgetTracker.addCategory(newCategory);
                document.getElementById('newCategory').value = ''; // Clear new category input
            }

            const transaction = budgetTracker.addTransaction(description, amount, category);
            console.log(`Added transaction: ${JSON.stringify(transaction)}`);

            // Clear form fields
            document.getElementById('description').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('category').value = '';

            // Update transaction table
            updateTransactionTable();

            // Update chart data
            updateChart();
        } catch (error) {
            console.error("Error adding transaction:", error);
            alert("Failed to add transaction. Please check your inputs.");
        }
    } else {
        console.log("Not all fields were filled");
        alert('Please fill out all fields before adding a transaction.');
    }

    console.log("Current transactions:", budgetTracker.getTransactions());
});

// Initialize UI on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Populate transaction table
    updateTransactionTable();

    // Initialize chart
    updateChart();
});
