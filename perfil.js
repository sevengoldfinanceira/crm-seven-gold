(() => {
  const form = document.querySelector("[data-profile-form]");
  const status = document.querySelector("[data-profile-status]");
  const avatarInput = form?.elements.avatar;
  const avatars = () => document.querySelectorAll("[data-user-avatar]");
  let user = null;
  const area = new URLSearchParams(window.location.search).get("area") === "crm" ? "crm" : "empresa";

  document.querySelectorAll("[data-profile-sidebar]").forEach((sidebar) => {
    sidebar.hidden = sidebar.dataset.profileSidebar !== area;
  });
  const backLink = document.querySelector("[data-profile-back]");
  if (backLink) backLink.href = area === "crm" ? "crm.html" : "empresa.html";
  document.body.dataset.profileArea = area;

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.dataset.type = type;
  };

  const showAvatar = (url, name) => {
    avatars().forEach((avatar) => {
      avatar.textContent = "";
      avatar.style.backgroundImage = `url("${url}")`;
      avatar.classList.add("has-user-photo");
      avatar.setAttribute("aria-label", `Foto de ${name}`);
    });
  };

  const loadProfile = async () => {
    const client = window.sevenGoldAuth;
    if (!client || !form) return;

    const { data: userResult } = await client.auth.getUser();
    user = userResult.user;
    if (!user) return;

    const { data: crmUser } = await client
      .from("crm_users")
      .select("nome, email")
      .eq("email", String(user.email || "").trim().toLowerCase())
      .maybeSingle();

    const name = crmUser?.nome || user.user_metadata?.full_name || user.user_metadata?.name || user.email;
    form.elements.full_name.value = name;
    form.elements.email.value = user.email || crmUser?.email || "";

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

    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    let profileError = null;
    if (!token) {
      profileError = new Error("Sessão expirada. Entre novamente no CRM.");
    } else {
      try {
        const response = await fetch("/api/permissions/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profile: { nome: name } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) {
          profileError = new Error(result.error || "Não foi possível atualizar o nome.");
        }
      } catch (error) {
        profileError = error;
      }
    }

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
      setStatus(`Não foi possível salvar: ${profileError?.message || avatarError?.message || "verifique as permissões do perfil e do Storage."}`, "error");
      return;
    }

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });
    setStatus("Perfil salvo e sincronizado com sucesso.", "success");
  });

  document.addEventListener("DOMContentLoaded", loadProfile);
})();
