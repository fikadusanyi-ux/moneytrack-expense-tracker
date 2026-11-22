const STORAGE_KEY = 'moneytrack-transactions-v1';
const categories = ['Food', 'Transport', 'Shopping', 'Education', 'Bills', 'Entertainment', 'Health', 'Salary', 'Other'];
const seedTransactions = [
  { id: 1, title: 'Groceries', category: 'Food', amount: 42.50, date: '2026-11-21', type: 'expense' },
  { id: 2, title: 'Bus fare', category: 'Transport', amount: 8.00, date: '2026-11-20', type: 'expense' },
  { id: 3, title: 'Part-time work', category: 'Salary', amount: 320.00, date: '2026-11-18', type: 'income' },
  { id: 4, title: 'Notebook', category: 'Education', amount: 12.75, date: '2026-11-16', type: 'expense' }
];

let transactions = loadTransactions();
let currentFilter = 'all';
let currentType = 'expense';

const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? seedTransactions : JSON.parse(saved);
  } catch {
    return seedTransactions;
  }
}
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function getTotals() {
  return transactions.reduce((totals, item) => {
    totals[item.type] += Number(item.amount);
    return totals;
  }, { income: 0, expense: 0 });
}
function renderSummary() {
  const totals = getTotals();
  const balance = totals.income - totals.expense;
  $('balance').textContent = money(balance);
  $('heroBalance').textContent = money(balance);
  $('income').textContent = money(totals.income);
  $('expenses').textContent = money(totals.expense);
  $('categoryTotal').textContent = money(totals.expense);
}
function categorySymbol(category, type) {
  if (type === 'income') return '＋';
  return ({ Food: '🍽', Transport: '↗', Education: '▤', Shopping: '◇', Bills: '▣', Entertainment: '♫', Health: '＋', Other: '◈' })[category] || '◈';
}
function renderTransactions() {
  const search = $('searchInput').value.trim().toLowerCase();
  const list = transactions
    .filter(item => currentFilter === 'all' || item.type === currentFilter)
    .filter(item => `${item.title} ${item.category}`.toLowerCase().includes(search))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!list.length) {
    $('transactionList').innerHTML = '<div class="empty-state"><div>◌</div><strong>No transactions found</strong><span>Try another search or add a transaction.</span></div>';
    return;
  }
  $('transactionList').innerHTML = list.map(item => `
    <div class="transaction-row">
      <div class="category-icon ${item.type === 'income' ? 'income' : item.category.toLowerCase()}">${categorySymbol(item.category, item.type)}</div>
      <div class="transaction-info"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.category)} · ${new Date(item.date + 'T12:00:00').toLocaleDateString()}</small></div>
      <strong class="${item.type === 'income' ? 'amount-in' : 'amount-out'}">${item.type === 'income' ? '+' : '−'}${money(Number(item.amount))}</strong>
      <button class="delete-btn" data-delete="${item.id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete transaction">×</button>
    </div>`).join('');
}
function renderCategories() {
  const totals = categories.map(category => ({
    category,
    total: transactions.filter(item => item.type === 'expense' && item.category === category)
      .reduce((sum, item) => sum + Number(item.amount), 0)
  })).filter(item => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  if (!totals.length) {
    $('categoryBars').innerHTML = '<div class="empty-chart">Add an expense to see your spending breakdown.</div>';
    return;
  }
  const max = Math.max(...totals.map(item => item.total));
  $('categoryBars').innerHTML = totals.map(item => `
    <div class="bar-item">
      <div class="bar-label"><span>${escapeHTML(item.category)}</span><strong>${money(item.total)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(5, item.total / max * 100)}%"></div></div>
    </div>`).join('');
}
function render() {
  renderSummary();
  renderTransactions();
  renderCategories();
}
function openModal() {
  $('formError').textContent = '';
  $('modalBackdrop').classList.remove('hidden');
  $('titleInput').focus();
}
function closeModal() {
  $('modalBackdrop').classList.add('hidden');
  $('transactionForm').reset();
  setTransactionType('expense');
}
function setTransactionType(type) {
  currentType = type;
  document.querySelectorAll('.type-toggle button').forEach(button => {
    const selected = button.dataset.type === type;
    button.classList.toggle('chosen', selected);
    button.classList.toggle('expense-choice', selected && type === 'expense');
    button.classList.toggle('income-choice', selected && type === 'income');
  });
}
function exportCSV() {
  const rows = [['Title', 'Category', 'Type', 'Amount', 'Date'], ...transactions.map(item =>
    [item.title, item.category, item.type, item.amount, item.date])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moneytrack-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function init() {
  $('monthLabel').textContent = '◷  ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('year').textContent = new Date().getFullYear();
  $('categoryInput').innerHTML = categories.map(category => `<option value="${category}">${category}</option>`).join('');
  $('dateInput').value = new Date().toISOString().slice(0, 10);
  render();

  $('addButton').addEventListener('click', openModal);
  $('sidebarAdd').addEventListener('click', openModal);
  $('closeModal').addEventListener('click', closeModal);
  $('cancelModal').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', event => {
    if (event.target === $('modalBackdrop')) closeModal();
  });
  document.querySelectorAll('.type-toggle button').forEach(button =>
    button.addEventListener('click', () => setTransactionType(button.dataset.type)));
  document.querySelectorAll('.filter-tabs button').forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-tabs button').forEach(item => item.classList.toggle('selected', item === button));
      renderTransactions();
    });
  });
  $('searchInput').addEventListener('input', renderTransactions);
  $('transactionList').addEventListener('click', event => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    const id = Number(button.dataset.delete);
    if (window.confirm('Delete this transaction?')) {
      transactions = transactions.filter(item => item.id !== id);
      saveTransactions();
      render();
    }
  });
  $('transactionForm').addEventListener('submit', event => {
    event.preventDefault();
    const title = $('titleInput').value.trim();
    const amount = Number($('amountInput').value);
    const date = $('dateInput').value;
    if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
      $('formError').textContent = 'Please enter a description, a valid amount, and a date.';
      return;
    }
    transactions.unshift({
      id: Date.now(),
      title,
      amount,
      category: $('categoryInput').value,
      date,
      type: currentType
    });
    saveTransactions();
    render();
    closeModal();
  });
  $('exportButton').addEventListener('click', exportCSV);
}

document.addEventListener('DOMContentLoaded', init);
