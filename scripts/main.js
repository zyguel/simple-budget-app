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
        const transaction = this.getTransactionById(id);
        if (transaction) {
            this.expensesByCategory[transaction.category] -= transaction.amount;
            if (this.expensesByCategory[transaction.category] <= 0) {
                delete this.expensesByCategory[transaction.category];
            }
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.updateIncomeAndExpenses();
            this.saveTransactions();
        }
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
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        };
    }

    loadCategories() {
        const storedCategories = localStorage.getItem('categories');
        if (storedCategories) {
            this.categories = JSON.parse(storedCategories);
        }
        this.updateCategoryDropdown();
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    updateCategoryDropdown() {
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    addCategory(category) {
        if (category && !this.categories.includes(category)) {
            this.categories.push(category);
            this.saveCategories();
            this.updateCategoryDropdown();
        }
    }

    getTransactionById(id) {
        return this.transactions.find(t => t.id === id);
    }

    updateTransaction(id, description, amount, category) {
        const transaction = this.getTransactionById(id);
        if (transaction) {
            // Adjust category spending
            this.expensesByCategory[transaction.category] -= transaction.amount;
            if (this.expensesByCategory[transaction.category] <= 0) {
                delete this.expensesByCategory[transaction.category];
            }
    
            // Update transaction details
            transaction.description = description;
            transaction.amount = parseFloat(amount);
            transaction.category = category;
    
            // Update expenses and income
            this.expensesByCategory[category] = (this.expensesByCategory[category] || 0) + transaction.amount;
            this.updateIncomeAndExpenses();
            this.saveTransactions();
        }
    }
    
}

// Initialize Budget Tracker
const budgetTracker = new BudgetTracker();
let chart;

// Function to update transaction table
function updateTransactionTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';
    
    budgetTracker.getTransactions().forEach(transaction => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', transaction.id);
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.date.toLocaleDateString()}</td>
            <td>${transaction.description}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td>${transaction.category}</td>
            <td>
                <button class="text-blue-600 hover:text-blue-800 mr-2" onclick="editTransaction(${transaction.id})">Edit</button>
                <button class="text-red-600 hover:text-red-800" onclick="deleteTransaction(${transaction.id})">Delete</button>
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
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
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
    document.querySelector(`tr[data-id="${id}"]`).remove();
    updateChart();
}

// Function to edit a transaction
function editTransaction(id) {
    const transaction = budgetTracker.getTransactionById(id);
    if (transaction) {
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount.toFixed(2);
        document.getElementById('category').value = transaction.category;
        document.getElementById('transactionForm').setAttribute('data-edit-id', id);
        document.getElementById('addTransaction').textContent = 'Update Transaction';
    }
}

// Handle form submission
document.getElementById('transactionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    
    const description = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const editId = document.getElementById('transactionForm').getAttribute('data-edit-id');

    if (description && amount && category) {
        try {
            if (editId) {
                budgetTracker.updateTransaction(editId, description, amount, category);
                document.getElementById('transactionForm').removeAttribute('data-edit-id');
                document.getElementById('addTransaction').textContent = 'Add Transaction';
            } else {
                budgetTracker.addTransaction(description, amount, category);
            }

            document.getElementById('description').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('category').value = '';

            updateTransactionTable();
            updateChart();
        } catch (error) {
            console.error("Error handling transaction:", error);
            alert("Failed to handle transaction. Please check your inputs.");
        }
    } else {
        alert('Please fill out all fields before submitting.');
    }
});


// Handle opening and closing of the modal
document.getElementById('openModal').addEventListener('click', () => {
    document.getElementById('modal-addCategory').classList.remove('hidden');
});

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('modal-addCategory').classList.add('hidden');
});

document.getElementById('saveCategory').addEventListener('click', () => {
    const newCategory = document.getElementById('modalNewCategory').value.trim();
    if (newCategory) {
        budgetTracker.addCategory(newCategory);
        document.getElementById('modalNewCategory').value = '';
        document.getElementById('modal-addCategory').classList.add('hidden');
    } else {
        alert('Please enter a category name.');
    }
});

// Initial Render
updateTransactionTable();
updateChart();
