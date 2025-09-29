import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pkqboeleptkohyxgjuzk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const form = document.getElementById("editProfileForm");
const fullNameInput = document.getElementById("full_name");
const whatsappInput = document.getElementById("whatsapp");
const locationInput = document.getElementById("location");

let currentUserId = null;

// Load profile into form
async function loadProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    alert("⚠️ You must log in first.");
    window.location.href = "login.html";
    return;
  }

  currentUserId = user.id;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
  // console.error("Profile fetch error:", profileError);
    alert("Error loading profile.");
    return;
  }

  if (profile) {
    fullNameInput.value = profile.full_name || "";
    whatsappInput.value = profile.whatsapp || "";
    locationInput.value = profile.location || "";
  }
}

// Save changes
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUserId) return;

  const updates = {
    full_name: fullNameInput.value.trim(),
    whatsapp: whatsappInput.value.trim(),
    location: locationInput.value.trim(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", currentUserId);

  if (error) {
  // console.error("Update error:", JSON.stringify(error, null, 2));
    alert("❌ Failed to update profile.");
  } else {
    alert("✅ Profile updated successfully!");
    window.location.href = "dashboard.html";
  }
});

// Run
loadProfile();
