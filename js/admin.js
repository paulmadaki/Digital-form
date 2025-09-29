// /js/admin.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://pkqboeleptkohyxgjuzk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU"
);

// Grab UI elements
const usersList = document.getElementById("usersList");
const withdrawalsList = document.getElementById("pendingWithdrawals");
const transactionsList = document.getElementById("transactionHistory");
const addAdminBtn = document.getElementById("addAdminBtn");
const removeAdminBtn = document.getElementById("removeAdminBtn");
const adminUidInput = document.getElementById("adminUidInput");
const accountsTable = document.getElementById("accountsTable");

// ✅ Ensure only logged-in admins can access
async function checkAdminAccess() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    alert("Please login first.");
    window.location.href = "/login.html";
    return null;
  }

  // Check if user is admin
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (userError) {
  // console.error("Error fetching user role:", userError.message);
    return null;
  }

  if (!userRow?.is_admin) {
    alert("You are not authorized to view this page.");
    window.location.href = "/dashboard.html";
    return null;
  }

  return user;
}

// ✅ Load all users
async function loadUsers() {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, full_name, email, earnings");

  if (error) {
  // console.error("Error loading users:", error.message);
    return;
  }

  usersList.innerHTML = "";

  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = `${user.full_name || "Unnamed"} (${user.id}) — ${user.email} — Earnings: $${user.earnings}`;
    usersList.appendChild(li);
  });
}

// ✅ Load all withdrawal requests
async function loadWithdrawals() {
  const { data: withdrawals, error } = await supabase
    .from("withdrawals")
    .select("id, user_id, full_name, amount, status, created_at");

  if (error) {
  // console.error("Error loading withdrawals:", error.message);
    return;
  }

  withdrawalsList.innerHTML = "";

  withdrawals.forEach((req) => {
    const li = document.createElement("li");
    li.className = "flex items-center justify-between py-2 border-b";

    let actionButtons = "";

    if (req.status === "pending") {
      actionButtons = `
        <button class="approve bg-green-600 text-white px-2 py-1 rounded" data-id="${req.id}">Approve</button>
        <button class="reject bg-red-600 text-white px-2 py-1 rounded" data-id="${req.id}">Reject</button>
      `;
    } else if (req.status === "approved") {
      actionButtons = `
        <button class="paid bg-blue-600 text-white px-2 py-1 rounded" data-id="${req.id}">Mark as Paid</button>
      `;
    }

    li.innerHTML = `
      <span>
        <strong>${req.full_name || "Unnamed"}</strong> (${req.user_id}) 
        | Amount: $${req.amount} 
        | Status: ${req.status}
        | Requested: ${new Date(req.created_at).toLocaleString()}
      </span>
      <div class="space-x-2">${actionButtons}</div>
    `;

    withdrawalsList.appendChild(li);
  });

  // Attach event listeners
  document.querySelectorAll(".approve").forEach((btn) =>
    btn.addEventListener("click", () => updateWithdrawal(btn.dataset.id, "approved"))
  );
  document.querySelectorAll(".reject").forEach((btn) =>
    btn.addEventListener("click", () => updateWithdrawal(btn.dataset.id, "rejected"))
  );
  document.querySelectorAll(".paid").forEach((btn) =>
    btn.addEventListener("click", () => updateWithdrawal(btn.dataset.id, "paid"))
  );
}

// ✅ Load transaction history
async function loadTransactions() {
  const { data: history, error } = await supabase
    .from("withdrawals")
    .select("id, user_id, full_name, amount, status, created_at")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
  // console.error("Error loading transactions:", error.message);
    return;
  }

  transactionsList.innerHTML = "";

  history.forEach((tx) => {
    const li = document.createElement("li");
    li.textContent = `${tx.full_name || "Unnamed"} (${tx.user_id}) — $${tx.amount} — ${tx.status.toUpperCase()} on ${new Date(tx.created_at).toLocaleString()}`;
    transactionsList.appendChild(li);
  });
}

