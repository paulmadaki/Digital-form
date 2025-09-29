// /js/dashboard.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pkqboeleptkohyxgjuzk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Grab UI elements
const fullNameEl = document.getElementById("fullName");
const emailEl = document.getElementById("email");
const whatsappEl = document.getElementById("whatsapp");
const formStatusEl = document.getElementById("formStatus");
const refCountEl = document.getElementById("refCount");
const earningsEl = document.getElementById("earnings");
const referralLinkEl = document.getElementById("referralLink");
const withdrawSection = document.getElementById("withdrawSection");
const withdrawBtn = document.getElementById("withdrawBtn");
const withdrawAmountInput = document.getElementById("withdrawAmount");
const logoutBtn = document.getElementById("logoutBtn");
const transactionHistoryEl = document.getElementById("transactionHistory"); 
let currentProfile = null;

/* ===============================
   SPINNER HELPERS
   =============================== */
function showSpinner() {
  const spinner = document.getElementById("spinner");
  if (spinner) spinner.style.display = "flex";
}
function hideSpinner() {
  const spinner = document.getElementById("spinner");
  if (spinner) spinner.style.display = "none";
}

/* ===============================
   LOAD USER DASHBOARD
   =============================== */
async function loadDashboard() {
  showSpinner();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    hideSpinner();
    alert("You must log in first.");
    window.location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    hideSpinner();
  // console.error("Profile fetch error:", profileError);
    alert("Error fetching profile.");
    return;
  }

  if (!profile) {
    hideSpinner();
    alert("No profile found. Please complete signup.");
    window.location.href = "form.html";
    return;
  }

  currentProfile = profile;

  // Fill UI
  fullNameEl.textContent = profile.full_name || "N/A";
  emailEl.textContent = profile.email || user.email || "N/A";
  whatsappEl.textContent = profile.whatsapp || "N/A";
  formStatusEl.textContent = profile.form_purchased ? "✅ Purchased" : "❌ Not Purchased";
  refCountEl.textContent = profile.ref_count || 0;
  earningsEl.textContent = (Number(profile.earnings || 0)).toFixed(2);

  // Referral link
  if (profile.referral_code) {
    const refLink = `${window.location.origin}/form.html?ref=${profile.referral_code}`;
    referralLinkEl.textContent = refLink;
    referralLinkEl.href = refLink;
  } else {
    referralLinkEl.textContent = "—";
    referralLinkEl.removeAttribute("href");
  }

  if ((profile.earnings || 0) >= 5) {
    withdrawSection?.classList?.remove("hidden");
  }

  await loadTransactionHistory(user.id);
  subscribeToWithdrawals(user.id); // ✅ subscribe for live status updates

  hideSpinner();
}

/* ===============================
   WITHDRAW EARNINGS
   =============================== */
withdrawBtn?.addEventListener("click", async () => {
  const amount = parseFloat(withdrawAmountInput?.value);

  if (isNaN(amount) || amount <= 0) {
    alert("⚠️ Please enter a valid amount.");
    return;
  }
  if (amount > (currentProfile?.earnings || 0)) {
    alert("⚠️ You cannot withdraw more than your available balance.");
    return;
  }
  if (amount < 5) {
    alert("⚠️ Minimum withdrawal amount is $5.");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from("withdrawals").insert({
    user_id: user.id,
    full_name: currentProfile.full_name || "Unknown",
    amount,
    status: "pending"
  });

  if (insertError) {
  // console.error("Withdrawal insert error:", insertError);
    alert("❌ Failed to submit withdrawal request.");
    return;
  }

  const newBalance = (currentProfile.earnings || 0) - amount;
  const { error: updateError } = await supabase
    .from("users")
    .update({ earnings: newBalance })
    .eq("id", user.id);

  if (updateError) {
  // console.error("Earnings update error:", updateError);
    alert("❌ Withdrawal saved but failed to update balance.");
    return;
  }

  currentProfile.earnings = newBalance;
  earningsEl.textContent = newBalance.toFixed(2);
  withdrawAmountInput.value = "";

  if (newBalance < 5) {
    withdrawSection?.classList?.add("hidden");
  }

  alert(`📤 Withdrawal of $${amount.toFixed(2)} submitted successfully, you will receive your funds after approval.`);

  loadTransactionHistory(user.id);
});

/* ===============================
   LOAD TRANSACTION HISTORY
   =============================== */
async function loadTransactionHistory(userId) {
  if (!transactionHistoryEl) return;

  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
  // console.error("Transaction fetch error:", error);
    transactionHistoryEl.innerHTML = "<p class='text-red-500'>Failed to load history.</p>";
    return;
  }

  if (!data || data.length === 0) {
    transactionHistoryEl.innerHTML = "<p>No transactions yet.</p>";
    return;
  }

  transactionHistoryEl.innerHTML = `
    <table class="w-full border text-sm">
      <thead class="bg-gray-100">
        <tr>
          <th class="border p-2">Amount</th>
          <th class="border p-2">Status</th>
          <th class="border p-2">Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(tx => `
          <tr>
            <td class="border p-2">$${Number(tx.amount).toFixed(2)}</td>
            <td class="border p-2">${tx.status}</td>
            <td class="border p-2">${new Date(tx.created_at).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ===============================
   LIVE WITHDRAWAL STATUS UPDATES
   =============================== */
function subscribeToWithdrawals(userId) {
  supabase
    .channel("withdrawals-changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "withdrawals", filter: `user_id=eq.${userId}` },
      (payload) => {
        const updated = payload.new;
        if (updated.status === "paid") {
          alert(`✅ Your withdrawal of $${updated.amount} has been marked as PAID! Check your bank account.`);
          loadTransactionHistory(userId);
        }
      }
    )
    .subscribe();
}

/* ===============================
   LOGOUT
   =============================== */
logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

/* ===============================
   RUN
   =============================== */
loadDashboard();
