const KEY = "ns-login-return-admin";

export function setLoginReturnAdmin() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    void 0;
  }
}

export function wantsLoginReturnAdmin(searchParams: URLSearchParams) {
  if (searchParams.get("return") === "admin") return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLoginReturnAdmin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    void 0;
  }
}