// ✅ Update withdrawal status
async function updateWithdrawal(id, status, accountDetails = null) {
  const updateData = { status };

  if (accountDetails) {
    updateData.bank_name = accountDetails.bank_name;
    updateData.account_number = accountDetails.account_number;
    updateData.account_name = accountDetails.account_name;
  }

  const { error } = await supabase
    .from("withdrawals")
    .update(updateData)
    .eq("id", id);

  if (error) {
  // console.error("Error updating withdrawal:", error.message);
    alert("Failed to update withdrawal.");
  } else {
    alert(`Withdrawal ${status}.`);
    loadWithdrawals();
    loadTransactions();
  }
}

// ✅ Load all account details
async function loadAccountDetails() {
  const { data, error } = await supabase
    .from("account_details")
    .select("user_id, bank_name, account_number, account_name, created_at")
    .order("created_at", { ascending: false });

  accountsTable.innerHTML = "";

  if (error) {
  // console.error("Error fetching account details:", error.message);
    accountsTable.innerHTML = `<tr><td colspan="6" class="text-center text-red-600 p-2">Error loading data</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    accountsTable.innerHTML = `<tr><td colspan="6" class="text-center p-2">No account details found.</td></tr>`;
    return;
  }

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 border">${row.user_id}</td>
      <td class="p-2 border">${row.bank_name}</td>
      <td class="p-2 border">${row.account_number}</td>
      <td class="p-2 border">${row.account_name}</td>
      <td class="p-2 border">${new Date(row.created_at).toLocaleString()}</td>
      <td class="p-2 border space-x-2">
        <button class="copy bg-blue-600 text-white px-2 py-1 rounded" 
          data-bank="${row.bank_name}" 
          data-number="${row.account_number}" 
          data-name="${row.account_name}">
          Copy
        </button>
        <button class="attach bg-green-600 text-white px-2 py-1 rounded" 
          data-user="${row.user_id}" 
          data-bank="${row.bank_name}" 
          data-number="${row.account_number}" 
          data-name="${row.account_name}">
          Attach
        </button>
      </td>
    `;
    accountsTable.appendChild(tr);
  });

  // ✅ Copy button logic
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = `Bank: ${btn.dataset.bank}\nAccount Number: ${btn.dataset.number}\nAccount Name: ${btn.dataset.name}`;
      navigator.clipboard.writeText(text);
      alert("Account details copied to clipboard.");
    });
  });

  // ✅ Attach button logic
  document.querySelectorAll(".attach").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.user;

      const { data: pending, error } = await supabase
        .from("withdrawals")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1)
        .single();

      if (error || !pending) {
        alert("No pending withdrawal found for this user.");
        return;
      }

      const accountDetails = {
        bank_name: btn.dataset.bank,
        account_number: btn.dataset.number,
        account_name: btn.dataset.name,
      };

      updateWithdrawal(pending.id, "approved", accountDetails);
    });
  });
}

// ✅ Admin controls
addAdminBtn.addEventListener("click", async () => {
  const uid = adminUidInput.value.trim();
  if (!uid) return;

  const { error } = await supabase.from("users").update({ is_admin: true }).eq("id", uid);

  if (error) {
    alert("Error making admin: " + error.message);
  } else {
    alert("User promoted to admin.");
    loadUsers();
  }
});

removeAdminBtn.addEventListener("click", async () => {
  const uid = adminUidInput.value.trim();
  if (!uid) return;

  const { error } = await supabase.from("users").update({ is_admin: false }).eq("id", uid);

  if (error) {
    alert("Error removing admin: " + error.message);
  } else {
    alert("User removed from admins.");
    loadUsers();
  }
});

// ✅ Initialize page
(async function init() {
  const user = await checkAdminAccess();
  if (!user) return;

  loadUsers();
  loadWithdrawals();
  loadTransactions();
  loadAccountDetails();
})();
