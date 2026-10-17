import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Public project details only. Never put secret/service-role keys here.
const supabase = createClient(
  "https://ixrvjjarpexyhzmqntjb.supabase.co",
  "sb_publishable_FQnjqHl0SfbeC9bzVYeubA_T9Uf7Qeu"
);
const form = document.getElementById("auth-form");
const status = document.getElementById("auth-status");
const submit = document.getElementById("submit-button");
const signout = document.getElementById("signout-button");
const register = location.pathname.endsWith("register.html");
const update = (message) => { status.textContent = message; };

async function showExistingSession() {
  const {data:{session}} = await supabase.auth.getSession();
  if (session && !register) {
    form.hidden = true;
    signout.hidden = false;
    update(`Signed in as ${session.user.email}. Opening dashboard…`);
    location.href = new URL("dashboard.html", location.href).href;
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  update("Please wait...");
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (register) {
      const full_name = document.getElementById("fullname").value.trim();
      const {data, error} = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name },
          emailRedirectTo: new URL("login.html", location.href).href
        }
      });
      if (error) throw error;
      update(data.session
        ? "Account created and signed in. Open your dashboard."
        : "Registration submitted. Check your email for a confirmation link, then return to Sign in. If you already have an account, try signing in.");
      if (data.session) form.hidden = true;
    } else {
      const {error} = await supabase.auth.signInWithPassword({email,password});
      if (error) throw error;
      form.hidden = true;
      signout.hidden = false;
      update("Signed in successfully. Opening your dashboard…");
      location.href = new URL("dashboard.html", location.href).href;
    }
  } catch (error) {
    update(error?.message || "Something went wrong. Please retry.");
  } finally {
    submit.disabled = false;
  }
});
if (signout) signout.addEventListener("click", async () => {
  const {error} = await supabase.auth.signOut();
  if (error) return update(error.message);
  form.hidden = false;
  signout.hidden = true;
  update("Signed out successfully.");
});
showExistingSession().catch(() => update("Couldn't check your session. Please refresh."));
