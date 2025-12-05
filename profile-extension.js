let twitchAuth = null;
let currentAid = null;

// API base URL - extension will be hosted on Twitch, calling external server
const API_BASE_URL = "https://bot.tarkov-changes.com";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let autoRefreshIntervalId = null;
let profileLoadInProgress = false;

// Helper function to load images via fetch (bypasses CORS issues)
async function loadImageAsBlob(imageUrl) {
  if (!twitchAuth || !twitchAuth.token) {
    throw new Error("No authentication token available");
  }

  const response = await fetch(imageUrl, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + twitchAuth.token,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const imageBlob = await response.blob();
  return URL.createObjectURL(imageBlob);
}

// Initialize Twitch Extension
window.Twitch.ext.onAuthorized(async function (auth) {
  twitchAuth = auth;
  console.log("Twitch Extension authorized");

  // Load AID configuration and then profile
  await loadProfile();
  startAutoRefresh();
});

window.Twitch.ext.onError(function (error) {
  console.error("Twitch extension error:", error);
  showError("Twitch extension error occurred");
});

// Load AID from config endpoint, then load profile
async function loadProfile() {
  if (profileLoadInProgress) {
    console.log("Profile load already in progress; skipping.");
    return;
  }

  profileLoadInProgress = true;
  try {
    // First, get the AID from config
    const aid = await loadAIDFromConfig();

    if (!aid) {
      showError(
        "No AID configured for this channel. Please configure your AID in the extension settings."
      );
      return;
    }

    currentAid = aid;

    // Now load the profile data
    await loadProfileData(aid);
  } catch (error) {
    console.error("Failed to load profile:", error);
    showError("Failed to load profile data");
  } finally {
    profileLoadInProgress = false;
  }
}

function startAutoRefresh() {
  if (autoRefreshIntervalId) {
    return;
  }

  autoRefreshIntervalId = setInterval(() => {
    console.log("Auto-refresh: reloading profile data");
    loadProfile();
  }, REFRESH_INTERVAL_MS);
}

// Load AID from config endpoint
async function loadAIDFromConfig() {
  if (!twitchAuth || !twitchAuth.token) {
    throw new Error("No authentication token available");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/config/aid`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + twitchAuth.token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.aid) {
      return data.aid;
    }

    return null;
  } catch (error) {
    console.error("Error loading AID from config:", error);
    throw error;
  }
}

// Load profile data from API
async function loadProfileData(aid) {
  if (!twitchAuth || !twitchAuth.token) {
    throw new Error("No authentication token available");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/${aid}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + twitchAuth.token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        showError("This profile is not tracked.");
        return;
      }
      if (response.status === 404) {
        showError("Profile not found for the configured AID.");
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const profileData = await response.json();
    displayProfile(profileData);
  } catch (error) {
    console.error("Failed to load profile data:", error);
    showError("Failed to load profile data");
  }
}

async function displayProfile(data) {
  // Store globally for view switching
  window.currentProfileData = data;

  document.getElementById("loading").style.display = "none";
  document.getElementById("profile-content").style.display = "block";

  // Update profile info
  // Avatar uses static temp.png loaded directly from HTML
  const profileAvatar = document.getElementById("profile-avatar");

  profileAvatar.src = "temp.png";

  // Commented out: Dynamic profile image loading
  // if (data.profileImageUrl) {
  //   // If it's a relative URL or from our API, load via blob
  //   if (data.profileImageUrl.startsWith('/') || data.profileImageUrl.includes(API_BASE_URL)) {
  //     const imageUrl = data.profileImageUrl.startsWith('/')
  //       ? `${API_BASE_URL}${data.profileImageUrl}`
  //       : data.profileImageUrl;
  //     loadImageAsBlob(imageUrl)
  //       .then(objectURL => {
  //         profileAvatar.src = objectURL;
  //       })
  //       .catch(() => {
  //         profileAvatar.src = '';
  //       });
  //   } else {
  //     // External URL, use directly
  //     profileAvatar.src = data.profileImageUrl;
  //   }
  // } else {
  //   profileAvatar.src = '';
  // }
  document.getElementById("player-name").textContent = data.nickname;
  document.getElementById("player-info").textContent = `Level ${
    data.level
  } • ${data.side.toUpperCase()} • ${data.pmcStats.timePlayed}`;

  // Update level badge
  const levelBadge = document.getElementById("level-badge");
  if (data.level && data.level >= 1 && data.level <= 80) {
    levelBadge.style.display = "block";
    loadImageAsBlob(`${API_BASE_URL}/api/level-badge/${data.level}`)
      .then((objectURL) => {
        levelBadge.src = objectURL;
      })
      .catch(() => {
        levelBadge.style.display = "none";
      });
  } else {
    levelBadge.style.display = "none";
  }

  // Update prestige icon
  const prestigeIcon = document.getElementById("prestige-icon");
  if (
    data.prestigeLevel &&
    data.prestigeLevel >= 1 &&
    data.prestigeLevel <= 4
  ) {
    prestigeIcon.style.display = "block";
    loadImageAsBlob(`${API_BASE_URL}/api/prestige-icon/${data.prestigeLevel}`)
      .then((objectURL) => {
        prestigeIcon.src = objectURL;
      })
      .catch(() => {
        prestigeIcon.style.display = "none";
      });
  } else {
    prestigeIcon.style.display = "none";
  }

  // Update stats
  document.getElementById("pmc-raids").textContent =
    data.pmcStats.raids.toLocaleString();
  document.getElementById("pmc-kills").textContent =
    data.pmcStats.kills.toLocaleString();
  document.getElementById("pmc-deaths").textContent =
    data.pmcStats.deaths.toLocaleString();
  document.getElementById("pmc-transits").textContent =
    data.pmcStats.transits.toLocaleString();
  document.getElementById("pmc-kd").textContent = data.pmcStats.kd;
  document.getElementById("pmc-survival").textContent = data.pmcStats.survival;

  document.getElementById("scav-raids").textContent =
    data.scavStats.raids.toLocaleString();
  document.getElementById("scav-kills").textContent =
    data.scavStats.kills.toLocaleString();
  document.getElementById("scav-deaths").textContent =
    data.scavStats.deaths.toLocaleString();
  document.getElementById("scav-kd").textContent = data.scavStats.kd;
  document.getElementById("scav-survival").textContent =
    data.scavStats.survival;

  // Set up navigation event listeners now that DOM is ready
  setupNavigation();

  // Render initial view
  updateView();

  // Note: Prices are now loaded only when on equipment view in updateView()
}

function setupNavigation() {
  const prevButton = document.getElementById("prev-view");
  const nextButton = document.getElementById("next-view");

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      changeView(-1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      changeView(1);
    });
  }

  // Set up page navigation
  const prevPageButton = document.getElementById("prev-page");
  const nextPageButton = document.getElementById("next-page");

  if (prevPageButton) {
    prevPageButton.addEventListener("click", function () {
      changePage(-1);
    });
  }

  if (nextPageButton) {
    nextPageButton.addEventListener("click", function () {
      changePage(1);
    });
  }
}

function showError(message) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("error").style.display = "block";
  const errorMessageEl = document.getElementById("error-message");
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
}

// Randomize gradient background
function randomizeGradient() {
  const colors = [
    "rgba(144, 70, 255, 0.8)", // Purple
    "rgba(34, 197, 94, 0.8)", // Green
    "rgba(255, 71, 87, 0.8)", // Red
    "rgba(255, 193, 7, 0.8)", // Yellow
    "rgba(0, 188, 212, 0.8)", // Cyan
    "rgba(156, 39, 176, 0.8)", // Magenta
    "rgba(255, 152, 0, 0.8)", // Orange
    "rgba(76, 175, 80, 0.8)", // Light Green
  ];

  // Generate random positions (10%-90% for both x and y)
  const pos1 = {
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
  };
  const pos2 = {
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
  };

  // Pick random colors
  const color1 = colors[Math.floor(Math.random() * colors.length)];
  const color2 = colors[Math.floor(Math.random() * colors.length)];

  // Create gradient string - make gradients much larger to cover full background
  const gradient = `radial-gradient(2000px 1200px at ${pos1.x}% ${pos1.y}%, ${color1}, transparent), radial-gradient(1500px 1000px at ${pos2.x}% ${pos2.y}%, ${color2}, transparent)`;

  // Apply to body
  document.body.style.background = gradient;
}

let currentView = 0;
const views = ["Equipment", "Achievements", "Skills"];

function changeView(direction) {
  // Cancel any ongoing price loading
  cancelPriceLoading();

  // Reset page when switching views
  achievementsPage = 0;
  skillsPage = 0;

  currentView = (currentView + direction + views.length) % views.length;
  updateView();
}

function changePage(direction) {
  if (currentView === 1) {
    // Achievements
    const totalPages = Math.ceil(
      window.currentProfileData.achievements.length / ITEMS_PER_PAGE
    );
    achievementsPage = (achievementsPage + direction + totalPages) % totalPages;
  } else if (currentView === 2) {
    // Skills
    const totalPages = Math.ceil(
      window.currentProfileData.skills.length / ITEMS_PER_PAGE
    );
    skillsPage = (skillsPage + direction + totalPages) % totalPages;
  }
  updateView();
}

function updateView() {
  const title = document.getElementById("equipment-title");
  const grid = document.getElementById("equipment-grid");
  const pageControls = document.getElementById("page-controls");
  const pageInfo = document.getElementById("page-info");

  title.textContent = views[currentView];

  // Show/hide page controls
  if (currentView === 1 || currentView === 2) {
    pageControls.style.display = "flex";

    // Calculate page info
    const data = window.currentProfileData;
    const items = currentView === 1 ? data.achievements : data.skills;
    const currentPage = currentView === 1 ? achievementsPage : skillsPage;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    if (totalPages > 1) {
      pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    } else {
      pageInfo.textContent = "";
    }
  } else {
    pageControls.style.display = "none";
  }

  // Clear current content
  grid.innerHTML = "";
  grid.className = "equipment-grid"; // Reset classes

  // Render appropriate view
  if (currentView === 0) {
    renderEquipmentGrid(window.currentProfileData);
    // Load equipment prices only when on equipment view
    loadEquipmentPricesAsync(window.currentProfileData);
  } else if (currentView === 1) {
    renderAchievementsGrid(window.currentProfileData);
  } else if (currentView === 2) {
    renderSkillsGrid(window.currentProfileData);
  }
}

function renderEquipmentGrid(data) {
  const grid = document.getElementById("equipment-grid");

  // Track which equipment types we've already rendered to avoid duplicates
  const renderedEquipment = new Set();

  const gridLayout = [
    // Row 0
    {
      area: "Earpiece",
      label: "Earpiece",
      row: 0,
      col: 0,
      slotName: "Earpiece",
    },
    {
      area: "Headwear",
      label: "Headwear",
      row: 0,
      col: 1,
      slotName: "Headwear",
    },
    {
      area: "FaceCover",
      label: "FaceCover",
      row: 0,
      col: 2,
      slotName: "FaceCover",
    },
    {
      area: "TacRig",
      label: "TacRig",
      row: 0,
      col: 3,
      slotName: "TacticalVest",
    },

    // Row 1
    { area: "Armband", label: "Armband", row: 1, col: 0, slotName: "ArmBand" },
    {
      area: "BodyArmor",
      label: "BodyArmor",
      row: 1,
      col: 1,
      slotName: "BodyArmor",
    },
    { area: "Eyewear", label: "Eyewear", row: 1, col: 2, slotName: "Eyewear" },

    // Row 2
    { area: "Holster", label: "Holster", row: 2, col: 0, slotName: "Holster" },
    {
      area: "BodyArmor",
      label: "BodyArmor",
      row: 2,
      col: 1,
      slotName: "BodyArmor",
    }, // Skip - already rendered
    { area: "Sheath", label: "Sheath", row: 2, col: 2, slotName: "Scabbard" },
    {
      area: "Backpack",
      label: "Backpack",
      row: 2,
      col: 3,
      slotName: "Backpack",
    },

    // Row 3
    {
      area: "Primary",
      label: "Primary",
      row: 3,
      col: 0,
      slotName: "FirstPrimaryWeapon",
    },

    // Row 4
    {
      area: "Secondary",
      label: "Secondary",
      row: 4,
      col: 0,
      slotName: "SecondPrimaryWeapon",
    },
  ];

  // Render each unique equipment slot with loading price elements
  gridLayout.forEach((slot) => {
    // Skip if we've already rendered this equipment type
    if (renderedEquipment.has(slot.area)) {
      return;
    }

    const div = document.createElement("div");
    div.className = `slot area-${slot.area}`;
    div.setAttribute("data-slot-name", slot.slotName); // Store slot name for later price updates

    // Add click handler for weapon slots
    if (
      slot.area === "Primary" ||
      slot.area === "Secondary" ||
      slot.area === "Holster"
    ) {
      div.style.cursor = "pointer";
      div.addEventListener("click", function () {
        showGunPartsModal(slot.area);
      });
    }

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = slot.label;
    div.appendChild(label);

    const img = document.createElement("img");
    // Map to returned grid URL
    const url = data.equipmentGrid?.[slot.row]?.[slot.col] || null;
    if (url) {
      // If URL is relative, make it absolute
      const imageUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

      // Get template ID for fallback (for gun/weapon slots)
      const equipmentItems = data.equipmentItems?.[slot.slotName];
      const templateId =
        equipmentItems && equipmentItems.length > 0
          ? equipmentItems[0].tpl
          : null;

      loadImageAsBlob(imageUrl)
        .then((objectURL) => {
          img.src = objectURL;
          img.alt = slot.label;
        })
        .catch(() => {
          // If generated image fails and we have a template ID, try static image fallback
          if (templateId) {
            console.warn(
              `[Equipment Grid] Generated image failed for ${slot.label}, trying static fallback`
            );
            const fallbackUrl = `${API_BASE_URL}/api/item-image/${templateId}`;
            loadImageAsBlob(fallbackUrl)
              .then((objectURL) => {
                img.src = objectURL;
                img.alt = slot.label;
              })
              .catch(() => {
                console.error(
                  `[Equipment Grid] Static fallback also failed for ${slot.label}`
                );
                img.style.display = "none";
              });
          } else {
            img.style.display = "none";
          }
        });
      div.appendChild(img);
      renderedEquipment.add(slot.area); // Mark as rendered

      // Add loading price element
      const priceElement = document.createElement("span");
      priceElement.className = "price loading";
      priceElement.textContent = "...";
      priceElement.setAttribute("data-price-for", slot.slotName);
      div.appendChild(priceElement);
    } else {
      div.classList.add("empty");
    }

    grid.appendChild(div);
  });
}

async function loadEquipmentPricesAsync(data) {
  if (!data.equipmentPrices) return;

  // Cancel if we're not on the equipment view anymore
  if (currentView !== 0) {
    return;
  }

  // Cancel if another price loading is already in progress
  if (priceLoadingInProgress) {
    return;
  }

  priceLoadingInProgress = true;
  currentPriceLoadingView = currentView;

  try {
    // Use pre-calculated prices from server
    const prices = data.equipmentPrices;

    // Only update if we're still on the same view and loading is still in progress
    if (
      currentView === 0 &&
      priceLoadingInProgress &&
      currentPriceLoadingView === currentView
    ) {
      // Update price elements in the DOM
      updatePriceElements(prices);
    }
  } finally {
    priceLoadingInProgress = false;
  }
}

function updatePriceElements(prices) {
  // Find all price elements that are still loading
  const loadingElements = document.querySelectorAll(".price.loading");

  loadingElements.forEach((element) => {
    const slotName = element.getAttribute("data-price-for");
    if (slotName && prices[slotName]) {
      const priceData = prices[slotName];

      if (priceData.banned) {
        element.className = "price banned";
        if (priceData.formattedPrice) {
          element.textContent = priceData.formattedPrice;
        } else {
          element.textContent = "Banned";
        }
      } else if (priceData.formattedPrice) {
        element.className = "price";
        element.textContent = priceData.formattedPrice;
      } else {
        // Remove loading element if no valid data
        element.remove();
      }
    }
  });
}

let achievementsPage = 0;
let skillsPage = 0;
const ITEMS_PER_PAGE = 20;

// Price loading state management
let priceLoadingInProgress = false;
let currentPriceLoadingView = -1;

function cancelPriceLoading() {
  priceLoadingInProgress = false;
  currentPriceLoadingView = -1;
}

function renderAchievementsGrid(data) {
  const grid = document.getElementById("equipment-grid");
  grid.className = "achievements-grid";

  if (!Array.isArray(data.achievements) || data.achievements.length === 0) {
    grid.innerHTML = '<div class="no-data">No achievements found</div>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.achievements.length / ITEMS_PER_PAGE);
  const startIndex = achievementsPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + ITEMS_PER_PAGE,
    data.achievements.length
  );
  const achievementsToShow = data.achievements.slice(startIndex, endIndex);

  // Clear grid
  grid.innerHTML = "";

  // Add achievements
  achievementsToShow.forEach((achievement) => {
    const div = document.createElement("div");
    div.className = "achievement-item";

    const img = document.createElement("img");
    loadImageAsBlob(`${API_BASE_URL}/api/achievement-image/${achievement.id}`)
      .then((objectURL) => {
        img.src = objectURL;
        img.alt = `Achievement ${achievement.id}`;
      })
      .catch(() => {
        img.style.display = "none";
      });

    const name = document.createElement("div");
    name.className = "achievement-name";
    name.textContent = achievement.name;

    // Optional: Add unlock date
    const date = document.createElement("div");
    date.className = "achievement-date";
    date.textContent = new Date(achievement.unlockedAt).toLocaleDateString();

    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(date);
    grid.appendChild(div);
  });

  // Fill empty slots to maintain 4x5 grid
  const emptySlots = ITEMS_PER_PAGE - achievementsToShow.length;
  for (let i = 0; i < emptySlots; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "achievement-item empty-item";
    grid.appendChild(emptyDiv);
  }
}

function renderSkillsGrid(data) {
  const grid = document.getElementById("equipment-grid");
  grid.className = "skills-grid";

  if (!Array.isArray(data.skills) || data.skills.length === 0) {
    grid.innerHTML = '<div class="no-data">No skills found</div>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.skills.length / ITEMS_PER_PAGE);
  const startIndex = skillsPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, data.skills.length);
  const skillsToShow = data.skills.slice(startIndex, endIndex);

  // Clear grid
  grid.innerHTML = "";

  // Add skills
  skillsToShow.forEach((skill) => {
    const div = document.createElement("div");
    div.className = "skill-item";

    const img = document.createElement("img");
    loadImageAsBlob(`${API_BASE_URL}/api/skill-image/${skill.name}`)
      .then((objectURL) => {
        img.src = objectURL;
        img.alt = skill.name || "Skill";
      })
      .catch(() => {
        img.style.display = "none";
      });

    const name = document.createElement("div");
    const nameText = document.createElement("div");
    nameText.className = "skill-name";
    nameText.textContent = skill.name || "Unknown Skill";

    const level = document.createElement("div");
    level.className = "skill-level";
    level.textContent = `Level ${skill.level || 0}`;

    name.appendChild(nameText);
    name.appendChild(level);

    div.appendChild(img);
    div.appendChild(name);
    grid.appendChild(div);
  });

  // Fill empty slots to maintain 4x5 grid
  const emptySlots = ITEMS_PER_PAGE - skillsToShow.length;
  for (let i = 0; i < emptySlots; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "skill-item empty-item";
    grid.appendChild(emptyDiv);
  }
}

// Prefetch prestige icons (level badges are cached on server side)
async function prefetchAssets() {
  const prestigeLevels = [1, 2, 3, 4];

  // Prefetch prestige icons
  for (const prestige of prestigeLevels) {
    try {
      await loadImageAsBlob(`${API_BASE_URL}/api/prestige-icon/${prestige}`);
    } catch (error) {
      console.warn(
        `Failed to prefetch prestige icon for level ${prestige}:`,
        error
      );
    }
  }
}

// Modal functionality for gun parts
async function showGunPartsModal(slotName) {
  const modal = document.getElementById("gun-parts-modal");
  const modalTitle = document.getElementById("modal-title");
  const partsGrid = document.getElementById("gun-parts-grid");

  // Set modal title
  const slotTitles = {
    Primary: "Primary Weapon Parts",
    Secondary: "Secondary Weapon Parts",
    Holster: "Holster Weapon Parts",
  };
  modalTitle.textContent = slotTitles[slotName] || "Gun Parts";

  // Clear previous content
  partsGrid.innerHTML = "";

  // Map slot names to equipment item keys
  const slotMapping = {
    Primary: "FirstPrimaryWeapon",
    Secondary: "SecondPrimaryWeapon",
    Holster: "Holster",
  };
  const equipmentKey = slotMapping[slotName] || slotName;

  // Get equipment items for this slot
  const equipmentItems =
    window.currentProfileData?.equipmentItems?.[equipmentKey];
  if (!equipmentItems || equipmentItems.length === 0) {
    partsGrid.innerHTML =
      '<div style="text-align: center; padding: 40px; color: #666; font-style: italic;">No parts found for this weapon</div>';
    modal.style.display = "flex";
    return;
  }

  // Fetch item names from the price API
  const itemIds = equipmentItems.map((item) => item.tpl);
  let itemNames = {};

  try {
    const response = await fetch(`${API_BASE_URL}/api/item-prices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemIds }),
    });

    if (response.ok) {
      const data = await response.json();
      itemNames = data.prices || {};
    }
  } catch (error) {
    console.warn("Failed to fetch item names:", error);
  }

  // Create part items
  equipmentItems.forEach((item, index) => {
    const itemData = itemNames[item.tpl];
    const displayName = itemData?.name || item.name || item.tpl;

    const partDiv = document.createElement("div");
    partDiv.className = "gun-part-item";

    // Determine part type based on position (first item is usually the main weapon)
    const partType = index === 0 ? "Main Weapon" : "Attachment";

    const img = document.createElement("img");
    loadImageAsBlob(`${API_BASE_URL}/api/item-image/${item.tpl}`)
      .then((objectURL) => {
        img.src = objectURL;
      })
      .catch(() => {
        img.style.display = "none";
      });
    img.alt = displayName;
    img.onerror = () => {
      img.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzNCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=";
    };

    const nameDiv = document.createElement("div");
    nameDiv.className = "gun-part-name";
    nameDiv.textContent = displayName;

    const typeDiv = document.createElement("div");
    typeDiv.className = "gun-part-type";
    typeDiv.textContent = partType;

    partDiv.appendChild(img);
    partDiv.appendChild(nameDiv);
    partDiv.appendChild(typeDiv);
    partsGrid.appendChild(partDiv);
  });

  // Show modal
  modal.style.display = "flex";
}

function hideGunPartsModal() {
  const modal = document.getElementById("gun-parts-modal");
  modal.style.display = "none";
}

// Set up modal event listeners
function setupModalEvents() {
  const modal = document.getElementById("gun-parts-modal");
  const closeButton = document.getElementById("close-modal");

  // Close modal when clicking the X button
  if (closeButton) {
    closeButton.addEventListener("click", hideGunPartsModal);
  }

  // Close modal when clicking outside the content
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        hideGunPartsModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.style.display === "flex") {
      hideGunPartsModal();
    }
  });
}

// Initialize on page load
randomizeGradient();
prefetchAssets();
setupModalEvents();
// Profile loading will be triggered by Twitch Extension authorization
