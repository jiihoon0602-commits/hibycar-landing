(function () {
  "use strict";

  const forms = [...document.querySelectorAll(".consult-form")];
  const mobileSticky = document.querySelector(".mobile-sticky");
  const toTop = document.querySelector(".to-top");
  const carousel = document.querySelector(".hero-carousel");
  const now = new Date();
  const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

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
      if (!reduceMotion) autoTimer = setInterval(() => showSlide(currentIndex + 1), 3500);
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

  const fakePhoneNumbers = new Set([
    "01000000000",
    "01011111111",
    "01012345678",
    "01099999999"
  ]);

  function getPhoneError(digits) {
    if (!digits) return "휴대전화 번호를 입력해 주세요.";
    if (!digits.startsWith("010")) return "010으로 시작하는 휴대전화 번호를 입력해 주세요.";
    if (digits.length !== 11) return "휴대전화 번호 11자리를 모두 입력해 주세요.";
    const subscriberNumber = digits.slice(3);
    if (fakePhoneNumbers.has(digits) || /^(\d)\1{7}$/.test(subscriberNumber)) {
      return "실제로 연락 가능한 휴대전화 번호를 입력해 주세요.";
    }
    return "";
  }

  function parseBirthDate(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length !== 8) return { digits, iso: "", error: "생년월일 8자리를 입력해 주세요." };

    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = year >= 1900
      && date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
    if (!valid) return { digits, iso: "", error: "올바른 생년월일 8자리를 입력해 주세요." };

    const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    if (iso > localToday) return { digits, iso: "", error: "미래 날짜는 생년월일로 입력할 수 없습니다." };
    return { digits, iso, error: "" };
  }

  function initLeadForm(form) {
    const phoneInput = form.querySelector('[name="phone"]');
    const birthDateInput = form.querySelector('[name="birth_date"]');
    const privacyInput = form.querySelector('[name="privacy_agreed"]');
    const debtInputs = [...form.querySelectorAll('[name="debt_status"]')];
    const eligibilityError = form.querySelector(".eligibility-error");
    const eligibilityBlock = form.querySelector(".eligibility-block");
    const agreementError = form.querySelector(".agreement-error");
    const statusBox = form.querySelector(".form-status");
    const submitButton = form.querySelector(".submit-button");
    const submitLabel = form.querySelector(".submit-label");
    const submitLoading = form.querySelector(".submit-loading");
    const termsToggle = form.querySelector(".terms-toggle");

    const selectedDebtStatus = () => form.querySelector('[name="debt_status"]:checked')?.value || "";
    const clearStatus = () => {
      statusBox.hidden = true;
      statusBox.classList.remove("is-error");
    };

    function updateEligibility() {
      const blocked = selectedDebtStatus() === "예";
      eligibilityError.textContent = "";
      eligibilityBlock.hidden = !blocked;
      submitButton.disabled = blocked;
      submitLabel.textContent = blocked ? "현재 상담 신청이 어렵습니다" : "무료 상담 신청하기";
    }

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
      const nameInput = form.elements.name;
      const digits = phoneInput.value.replace(/\D/g, "");
      const birthDate = parseBirthDate(birthDateInput.value);
      const debtStatus = selectedDebtStatus();

      clearError(nameInput);
      clearError(phoneInput);
      clearError(birthDateInput);
      eligibilityError.textContent = "";
      agreementError.textContent = "";

      if (nameInput.value.trim().length < 2) {
        setError(nameInput, "이름을 2자 이상 입력해 주세요.");
        valid = false;
      }
      const phoneError = getPhoneError(digits);
      if (phoneError) {
        setError(phoneInput, phoneError);
        valid = false;
      }
      if (birthDate.error) {
        setError(birthDateInput, birthDate.error);
        valid = false;
      }
      if (!debtStatus) {
        eligibilityError.textContent = "예 또는 아니요를 선택해 주세요.";
        valid = false;
      }
      if (debtStatus === "예") {
        eligibilityBlock.hidden = false;
        submitButton.disabled = true;
        valid = false;
      }
      if (!privacyInput.checked) {
        agreementError.textContent = "개인정보 수집 및 이용 동의가 필요합니다.";
        valid = false;
      }
      return valid;
    }

    form.addEventListener("input", (event) => {
      clearStatus();
      if (event.target === phoneInput) {
        phoneInput.value = formatPhone(phoneInput.value);
        clearError(phoneInput);
      } else if (event.target === birthDateInput) {
        birthDateInput.value = parseBirthDate(birthDateInput.value).digits;
        clearError(birthDateInput);
      } else if (event.target === form.elements.name) {
        clearError(event.target);
      }
    });

    form.addEventListener("change", (event) => {
      clearStatus();
      if (event.target === birthDateInput) clearError(birthDateInput);
      if (event.target === privacyInput) agreementError.textContent = "";
      if (debtInputs.includes(event.target)) updateEligibility();
    });

    termsToggle.addEventListener("click", () => {
      const detail = document.getElementById(termsToggle.getAttribute("aria-controls"));
      const open = termsToggle.getAttribute("aria-expanded") === "true";
      termsToggle.setAttribute("aria-expanded", String(!open));
      termsToggle.textContent = open ? "보기" : "닫기";
      detail.hidden = open;
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      if (!validate()) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]')
          || (!selectedDebtStatus() ? debtInputs[0] : null)
          || (!privacyInput.checked ? privacyInput : null);
        firstInvalid?.focus();
        return;
      }

      const endpoint = form.dataset.endpoint.trim();
      if (!endpoint) {
        statusBox.hidden = false;
        statusBox.classList.add("is-error");
        statusBox.innerHTML = "상담 접수 주소가 아직 연결되지 않았습니다. <b>index.html의 data-endpoint 값</b>에 Formspree 또는 Google Apps Script 주소를 입력해 주세요.";
        statusBox.focus();
        return;
      }

      submitButton.disabled = true;
      submitLabel.hidden = true;
      submitLoading.hidden = false;
      const payload = {
        ...Object.fromEntries(new FormData(form).entries()),
        phone: phoneInput.value.replace(/\D/g, ""),
        birth_date: parseBirthDate(birthDateInput.value).iso,
        privacy_agreed: privacyInput.checked,
        submitted_at: new Date().toISOString(),
        page_url: location.href
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw Error();
        if (typeof fbq === "function") fbq("track", "Lead");

        statusBox.hidden = false;
        statusBox.innerHTML = "<b>상담 신청이 완료되었습니다.</b><br>확인 후 입력하신 연락처로 안내드리겠습니다.";
        form.reset();
        updateEligibility();
        statusBox.focus();
      } catch {
        statusBox.hidden = false;
        statusBox.classList.add("is-error");
        statusBox.textContent = "접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        statusBox.focus();
      } finally {
        submitLabel.hidden = false;
        submitLoading.hidden = true;
        updateEligibility();
      }
    });

    updateEligibility();
  }

  forms.forEach(initLeadForm);

  if (toTop) {
    const updateTopButton = () => toTop.classList.toggle("is-visible", scrollY > 620);
    addEventListener("scroll", updateTopButton, { passive: true });
    updateTopButton();
    toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
  }

  if (mobileSticky && "IntersectionObserver" in window && forms.length) {
    const visibleForms = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleForms.add(entry.target);
        else visibleForms.delete(entry.target);
      });
      mobileSticky.classList.toggle("is-hidden", visibleForms.size > 0);
    }, { threshold: 0.15 });
    forms.forEach((form) => observer.observe(form));
  }
})();
