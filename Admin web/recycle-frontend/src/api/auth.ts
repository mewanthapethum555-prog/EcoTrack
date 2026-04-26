export const register = (user) =>
  fetch(process.env.REACT_APP_API_URL + "auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
