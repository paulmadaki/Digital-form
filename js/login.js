// /js/login.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Replace with your Supabase project details
const SUPABASE_URL = "https://pkqboeleptkohyxgjuzk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Grab elements
const loginForm = document.getElementById("loginForm");
const forgotPasswordLink = document.getElementById("forgotPassword");

// ✅ Handle login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("⚠ Please enter both email and password.");
    return;
  }

  try {
    // Step 1: Try signing in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // ✅ Explain common login errors clearly
      if (error.message.includes("Invalid login credentials")) {
        alert("❌ Incorrect email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        alert("⚠ Your email is not verified. Please check your inbox.");
      } else {
        alert("❌ Login failed: " + error.message);
      }
      console.error("Login error:", error);
      return;
    }

    const user = data.user;
    console.log("✅ Logged in:", user);

    // Step 2: Fetch user role from 'users' table
    const { data: profile, error: roleError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (roleError) {
      if (roleError.message.includes("column")) {
        alert("⚠ User profile is missing 'is_admin' field. Contact support.");
      } else {
        alert("❌ Could not verify your role. Try again later.");
      }
      console.error("Role check error:", roleError);
      return;
    }

    // Step 3: Redirect based on role
    if (profile?.is_admin) {
      alert("✅ Welcome Admin!");
      window.location.href = "admin.html";
    } else {
      alert("✅ Login successful!");
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    // ✅ Explain network & unexpected errors
    if (err.message?.includes("Failed to fetch")) {
      alert("🌐 Network error: Unable to reach server. Please check your internet.");
    } else {
      alert("❌ Unexpected error: " + (err.message || err));
    }
    console.error("Unexpected login error:", err);
  }
});

// ✅ Handle Forgot Password
forgotPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  if (!email) {
    alert("⚠ Please enter your email first.");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:5500/reset-password.html", // change to your hosted reset page
  });

  if (error) {
    alert("❌ Could not send reset link: " + error.message);
    console.error("Reset password error:", error);
    return;
  }

  alert("📩 Password reset link sent to " + email);
});
/* ------------------ End of login handling ------------------ */

/* Notes:
 - Explains wrong password, unverified email, missing table column, and network issues.
 - Shows friendly alerts to users while still logging details in console for you.
 - Forgot Password also has better error handling now.
*/
