/**
 * Country Code Selector — Flag Emoji + Dial Code for Telegram Login
 */

const COUNTRIES = [
  { name: "Afghanistan", flag: "🇦🇫", code: "+93" },
  { name: "Albania", flag: "🇦🇱", code: "+355" },
  { name: "Algeria", flag: "🇩🇿", code: "+213" },
  { name: "Andorra", flag: "🇦🇩", code: "+376" },
  { name: "Angola", flag: "🇦🇴", code: "+244" },
  { name: "Argentina", flag: "🇦🇷", code: "+54" },
  { name: "Armenia", flag: "🇦🇲", code: "+374" },
  { name: "Australia", flag: "🇦🇺", code: "+61" },
  { name: "Austria", flag: "🇦🇹", code: "+43" },
  { name: "Azerbaijan", flag: "🇦🇿", code: "+994" },
  { name: "Bahamas", flag: "🇧🇸", code: "+1242" },
  { name: "Bahrain", flag: "🇧🇭", code: "+973" },
  { name: "Bangladesh", flag: "🇧🇩", code: "+880" },
  { name: "Barbados", flag: "🇧🇧", code: "+1246" },
  { name: "Belarus", flag: "🇧🇾", code: "+375" },
  { name: "Belgium", flag: "🇧🇪", code: "+32" },
  { name: "Belize", flag: "🇧🇿", code: "+501" },
  { name: "Benin", flag: "🇧🇯", code: "+229" },
  { name: "Bhutan", flag: "🇧🇹", code: "+975" },
  { name: "Bolivia", flag: "🇧🇴", code: "+591" },
  { name: "Bosnia", flag: "🇧🇦", code: "+387" },
  { name: "Botswana", flag: "🇧🇼", code: "+267" },
  { name: "Brazil", flag: "🇧🇷", code: "+55" },
  { name: "Brunei", flag: "🇧🇳", code: "+673" },
  { name: "Bulgaria", flag: "🇧🇬", code: "+359" },
  { name: "Burkina Faso", flag: "🇧🇫", code: "+226" },
  { name: "Burundi", flag: "🇧🇮", code: "+257" },
  { name: "Cambodia", flag: "🇰🇭", code: "+855" },
  { name: "Cameroon", flag: "🇨🇲", code: "+237" },
  { name: "Canada", flag: "🇨🇦", code: "+1" },
  { name: "Cape Verde", flag: "🇨🇻", code: "+238" },
  { name: "Central African Republic", flag: "🇨🇫", code: "+236" },
  { name: "Chad", flag: "🇹🇩", code: "+235" },
  { name: "Chile", flag: "🇨🇱", code: "+56" },
  { name: "China", flag: "🇨🇳", code: "+86" },
  { name: "Colombia", flag: "🇨🇴", code: "+57" },
  { name: "Comoros", flag: "🇰🇲", code: "+269" },
  { name: "Congo (DRC)", flag: "🇨🇩", code: "+243" },
  { name: "Congo (Republic)", flag: "🇨🇬", code: "+242" },
  { name: "Costa Rica", flag: "🇨🇷", code: "+506" },
  { name: "Côte d'Ivoire", flag: "🇨🇮", code: "+225" },
  { name: "Croatia", flag: "🇭🇷", code: "+385" },
  { name: "Cuba", flag: "🇨🇺", code: "+53" },
  { name: "Cyprus", flag: "🇨🇾", code: "+357" },
  { name: "Czech Republic", flag: "🇨🇿", code: "+420" },
  { name: "Denmark", flag: "🇩🇰", code: "+45" },
  { name: "Djibouti", flag: "🇩🇯", code: "+253" },
  { name: "Dominican Republic", flag: "🇩🇴", code: "+1809" },
  { name: "Ecuador", flag: "🇪🇨", code: "+593" },
  { name: "Egypt", flag: "🇪🇬", code: "+20" },
  { name: "El Salvador", flag: "🇸🇻", code: "+503" },
  { name: "Equatorial Guinea", flag: "🇬🇶", code: "+240" },
  { name: "Eritrea", flag: "🇪🇷", code: "+291" },
  { name: "Estonia", flag: "🇪🇪", code: "+372" },
  { name: "Eswatini", flag: "🇸🇿", code: "+268" },
  { name: "Ethiopia", flag: "🇪🇹", code: "+251" },
  { name: "Fiji", flag: "🇫🇯", code: "+679" },
  { name: "Finland", flag: "🇫🇮", code: "+358" },
  { name: "France", flag: "🇫🇷", code: "+33" },
  { name: "Gabon", flag: "🇬🇦", code: "+241" },
  { name: "Gambia", flag: "🇬🇲", code: "+220" },
  { name: "Georgia", flag: "🇬🇪", code: "+995" },
  { name: "Germany", flag: "🇩🇪", code: "+49" },
  { name: "Ghana", flag: "🇬🇭", code: "+233" },
  { name: "Greece", flag: "🇬🇷", code: "+30" },
  { name: "Guatemala", flag: "🇬🇹", code: "+502" },
  { name: "Guinea", flag: "🇬🇳", code: "+224" },
  { name: "Guyana", flag: "🇬🇾", code: "+592" },
  { name: "Haiti", flag: "🇭🇹", code: "+509" },
  { name: "Honduras", flag: "🇭🇳", code: "+504" },
  { name: "Hong Kong", flag: "🇭🇰", code: "+852" },
  { name: "Hungary", flag: "🇭🇺", code: "+36" },
  { name: "Iceland", flag: "🇮🇸", code: "+354" },
  { name: "India", flag: "🇮🇳", code: "+91" },
  { name: "Indonesia", flag: "🇮🇩", code: "+62" },
  { name: "Iran", flag: "🇮🇷", code: "+98" },
  { name: "Iraq", flag: "🇮🇶", code: "+964" },
  { name: "Ireland", flag: "🇮🇪", code: "+353" },
  { name: "Israel", flag: "🇮🇱", code: "+972" },
  { name: "Italy", flag: "🇮🇹", code: "+39" },
  { name: "Jamaica", flag: "🇯🇲", code: "+1876" },
  { name: "Japan", flag: "🇯🇵", code: "+81" },
  { name: "Jordan", flag: "🇯🇴", code: "+962" },
  { name: "Kazakhstan", flag: "🇰🇿", code: "+7" },
  { name: "Kenya", flag: "🇰🇪", code: "+254" },
  { name: "Kuwait", flag: "🇰🇼", code: "+965" },
  { name: "Kyrgyzstan", flag: "🇰🇬", code: "+996" },
  { name: "Laos", flag: "🇱🇦", code: "+856" },
  { name: "Latvia", flag: "🇱🇻", code: "+371" },
  { name: "Lebanon", flag: "🇱🇧", code: "+961" },
  { name: "Lesotho", flag: "🇱🇸", code: "+266" },
  { name: "Liberia", flag: "🇱🇷", code: "+231" },
  { name: "Libya", flag: "🇱🇾", code: "+218" },
  { name: "Liechtenstein", flag: "🇱🇮", code: "+423" },
  { name: "Lithuania", flag: "🇱🇹", code: "+370" },
  { name: "Luxembourg", flag: "🇱🇺", code: "+352" },
  { name: "Madagascar", flag: "🇲🇬", code: "+261" },
  { name: "Malawi", flag: "🇲🇼", code: "+265" },
  { name: "Malaysia", flag: "🇲🇾", code: "+60" },
  { name: "Maldives", flag: "🇲🇻", code: "+960" },
  { name: "Mali", flag: "🇲🇱", code: "+223" },
  { name: "Malta", flag: "🇲🇹", code: "+356" },
  { name: "Mauritania", flag: "🇲🇷", code: "+222" },
  { name: "Mauritius", flag: "🇲🇺", code: "+230" },
  { name: "Mexico", flag: "🇲🇽", code: "+52" },
  { name: "Moldova", flag: "🇲🇩", code: "+373" },
  { name: "Monaco", flag: "🇲🇨", code: "+377" },
  { name: "Mongolia", flag: "🇲🇳", code: "+976" },
  { name: "Montenegro", flag: "🇲🇪", code: "+382" },
  { name: "Morocco", flag: "🇲🇦", code: "+212" },
  { name: "Mozambique", flag: "🇲🇿", code: "+258" },
  { name: "Myanmar", flag: "🇲🇲", code: "+95" },
  { name: "Namibia", flag: "🇳🇦", code: "+264" },
  { name: "Nepal", flag: "🇳🇵", code: "+977" },
  { name: "Netherlands", flag: "🇳🇱", code: "+31" },
  { name: "New Zealand", flag: "🇳🇿", code: "+64" },
  { name: "Nicaragua", flag: "🇳🇮", code: "+505" },
  { name: "Niger", flag: "🇳🇪", code: "+227" },
  { name: "Nigeria", flag: "🇳🇬", code: "+234" },
  { name: "North Macedonia", flag: "🇲🇰", code: "+389" },
  { name: "Norway", flag: "🇳🇴", code: "+47" },
  { name: "Oman", flag: "🇴🇲", code: "+968" },
  { name: "Pakistan", flag: "🇵🇰", code: "+92" },
  { name: "Palestine", flag: "🇵🇸", code: "+970" },
  { name: "Panama", flag: "🇵🇦", code: "+507" },
  { name: "Papua New Guinea", flag: "🇵🇬", code: "+675" },
  { name: "Paraguay", flag: "🇵🇾", code: "+595" },
  { name: "Peru", flag: "🇵🇪", code: "+51" },
  { name: "Philippines", flag: "🇵🇭", code: "+63" },
  { name: "Poland", flag: "🇵🇱", code: "+48" },
  { name: "Portugal", flag: "🇵🇹", code: "+351" },
  { name: "Qatar", flag: "🇶🇦", code: "+974" },
  { name: "Romania", flag: "🇷🇴", code: "+40" },
  { name: "Russia", flag: "🇷🇺", code: "+7" },
  { name: "Rwanda", flag: "🇷🇼", code: "+250" },
  { name: "Saudi Arabia", flag: "🇸🇦", code: "+966" },
  { name: "Senegal", flag: "🇸🇳", code: "+221" },
  { name: "Serbia", flag: "🇷🇸", code: "+381" },
  { name: "Sierra Leone", flag: "🇸🇱", code: "+232" },
  { name: "Singapore", flag: "🇸🇬", code: "+65" },
  { name: "Slovakia", flag: "🇸🇰", code: "+421" },
  { name: "Slovenia", flag: "🇸🇮", code: "+386" },
  { name: "Somalia", flag: "🇸🇴", code: "+252" },
  { name: "South Africa", flag: "🇿🇦", code: "+27" },
  { name: "South Korea", flag: "🇰🇷", code: "+82" },
  { name: "South Sudan", flag: "🇸🇸", code: "+211" },
  { name: "Spain", flag: "🇪🇸", code: "+34" },
  { name: "Sri Lanka", flag: "🇱🇰", code: "+94" },
  { name: "Sudan", flag: "🇸🇩", code: "+249" },
  { name: "Suriname", flag: "🇸🇷", code: "+597" },
  { name: "Sweden", flag: "🇸🇪", code: "+46" },
  { name: "Switzerland", flag: "🇨🇭", code: "+41" },
  { name: "Syria", flag: "🇸🇾", code: "+963" },
  { name: "Taiwan", flag: "🇹🇼", code: "+886" },
  { name: "Tajikistan", flag: "🇹🇯", code: "+992" },
  { name: "Tanzania", flag: "🇹🇿", code: "+255" },
  { name: "Thailand", flag: "🇹🇭", code: "+66" },
  { name: "Togo", flag: "🇹🇬", code: "+228" },
  { name: "Trinidad & Tobago", flag: "🇹🇹", code: "+1868" },
  { name: "Tunisia", flag: "🇹🇳", code: "+216" },
  { name: "Turkey", flag: "🇹🇷", code: "+90" },
  { name: "Turkmenistan", flag: "🇹🇲", code: "+993" },
  { name: "Uganda", flag: "🇺🇬", code: "+256" },
  { name: "Ukraine", flag: "🇺🇦", code: "+380" },
  { name: "United Arab Emirates", flag: "🇦🇪", code: "+971" },
  { name: "United Kingdom", flag: "🇬🇧", code: "+44" },
  { name: "United States", flag: "🇺🇸", code: "+1" },
  { name: "Uruguay", flag: "🇺🇾", code: "+598" },
  { name: "Uzbekistan", flag: "🇺🇿", code: "+998" },
  { name: "Venezuela", flag: "🇻🇪", code: "+58" },
  { name: "Vietnam", flag: "🇻🇳", code: "+84" },
  { name: "Yemen", flag: "🇾🇪", code: "+967" },
  { name: "Zambia", flag: "🇿🇲", code: "+260" },
  { name: "Zimbabwe", flag: "🇿🇼", code: "+263" },
];

