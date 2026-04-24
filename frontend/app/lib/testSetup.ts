/**
 * Test Account Setup Utility
 * Run this function in the browser console to pre-populate test accounts
 *
 * window.setupTestAccounts()
 */

export const setupTestAccounts = () => {
  const testUsers = [
    {
      id: "user_1",
      email: "adrian@jsmastery.pro",
      password: "password123",
      name: "Adrian Hajdin",
    },
    {
      id: "user_2",
      email: "test@example.com",
      password: "123456",
      name: "Test User",
    },
    {
      id: "user_3",
      email: "demo@example.com",
      password: "demo1234",
      name: "Demo User",
    },
  ];

  localStorage.setItem("users", JSON.stringify(testUsers));
  console.log("Test accounts setup completed.");
  console.log("\nAvailable test accounts:");
  testUsers.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
  });
};

/**
 * Clear all auth data
 * window.clearAuthData()
 */
export const clearAuthData = () => {
  localStorage.removeItem("users");
  localStorage.removeItem("authUser");
  console.log("All auth data cleared.");
  window.location.reload();
};

/**
 * View current logged-in user
 * window.viewCurrentUser()
 */
export const viewCurrentUser = () => {
  const user = localStorage.getItem("authUser");
  if (user) {
    console.log("Currently logged in as:");
    console.log(JSON.parse(user));
  } else {
    console.log("No user logged in");
  }
};

/**
 * View all registered users
 * window.viewAllUsers()
 */
export const viewAllUsers = () => {
  const users = localStorage.getItem("users");
  if (users) {
    console.log("Registered users:");
    console.log(JSON.parse(users));
  } else {
    console.log("No registered users found");
  }
};

if (typeof window !== "undefined") {
  (window as Window & {
    setupTestAccounts?: typeof setupTestAccounts;
    clearAuthData?: typeof clearAuthData;
    viewCurrentUser?: typeof viewCurrentUser;
    viewAllUsers?: typeof viewAllUsers;
  }).setupTestAccounts = setupTestAccounts;
  (window as Window & {
    setupTestAccounts?: typeof setupTestAccounts;
    clearAuthData?: typeof clearAuthData;
    viewCurrentUser?: typeof viewCurrentUser;
    viewAllUsers?: typeof viewAllUsers;
  }).clearAuthData = clearAuthData;
  (window as Window & {
    setupTestAccounts?: typeof setupTestAccounts;
    clearAuthData?: typeof clearAuthData;
    viewCurrentUser?: typeof viewCurrentUser;
    viewAllUsers?: typeof viewAllUsers;
  }).viewCurrentUser = viewCurrentUser;
  (window as Window & {
    setupTestAccounts?: typeof setupTestAccounts;
    clearAuthData?: typeof clearAuthData;
    viewCurrentUser?: typeof viewCurrentUser;
    viewAllUsers?: typeof viewAllUsers;
  }).viewAllUsers = viewAllUsers;
}
