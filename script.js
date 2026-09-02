(function () {
  "use strict";

  const form = document.getElementById("lead-form");
  const phoneInput = form.querySelector('[name="phone"]');
  const privacyInput = form.querySelector('[name="privacy_agreed"]');
  const debtInputs = [...form.querySelectorAll('[name="debt_status"]')];
  const eligibilityError = form.querySelector(".eligibility-error");
  const eligibilityBlock = form.querySelector(".eligibility-block");
  const statusBox = form.querySelector(".form-status");
  const submitButton = form.querySelector(".submit-button");
  const submitLabel = form.querySelector(".submit-label");
  const submitLoading = form.querySelector(".submit-loading");
  const mobileSticky = document.querySelector(".mobile-sticky");
  const toTop = document.querySelector(".to-top");
  const carousel = document.querySelector(".hero-carousel");

  document.getElementById("year").textContent = new Date().getFullYear();

  if (carousel) {
    const track = carousel.querySelector(".carousel-track");
    const slides = [...carousel.querySelectorAll("[data-slide]")];
    const dots = [...carousel.querySelectorAll(".carousel-dots button")];
    const currentNumber = carousel.querySelector(".carousel-count b");
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let currentIndex = 0;
    let autoTimer;
    let touchStartX = 0;

    const showSlide = (index) => {
      currentIndex = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      slides.forEach((slide, slideIndex) => slide.setAttribute("aria-hidden", String(slideIndex !== currentIndex)));
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === currentIndex;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", String(active));
        dot.tabIndex = active ? 0 : -1;
      });
      currentNumber.textContent = String(currentIndex + 1);
    };
    const stop = () => clearInterval(autoTimer);
    const start = () => {
      stop();
      if (!reduceMotion) autoTimer = setInterval(() => showSlide(currentIndex + 1), 4500);
    };
    carousel.querySelector(".carousel-arrow--prev").onclick = () => { showSlide(currentIndex - 1); start(); };
    carousel.querySelector(".carousel-arrow--next").onclick = () => { showSlide(currentIndex + 1); start(); };
    dots.forEach((dot) => dot.onclick = () => { showSlide(Number(dot.dataset.index)); start(); });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);
    carousel.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; stop(); }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) showSlide(currentIndex + (distance < 0 ? 1 : -1));
      start();
    }, { passive: true });
    showSlide(0);
    start();
  }

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  function selectedDebtStatus() {
    return form.querySelector('[name="debt_status"]:checked')?.value || "";
  }

  function updateEligibility() {
    const blocked = selectedDebtStatus() === "예";
    eligibilityError.textContent = "";
    eligibilityBlock.hidden = !blocked;
    submitButton.disabled = blocked;
    submitLabel.textContent = blocked ? "현재 상담 신청이 어렵습니다" : "무료 상담 신청하기";
    statusBox.hidden = true;
  }

  debtInputs.forEach((input) => input.addEventListener("change", updateEligibility));
  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
    clearError(phoneInput);
  });
  form.querySelector('[name="name"]').addEventListener("input", (event) => clearError(event.target));
  privacyInput.addEventListener("change", () => form.querySelector(".agreement-error").textContent = "");

  document.querySelector(".terms-toggle").onclick = (event) => {
    const button = event.currentTarget;
    const detail = document.getElementById("privacy-detail");
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    button.textContent = open ? "보기" : "닫기";
    detail.hidden = open;
  };

  function setError(input, message) {
    input.setAttribute("aria-invalid", "true");
    input.closest(".field").querySelector(".error-message").textContent = message;
  }
  function clearError(input) {
    input.removeAttribute("aria-invalid");
    input.closest(".field").querySelector(".error-message").textContent = "";
  }
  function validate() {
    let valid = true;
    const name = form.elements.name;
    const digits = phoneInput.value.replace(/\D/g, "");
    const debtStatus = selectedDebtStatus();
    clearError(name);
    clearError(phoneInput);
    eligibilityError.textContent = "";
    form.querySelector(".agreement-error").textContent = "";
    if (name.value.trim().length < 2) { setError(name, "이름을 2자 이상 입력해 주세요."); valid = false; }
    if (!/^01[016789]\d{7,8}$/.test(digits)) { setError(phoneInput, "휴대전화 번호를 확인해 주세요."); valid = false; }
    if (!debtStatus) { eligibilityError.textContent = "예 또는 아니요를 선택해 주세요."; valid = false; }
    if (debtStatus === "예") { eligibilityBlock.hidden = false; submitButton.disabled = true; valid = false; }
    if (!privacyInput.checked) { form.querySelector(".agreement-error").textContent = "개인정보 수집 및 이용 동의가 필요합니다."; valid = false; }
    return valid;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusBox.hidden = true;
    statusBox.classList.remove("is-error");
    if (!validate()) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const endpoint = form.dataset.endpoint.trim();
    if (!endpoint) {
      statusBox.hidden = false;
      statusBox.classList.add("is-error");
      statusBox.innerHTML = "상담 접수 주소가 아직 연결되지 않았습니다. <b>index.html의 data-endpoint 값</b>에 Formspree 또는 Google Apps Script 주소를 입력해 주세요.";
      return;
    }
    submitButton.disabled = true;
    submitLabel.hidden = true;
    submitLoading.hidden = false;
    const payload = {
      ...Object.fromEntries(new FormData(form).entries()),
      phone: phoneInput.value.replace(/\D/g, ""),
      privacy_agreed: privacyInput.checked,
      submitted_at: new Date().toISOString(),
      page_url: location.href
    };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw Error();
      statusBox.hidden = false;
      statusBox.innerHTML = "<b>상담 신청이 접수되었습니다.</b><br>확인 후 입력하신 연락처로 안내드리겠습니다.";
      form.reset();
    } catch {
      statusBox.hidden = false;
      statusBox.classList.add("is-error");
      statusBox.textContent = "접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
      submitLabel.hidden = false;
      submitLoading.hidden = true;
      updateEligibility();
    }
  });

  const updateTopButton = () => toTop.classList.toggle("is-visible", scrollY > 620);
  addEventListener("scroll", updateTopButton, { passive: true });
  updateTopButton();
  toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => mobileSticky?.classList.toggle("is-hidden", entry.isIntersecting), { threshold: .15 }).observe(form);
  }
})();
