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

    updateTransaction(id, description, amount, category) {
        const transaction = this.getTransactionById(parseInt(id));
        if (transaction) {
            // Update fields that are provided and valid
            if (description.trim()) {
                transaction.description = description;
            }
            if (!isNaN(amount) && amount !== "") {
                transaction.amount = parseFloat(amount);
            }
            if (category) {
                transaction.category = category;
            }
    
            this.updateExpenses();
            this.updateIncomeAndExpenses();
            this.saveTransactions();
    
            return transaction;
        }
        return null;
    }


    

    getTransactionById(id) {
        return this.transactions.find(t => t.id === id);
    }

    getChartData() {
        const categories = Object.keys(this.expensesByCategory);

        const colors = categories.map(() => `#${Math.floor(Math.random()*16777215).toString(16)}`);

        return {
            labels: categories,
            datasets: [{
                label: 'Expenses',
                data: categories.map(cat => this.expensesByCategory[cat]),
                backgroundColor: colors,
                borderColor: colors,
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
}

// Initialize Budget Tracker
let budgetTracker = new BudgetTracker();
let chart;

// Event listener for adding a transaction
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value); // Ensure the amount is parsed as a float
    const category = document.getElementById('category').value;

    if (description && !isNaN(amount) && category) {
        const transaction = budgetTracker.addTransaction(description, amount, category);
        updateTransactionTable();
        updateChart();
        this.reset();  // Reset form after submission
    } else {
        alert('Please fill out all fields.');
    }
});

// Function to update the transaction table
function updateTransactionTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';
    
    budgetTracker.transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', transaction.id);
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.date.toLocaleDateString()}</td>
            <td>${transaction.description}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td>${transaction.category}</td>
            <td>
                <button class="text-blue-600 hover:text-blue-800 mr-2" onclick="openEditTransactionModal(${transaction.id})">Edit</button>
                <button class="text-red-600 hover:text-red-800" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Function to update the chart data
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
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: 'Expenses by Category' },
                }
            }
        });
    }
}

// Delete transaction
function deleteTransaction(id) {
    budgetTracker.deleteTransaction(id);
    updateTransactionTable();
    updateChart();
}

// Edit transaction modal logic
function openEditTransactionModal(id) {
    const transaction = budgetTracker.getTransactionById(parseInt(id));
    if (transaction) {
        document.getElementById('modalEditDescription').value = transaction.description;
        document.getElementById('modalEditAmount').value = transaction.amount.toFixed(2);

        // Clear and populate the modal's category dropdown
        const modalCategorySelect = document.getElementById('modalEditCategory');
        modalCategorySelect.innerHTML = ''; // Clear the existing options

        // Add categories to the modal's dropdown
        budgetTracker.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === transaction.category) {
                option.selected = true; // Set the current transaction's category as selected
            }
            modalCategorySelect.appendChild(option);
        });

        // Set the transaction ID to the Save button
        document.getElementById('saveEditTransaction').setAttribute('data-id', id);

        document.getElementById('modal-editTransaction').classList.remove('hidden');
    }
}


// Save edited transaction
document.getElementById('saveEditTransaction').addEventListener('click', () => {
    const id = document.getElementById('saveEditTransaction').getAttribute('data-id');
    const description = document.getElementById('modalEditDescription').value.trim();
    const amount = document.getElementById('modalEditAmount').value.trim();
    const category = document.getElementById('modalEditCategory').value;

    if (id && (description || amount || category)) {
        const updatedTransaction = budgetTracker.updateTransaction(parseInt(id), description, amount, category);
        if (updatedTransaction) {
            updateTransactionTable();
            updateChart();
            document.getElementById('modal-editTransaction').classList.add('hidden');
        } else {
            alert('Failed to update transaction. Please try again.');
        }
    } else {
        alert('Please fill out at least one field.');
    }
});





// Close edit transaction modal
document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('modal-editTransaction').classList.add('hidden');
});

// Add category modal logic
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

// Initial load
updateTransactionTable();
updateChart();
