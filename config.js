const twitch = window.Twitch.ext;
let authData = null;

function showStatus(message, type = "info") {
  const statusEl = document.getElementById("status-message");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = type;
  }
}

twitch.onAuthorized((auth) => {
  authData = auth;

  if (!auth || !auth.token) {
    return;
  }

  loadExistingConfig();
});

function loadExistingConfig() {
  if (!authData || !authData.token) {
    return;
  }

  // Extension is hosted on Twitch, must use absolute URL to call external server
  fetch("https://bot.tarkov-changes.com/api/config/aid", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + authData.token,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        if (data.aid) {
          document.getElementById("aid").value = data.aid;
        }
        if (data.hide_name !== undefined) {
          document.getElementById("hide-name").checked = data.hide_name;
        }
      }
    })
    .catch((error) => {
      console.error(`Error loading config: ${error.message}`);
    });
}

function saveConfig() {
  const aid = document.getElementById("aid").value.trim();
  const hideName = document.getElementById("hide-name").checked;

  if (!aid) {
    showStatus("Player AID is required", "error");
    return;
  }

  if (!authData || !authData.token) {
    return;
  }

  // Disable the save button during the request
  const saveButton = document.getElementById("save-button");
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  const requestPayload = { aid: aid, hide_name: hideName };

  // Extension is hosted on Twitch, must use absolute URL to call external server
  fetch("https://bot.tarkov-changes.com/api/config/aid", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + authData.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        showStatus("Configuration saved successfully!", "success");
      } else {
        const errorMsg = data.error || "Unknown error occurred";
        showStatus(`Save failed: ${errorMsg}`, "error");
      }
    })
    .catch((error) => {
      showStatus(`Error saving configuration: ${error.message}`, "error");
    })
    .finally(() => {
      // Re-enable the save button
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Configuration";
      }
    });
}

// Expose functions globally for HTML onclick handlers
window.saveConfig = saveConfig;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add event listeners for buttons
  const saveButton = document.getElementById("save-button");
  if (saveButton) {
    saveButton.addEventListener("click", function () {
      saveConfig();
    });
  }
});
