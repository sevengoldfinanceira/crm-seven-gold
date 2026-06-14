(() => {
  const form = document.querySelector("[data-profile-form]");
  const status = document.querySelector("[data-profile-status]");
  const avatarInput = form?.elements.avatar;
  const avatar = document.querySelector("[data-user-avatar]");
  let user = null;

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.dataset.type = type;
  };

  const showAvatar = (url, name) => {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url("${url}")`;
    avatar.classList.add("has-user-photo");
    avatar.setAttribute("aria-label", `Foto de ${name}`);
  };

  const loadProfile = async () => {
    const client = window.sevenGoldAuth;
    if (!client || !form) return;

    const { data: userResult } = await client.auth.getUser();
    user = userResult.user;
    if (!user) return;

    const { data: profile } = await client
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.full_name || user.user_metadata?.full_name || user.email;
    form.elements.full_name.value = name;
    form.elements.email.value = user.email || profile?.email || "";

    const { data: savedAvatar } = await client.storage
      .from("company-documents")
      .download(`${user.id}/profile/avatar.jpg`);

    if (savedAvatar) {
      showAvatar(URL.createObjectURL(savedAvatar), name);
    } else if (user.user_metadata?.avatar_url) {
      showAvatar(user.user_metadata.avatar_url, name);
    }
  };

  avatarInput?.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (file) showAvatar(URL.createObjectURL(file), form.elements.full_name.value || "usuario");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const client = window.sevenGoldAuth;
    const name = form.elements.full_name.value.trim();
    const file = avatarInput.files?.[0];
    const button = form.querySelector("button[type='submit']");

    if (!client || !user || !name) return;

    button.disabled = true;
    button.textContent = "Salvando...";
    setStatus("");

    const { error: profileError } = await client
      .from("profiles")
      .update({ full_name: name })
      .eq("id", user.id);

    let avatarError = null;
    if (file) {
      const result = await client.storage
        .from("company-documents")
        .upload(`${user.id}/profile/avatar.jpg`, file, {
          contentType: file.type,
          upsert: true,
        });
      avatarError = result.error;
    }

    button.disabled = false;
    button.textContent = "Salvar perfil";

    if (profileError || avatarError) {
      setStatus("Não foi possível salvar. Confira as permissões do perfil e do Storage.", "error");
      return;
    }

    setStatus("Perfil salvo e sincronizado com sucesso.", "success");
  });

  document.addEventListener("DOMContentLoaded", loadProfile);
})();
