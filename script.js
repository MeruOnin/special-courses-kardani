/*
    ============================================================
    تنظیمات اصلی
    ============================================================
  */

  // نام فایل JSON؛ باید کنار فایل HTML قرار گرفته باشد.
  const JSON_FILE_URL = "./static/files/special_courses_kardani.json";

  // تعداد حداکثر نتایجی که هم‌زمان در جدول نمایش داده می‌شوند.
  // این محدودیت باعث می‌شود در داده‌های بسیار زیاد هم رابط کاربری سریع بماند.
  const MAX_VISIBLE_RESULTS = 100;

  /*
    ============================================================
    دسترسی به عناصر HTML
    ============================================================
  */

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const resultsBody = document.getElementById("resultsBody");

  const emptyState = document.getElementById("emptyState");
  const emptyStateTitle = document.getElementById("emptyStateTitle");
  const emptyStateText = document.getElementById("emptyStateText");

  /*
    ============================================================
    متغیرهای داده
    ============================================================
  */

  // داده خامی که از فایل courses.json می‌گیریم.
  let courses = [];

  // داده آماده‌شده برای جستجوی سریع.
  // در این متغیر فقط پنج فیلد جستجوی موردنیاز، به فرم نرمال‌شده نگهداری می‌شوند.
  let searchableCourses = [];

  // برای جلوگیری از اجرای بی‌مورد جستجو هنگام تایپ سریع کاربر.
  let searchTimer;

  /*
    ============================================================
    توابع کمکی
    ============================================================
  */

  /**
   * تبدیل مقدارهای null یا undefined به متن خالی.
   * این کار از خطا در زمان جستجو یا رندر جدول جلوگیری می‌کند.
   */
  function safeText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  }

  /**
   * نرمال‌سازی فارسی برای جستجوی بهتر.
   *
   * مثال:
   * - ي → ی
   * - ك → ک
   * - اعداد فارسی یا عربی → اعداد انگلیسی
   * - فاصله‌های اضافی حذف می‌شوند
   *
   * بنابراین کاربر با شکل‌های متفاوت حروف و اعداد،
   * همچنان به نتیجه موردنظر می‌رسد.
   */
  function normalizeText(value) {
    return safeText(value)
      .toLowerCase()
      .trim()
      .replace(/ي/g, "ی")
      .replace(/ى/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[۰-۹]/g, function (digit) {
        return "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
      })
      .replace(/[٠-٩]/g, function (digit) {
        return "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      })
      .replace(/\s+/g, " ");
  }

  /**
   * جلوگیری از تزریق کد HTML در جدول.
   * هر داده‌ای که از JSON وارد جدول می‌شود، ایمن نمایش داده خواهد شد.
   */
  function escapeHtml(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * نمایش پیام در قسمت زیر جدول.
   */
  function showEmptyState(title, text) {
    emptyState.style.display = "block";
    emptyStateTitle.textContent = title;
    emptyStateText.textContent = text;
  }

  /**
   * مخفی‌کردن پیام زیر جدول.
   */
  function hideEmptyState() {
    emptyState.style.display = "none";
  }

  /*
    ============================================================
    بارگیری فایل JSON
    ============================================================
  */

  async function loadCourses() {
    try {
      showEmptyState(
        "در حال بارگیری اطلاعات دروس...",
        "لطفاً چند لحظه صبر کنید."
      );

      const response = await fetch(JSON_FILE_URL);

      // اگر فایل پیدا نشد یا خطای HTTP داشت.
      if (!response.ok) {
        throw new Error("خطا در بارگیری فایل JSON. کد خطا: " + response.status);
      }

      const data = await response.json();

      // مطمئن می‌شویم خروجی JSON واقعاً آرایه باشد.
      if (!Array.isArray(data)) {
        throw new Error("ساختار فایل JSON صحیح نیست؛ داده‌ها باید داخل آرایه [] باشند.");
      }

      courses = data;

      /*
        آماده‌سازی دیتای قابل جستجو.

        نکته عملکردی مهم:
        به جای آنکه در هر بار تایپ کاربر، همه فیلدها را دوباره
        تبدیل و نرمال‌سازی کنیم، فقط یک‌بار در ابتدا این کار را انجام می‌دهیم.
        نتیجه: جستجو بسیار سریع‌تر خواهد بود.
      */
      searchableCourses = courses.map(function (course) {
        const lessonCode = safeText(course["کد درس"]);
        const classCode = safeText(course["کد ارائه کلاس درس"]);
        const lessonName = safeText(course["نام درس"]);
        const professor = safeText(course["استاد"]);
        const classTime = safeText(course["زمانبندی تشکیل کلاس"]);

        return {
          original: course,

          // یک متن نهایی شامل 5 فیلد قابل جستجو.
          // جستجوی includes روی همین فیلد انجام می‌شود.
          searchIndex: normalizeText(
            lessonCode + " " +
            classCode + " " +
            lessonName + " " +
            professor + " " +
            classTime
          )
        };
      });

      showEmptyState(
        "اطلاعات دروس آماده است",
        "برای مشاهده نتایج، عبارت موردنظر خود را در کادر جستجو وارد کنید."
      );

      console.log("تعداد رکوردهای بارگیری‌شده:", courses.length);

    } catch (error) {
      console.error(error);

      showEmptyState(
        "خطا در بارگیری اطلاعات",
        "فایل courses.json پیدا نشد یا ساختار آن صحیح نیست. لطفاً کنسول مرورگر را بررسی کنید."
      );
    }
  }

  /*
    ============================================================
    جستجو در 5 فیلد تعیین‌شده
    ============================================================

    فیلدهای جستجو:
    1) کد درس
    2) کد ارائه کلاس درس
    3) نام درس
    4) استاد
    5) زمانبندی تشکیل کلاس (شامل روز کلاس)
  */

  function searchCourses() {
    const query = normalizeText(searchInput.value);

    // هر بار پیش از نمایش نتایج جدید، جدول را پاک می‌کنیم.
    resultsBody.innerHTML = "";

    // اگر کاربر چیزی وارد نکرده باشد، نتیجه‌ای نشان نمی‌دهیم.
    if (!query) {
      showEmptyState(
        "آماده جستجو هستید",
        "نام درس، کد درس، کد ارائه، نام استاد یا روز کلاس را وارد کنید."
      );

      return;
    }

    /*
      startsWith مناسب جستجوی ابتدای متن است؛
      اما شما جستجوی حرف‌به‌حرف در هر قسمت متن می‌خواهید.
      بنابراین از includes استفاده شده است.

      چند نمونه:
      - «تحلیل» → تحلیل و طراحی نرم افزار
      - «ظاهردوست» → بهار ظاهردوست
      - «پنج» → پنج شنبه از 10:15 تا 12:30
      - «1562» → کد ارائه 1562511
    */
    const foundCourses = searchableCourses
      .filter(function (item) {
        return item.searchIndex.includes(query);
      })
      .slice(0, MAX_VISIBLE_RESULTS);

    renderResults(foundCourses, query);
  }

  /*
    ============================================================
    نمایش نتیجه‌ها در جدول
    ============================================================
  */

  function renderResults(foundCourses, query) {
    resultsBody.innerHTML = "";

    if (foundCourses.length === 0) {
      showEmptyState(
        "نتیجه‌ای پیدا نشد",
        "برای عبارت «" + searchInput.value.trim() + "» در میان دروس، استادان و زمان‌بندی کلاس‌ها نتیجه‌ای وجود ندارد."
      );

      return;
    }

    hideEmptyState();

    const rowsHtml = foundCourses.map(function (item) {
      const course = item.original;

      return `
        <tr>
          <td>${escapeHtml(course["کد درس"])}</td>
          <td>${escapeHtml(course["نام درس"])}</td>
          <td>${escapeHtml(course["کد ارائه کلاس درس"])}</td>
          <td>${escapeHtml(course["تعداد واحد نظری"])}</td>
          <td>${escapeHtml(course["تعداد واحد عملی"])}</td>
          <td>${escapeHtml(course["استاد"])}</td>
          <td>${escapeHtml(course["حداکثر ظرفیت"])}</td>
          <td>${escapeHtml(course["زمانبندی تشکیل کلاس"])}</td>
          <td>${escapeHtml(course["زمان امتحان"])}</td>
        </tr>
      `;
    }).join("");

    resultsBody.innerHTML = rowsHtml;

    // اگر تعداد واقعی نتایج بیشتر از حد نمایش باشد، این موضوع به کاربر اطلاع داده می‌شود.
    const totalFoundCount = searchableCourses.filter(function (item) {
      return item.searchIndex.includes(query);
    }).length;

    if (totalFoundCount > MAX_VISIBLE_RESULTS) {
      showEmptyState(
        "تعداد نتایج زیاد است",
        `فقط ${MAX_VISIBLE_RESULTS} نتیجه اول از مجموع ${totalFoundCount} نتیجه نمایش داده شده است. عبارت جستجو را دقیق‌تر وارد کنید.`
      );
    }
  }

  /*
    ============================================================
    رویدادهای جستجو
    ============================================================
  */

  // جستجو با کلیک روی دکمه.
  searchButton.addEventListener("click", function () {
    searchCourses();
  });

  /*
    جستجوی زنده با هر بار تایپ.

    debounce با تأخیر 180 میلی‌ثانیه:
    اگر کاربر سریع چند حرف تایپ کند، تابع جستجو برای تک‌تک کلیدها
    فوراً اجرا نمی‌شود؛ فقط 180ms پس از آخرین تایپ اجرا خواهد شد.
    نتیجه: UX نرم‌تر و فشار پردازشی کمتر.
  */
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(function () {
      searchCourses();
    }, 180);
  });

  // جستجو با فشردن کلید Enter.
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      clearTimeout(searchTimer);
      searchCourses();
    }
  });

  /*
    ============================================================
    چیپ‌های پیشنهادی
    ============================================================
  */

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      searchInput.value = chip.getAttribute("data-value") || "";
      searchInput.focus();
      searchCourses();
    });
  });

  /*
    ============================================================
    اجرای اولیه
    ============================================================
  */

  loadCourses();