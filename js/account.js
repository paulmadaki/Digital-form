// /js/account.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- Supabase Config ---------------- */
const supabaseUrl = "https://pkqboeleptkohyxgjuzk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU";
const supabase = createClient(supabaseUrl, supabaseKey);

/* ---------------- Form Handling ---------------- */
const form = document.getElementById("accountForm");
const messageEl = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const bank = document.getElementById("bank").value;
  const accountNumber = document.getElementById("accountNumber").value;
  const accountName = document.getElementById("accountName").value;

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    messageEl.textContent = "You must be logged in to submit account details.";
    messageEl.className = "text-red-600 text-center mt-4";
    return;
  }

  const { error } = await supabase
    .from("account_details")
    .upsert({
      user_id: user.id,
      bank_name: bank,
      account_number: accountNumber,
      account_name: accountName
    }, { onConflict: "user_id" });

  if (error) {
  // console.error(error);
    messageEl.textContent = "Error saving details. Try again.";
    messageEl.className = "text-red-600 text-center mt-4";
  } else {
    messageEl.textContent = "Account details saved successfully!";
    messageEl.className = "text-green-600 text-center mt-4";
    form.reset();
  }
});
