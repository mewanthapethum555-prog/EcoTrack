
// Mocking the behavior of settingsService.ts to test merging logic locally.

const DEFAULTS = {
  organization: {
    name: "Eco Track Solutions",
    contactEmail: "admin@ecotrack.com",
    address: "123 Green Street, Eco City, EC 12345",
  },
  regional: {
    timezone: "Asia/Colombo",
    language: "en",
  },
  notifications: { email: true, sms: false, push: true },
};

function loadSettings(dbData) {
  if (!dbData) return { ...DEFAULTS };
  const data = dbData;
  return {
    organization: { ...DEFAULTS.organization, ...(data.organization || {}) },
    regional: { ...DEFAULTS.regional, ...(data.regional || {}) },
    notifications: { ...DEFAULTS.notifications, ...(data.notifications || {}) },
  };
}

function mergeSettings(current, partial) {
  return {
    organization: { ...current.organization, ...partial.organization },
    regional: { ...current.regional, ...partial.regional },
    notifications: { ...current.notifications, ...partial.notifications },
  };
}

// Test Case 1: Load from empty DB
console.log("Test Case 1: Load from empty DB");
const current1 = loadSettings(null);
console.log("Loaded:", current1.organization.name === "Eco Track Solutions" ? "PASS" : "FAIL");

// Test Case 2: Save partial update
console.log("\nTest Case 2: Save partial update (org name)");
const partial2 = { organization: { name: "New Name", contactEmail: "new@email.com", address: "New Address" } };
const merged2 = mergeSettings(current1, partial2);
console.log("Merged Name:", merged2.organization.name === "New Name" ? "PASS" : "FAIL");
console.log("Kept Timezone:", merged2.regional.timezone === "Asia/Colombo" ? "PASS" : "FAIL");

// Test Case 3: Load from DB with data
console.log("\nTest Case 3: Load from DB with partial data");
const dbData3 = { organization: { name: "DB Name" } };
const current3 = loadSettings(dbData3);
console.log("Loaded DB Name:", current3.organization.name === "DB Name" ? "PASS" : "FAIL");
console.log("Default Email kept:", current3.organization.contactEmail === "admin@ecotrack.com" ? "PASS" : "FAIL");