// Current selected country code
let selectedCountryCode = "+1";

function initCountrySelector() {
  const btn = document.getElementById("country-btn");
  const selector = document.getElementById("country-selector");
  const dropdown = document.getElementById("country-dropdown");
  const searchInput = document.getElementById("country-search");
  const listEl = document.getElementById("country-list");

  if (!btn || !selector) return;

  // Render list
  function renderList(filter = "") {
    const lower = filter.toLowerCase();
    const filtered = COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.includes(lower)
    );
    listEl.innerHTML = filtered
      .map(
        (c) =>
          `<div class="country-item" data-code="${c.code}" data-flag="${c.flag}" data-name="${c.name}">
            <span class="flag">${c.flag}</span>
            <span class="name">${c.name}</span>
            <span class="dial">${c.code}</span>
          </div>`
      )
      .join("");

    // Click handlers for each item
    listEl.querySelectorAll(".country-item").forEach((item) => {
      item.addEventListener("click", () => {
        selectedCountryCode = item.dataset.code;
        document.getElementById("selected-flag").textContent = item.dataset.flag;
        document.getElementById("selected-code").textContent = item.dataset.code;
        selector.classList.remove("open");
        searchInput.value = "";
        renderList();
        // Focus the phone input after selection
        document.getElementById("auth-phone").focus();
      });
    });
  }

  renderList();

  // Toggle dropdown
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    selector.classList.toggle("open");
    if (selector.classList.contains("open")) {
      setTimeout(() => searchInput.focus(), 50);
    }
  });

  // Search filter
  searchInput.addEventListener("input", () => {
    renderList(searchInput.value);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!selector.contains(e.target)) {
      selector.classList.remove("open");
      searchInput.value = "";
      renderList();
    }
  });

  // Prevent dropdown from closing when clicking inside it
  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// Auto-init when DOM is ready
document.addEventListener("DOMContentLoaded", initCountrySelector);
