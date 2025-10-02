// /js/form.js
// Load this as module: <script type="module" src="/js/form.js"></script>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------ Supabase config ------------------ */
const SUPABASE_URL = "https://pkqboeleptkohyxgjuzk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJvZWxlcHRrb2h5eGdqdXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTg2MTEsImV4cCI6MjA3MTY5NDYxMX0.sgb5O4vd57DNWBRCkLkg3fVjNyWAByddkcorSFjV0QU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Spinner Animation
function showSpinner() {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) spinner.style.display = "flex";
}
function hideSpinner() {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) spinner.style.display = "none";
}

/* ------------------ Exchange rate / UI helpers ------------------ */
let exchangeRate = 0;
let nairaAmount = 0;

async function fetchExchangeRate() {
  const rateEl = document.getElementById("rateInfo");
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`);
    const data = await res.json();
    exchangeRate = Number(data.rates.NGN);

    const usdPrice = Number(document.getElementById("formPrice")?.value || 5);
    nairaAmount = Number((usdPrice * exchangeRate).toFixed(2));

    if (rateEl) {
      rateEl.textContent = `Form price: ₦${nairaAmount.toLocaleString()} (₦${exchangeRate.toFixed(
        2
      )} per $1)`;
    }
  } catch (err) {
    exchangeRate = 0;
    nairaAmount = 0;
    if (rateEl) rateEl.textContent = "Failed to fetch exchange rate.";
  }
}
fetchExchangeRate();

/* ------------------ Paystack loader ------------------ */
function ensurePaystack() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () =>
      window.PaystackPop
        ? resolve(window.PaystackPop)
        : reject(new Error("Paystack script loaded but PaystackPop not found"));
    s.onerror = () => reject(new Error("Failed to load Paystack script"));
    document.head.appendChild(s);
  });
}
const amountInKobo = (naira) => Math.round(Number(naira) * 100);

/* ------------------ Idempotency helpers ------------------ */
function markPaymentProcessed(paystackRef) {
  if (!paystackRef) return;
  try {
    const processed = JSON.parse(
      localStorage.getItem("processedPayments") || "[]"
    );
    if (!processed.includes(paystackRef)) {
      processed.push(paystackRef);
      localStorage.setItem("processedPayments", JSON.stringify(processed));
    }
  } catch {}
}
function isPaymentProcessed(paystackRef) {
  if (!paystackRef) return false;
  try {
    const processed = JSON.parse(
      localStorage.getItem("processedPayments") || "[]"
    );
    return processed.includes(paystackRef);
  } catch {
    return false;
  }
}

/* ------------------ Referral helpers ------------------ */
const urlParams = new URLSearchParams(window.location.search);
let urlReferrerCode = urlParams.get("ref") || null;

async function ensureReferralCode(userId) {
  const { data: existing } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.referral_code) return existing.referral_code;

  let code =
    crypto?.randomUUID?.().slice(0, 8) ||
    Math.random().toString(36).slice(2, 10);

  for (let i = 0; i < 2; i++) {
    const { error: upErr } = await supabase
      .from("users")
      .update({ referral_code: code })
      .eq("id", userId);

    if (!upErr) return code;
    code = Math.random().toString(36).slice(2, 10);
  }
  return code;
}

/* ------------------ Helper: detect mobile ------------------ */
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/* ------------------ Main form handling ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const location = document.getElementById("location").value.trim();
    const manualReferral = document.getElementById("referralCode").value.trim();
    const referrerCode = manualReferral || urlReferrerCode || null;

    if (!email || !password) {
      alert("Please provide an email and password.");
      return;
    }

    if (!nairaAmount) {
      await fetchExchangeRate();
      if (!nairaAmount) {
        alert("Unable to determine form price. Try again later.");
        return;
      }
    }

    let PaystackPop;
    try {
      PaystackPop = await ensurePaystack();
    } catch (err) {
      alert("Payment service unavailable.");
      return;
    }

    const handler = PaystackPop.setup({
      key: "pk_live_98e672f88208c8d3bb0c4bc7439883ad7e29ad94",
      email: email || "",
      amount: amountInKobo(nairaAmount || 0),
      currency: "NGN",
      ref: `signup_${Date.now()}`,

      callback: function (response) {
        showSpinner();
        (async () => {
          const payRef = response?.reference;
          if (!payRef) {
            hideSpinner();
            return;
          }
          if (isPaymentProcessed(payRef)) return;

          try {
            let uid = null;
            let { data: signUpData, error: signUpErr } =
              await supabase.auth.signUp({ email, password });

            if (signUpErr) {
              if (
                String(signUpErr.message || "")
                  .toLowerCase()
                  .includes("already registered")
              ) {
                const { data: signInData, error: signInErr } =
                  await supabase.auth.signInWithPassword({ email, password });
                if (signInErr) {
                  const { data: existingProfile } = await supabase
                    .from("users")
                    .select("id")
                    .eq("email", email)
                    .maybeSingle();
                  if (existingProfile?.id) uid = existingProfile.id;
                } else {
                  uid = signInData?.user?.id || null;
                }
              } else {
                throw signUpErr;
              }
            } else {
              uid = signUpData?.user?.id || null;
            }

            if (!uid) {
              const { data: whoami } = await supabase.auth.getUser();
              uid = whoami?.user?.id || uid;
            }
            if (!uid) throw new Error("Could not determine user ID after payment.");

            const myReferralCode = await ensureReferralCode(uid);

            const upsertPayload = {
              id: uid,
              full_name: fullName,
              email,
              whatsapp,
              location,
              referral_code: myReferralCode,
              referred_by: referrerCode || null,
              earnings: 0,
              form_purchased: true,
              ref_count: 0,
              created_at: new Date().toISOString(),
            };

            await supabase.from("users").upsert(upsertPayload, {
              onConflict: "id",
            });

            if (referrerCode) {
              try {
                const { data, error } = await supabase.rpc(
                  "apply_referral_reward",
                  { new_user_id: uid, referrer_code: referrerCode }
                );
                if (error) {
                  alert(
                    "Referral not applied: " + (error.message || "Unknown error")
                  );
                } else {
                  alert(data?.message || "Referral applied successfully! 🎉");
                }
              } catch {
                alert("Something went wrong applying the referral.");
              }
            }

            await supabase.from("admin_logs").insert({
              action: "signup_payment",
              details: {
                email,
                user_id: uid,
                paystack_ref: payRef,
                referrer: referrerCode,
              },
              created_at: new Date().toISOString(),
            });

            markPaymentProcessed(payRef);
            window.location.href = "/congrat.html";
          } catch (err) {
            alert("Signup failed after payment: " + (err?.message || err));
          }
        })();
      },

      onClose: function () {
        alert("Payment was not completed.");
      },
    });

    // ✅ Desktop → Inline, Mobile → Redirect
    if (isMobile()) {
      handler.open();
    } else {
      handler.openIframe();
    }
  });
});
