const usernameSpan = document.getElementById('username');
const incomeEl = document.getElementById('income');
const outcomeEl = document.getElementById('outcome');
const balanceEl = document.getElementById('balance');
const currentMonthYear = document.getElementById('currentMonthYear');
const addTransactionForm = document.getElementById('addTransactionForm');
const transactionList = document.getElementById('transactionList');
const addMessageDiv = document.getElementById('addMessage');

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = (TODAY.getMonth() + 1).toString().padStart(2, '0');

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

const checkAuth = async () => {
    try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error();
        const { success, data } = await response.json();
        if (success) {
            usernameSpan.textContent = data.username;
            return data;
        }
        window.location.href = '../login/';
    } catch (error) {
        window.location.href = '../login/';
        return null;
    }
};

const fetchTransactions = async (year, month) => {
    currentMonthYear.textContent = `${month} / ${year}`;
    transactionList.innerHTML = `<div class="loading">Refining logs...</div>`;

    try {
        const response = await fetch(`/api/transactions?year=${year}&month=${month}`);
        const { success, data, summary } = await response.json();

        if (success) {
            incomeEl.textContent = formatRupiah(summary.totalIncome);
            outcomeEl.textContent = formatRupiah(summary.totalOutcome);
            balanceEl.textContent = formatRupiah(summary.balance);

            transactionList.innerHTML = '';
            if (data.length === 0) {
                transactionList.innerHTML = '<div class="loading">No activities recorded yet.</div>';
                return;
            }

            data.forEach((t) => {
                const isIncome = t.status === 'income';
                const icon = isIncome ? '↓' : '↑';
                const colorClass = isIncome ? 'text-green' : 'text-red';
                const circleClass = isIncome ? 'icon-in' : 'icon-out';

                const div = document.createElement('div');
                div.className = 'transaction-item';
                div.innerHTML = `
        <div class="item-left">
            <div class="icon-circle ${circleClass}">${icon}</div>
            <div class="info-text">
                <span class="desc">${t.description || 'Activity'}</span>
                <span class="date">${t.transactionDate}</span>
            </div>
        </div>
        <div class="item-right">
            <span class="amt-val ${colorClass}">${isIncome ? '+' : '-'}${formatRupiah(t.nominal)}</span>
            <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                🗑
            </button>
        </div>
    `;
                transactionList.appendChild(div);
            });
        }
    } catch (error) {
        transactionList.innerHTML = '<div class="loading">Error syncing data.</div>';
    }
};

addTransactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nominal = document.getElementById('nominal').value;
    const transactionDate = document.getElementById('date').value;
    const status = document.getElementById('status').value;
    const description = document.getElementById('description').value;

    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nominal: parseFloat(nominal), transactionDate, status, description }),
            credentials: "include"
        });
        const { success } = await response.json();

        if (success) {
            addMessageDiv.innerHTML = '<p style="color: var(--green); font-size: 12px; margin-bottom: 15px; font-weight: 800;">✓ Transaction Secured</p>';
            addTransactionForm.reset();
            fetchTransactions(CURRENT_YEAR, CURRENT_MONTH);
        }
    } catch (error) {
        addMessageDiv.textContent = 'Failed to save.';
    }
});

(async () => {
    const user = await checkAuth();
    if (user) fetchTransactions(CURRENT_YEAR, CURRENT_MONTH);
})();

document.getElementById('filter').addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById('inputFilter').value;
    if (val) {
        const [year, month] = val.split("-");
        fetchTransactions(year, month);
    }
});

document.getElementById('reset').addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById('inputFilter').value = "";
    fetchTransactions(CURRENT_YEAR, CURRENT_MONTH);
});

window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            credentials: "include"
        });
        const { success } = await response.json();

        if (success) {
            // Refresh data setelah berhasil hapus
            fetchTransactions(CURRENT_YEAR, CURRENT_MONTH);
        } else {
            alert("Failed to delete transaction.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("Network error while deleting.");
    }
};