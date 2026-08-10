async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    location.href = "login.html";
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") {
    await supabaseClient.auth.signOut();
    location.href = "login.html";
    return null;
  }

  return session;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.querySelector("#loginForm")) return;

  const form = document.querySelector("#loginForm");
  const message = document.querySelector("#loginMessage");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "登入中...";

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      message.textContent = error.message;
      return;
    }

    location.href = "admin.html";
  });
});
